import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import futureProjectV99 from "../fixtures/future-project-v99.cib.json?raw";
import invalidProjectBadMetadata from "../fixtures/invalid-project-bad-metadata.cib.json?raw";
import validProjectV1 from "../fixtures/valid-project-v1.cib.json?raw";
import validProjectWithExtras from "../fixtures/valid-project-with-extras.cib.json?raw";
import {
  exportProject,
  importProject,
  MAX_FILE_SIZE,
} from "../../src/services/projectService.ts";
import { isUsersConfig } from "../../src/models/users.ts";
import { getExportFilename } from "../../src/utils/slugify.ts";

function fixtureFile(content: string, name: string): File {
  return new File([content], name, { type: "application/json" });
}

describe("importProject", () => {
  it("imports valid-project-v1 with correct metadata and no warnings", async () => {
    const result = await importProject(
      fixtureFile(validProjectV1, "valid-project-v1.cib.json"),
    );

    expect(result.warnings).toEqual([]);
    expect(result.project.metadata.name).toBe("Test Server Template");
    expect(result.project.metadata.createdAt).toBe("2026-06-01T10:00:00.000Z");
    expect(result.project.metadata.updatedAt).toBe("2026-06-01T12:30:00.000Z");
    expect(result.project.metadata.appVersion).toBe("0.1.0");
  });

  it("imports invalid-project-bad-metadata with warnings and fallback project per D-04", async () => {
    const result = await importProject(
      fixtureFile(
        invalidProjectBadMetadata,
        "invalid-project-bad-metadata.cib.json",
      ),
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.project.metadata.name).toBe("Incomplete Project");
    expect(result.project.metadata.appVersion).toBe("0.1.0");
  });

  it("preserves identity and users from lenient fallback when metadata is partially invalid per D-11 (CR-01)", async () => {
    const result = await importProject(
      fixtureFile(
        invalidProjectBadMetadata,
        "invalid-project-bad-metadata.cib.json",
      ),
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.project.identity).toEqual({
      hostname: "incomplete-host",
      fqdn: "incomplete-host.example.com",
    });
    expect(isUsersConfig(result.project.users)).toBe(true);
    if (!isUsersConfig(result.project.users)) {
      throw new Error("expected canonical users");
    }
    expect(result.project.users.preserveDefault).toBe(false);
    expect(result.project.users.entries).toHaveLength(1);
    expect(result.project.users.entries[0]).toMatchObject({
      name: "admin",
      sudo: true,
      shell: "/bin/bash",
    });
    expect(result.project.metadata.name).toBe("Incomplete Project");
    expect(result.project.metadata.appVersion).toBe("0.1.0");
    expect(result.project.formatVersion).toBe(1);
  });

  it("rejects future-project-v99 with a version error per D-05", async () => {
    await expect(
      importProject(fixtureFile(futureProjectV99, "future-project-v99.cib.json")),
    ).rejects.toThrow(/format version 99.*supports up to/i);
  });

  it("preserves identity and users keys from valid-project-with-extras per D-11", async () => {
    const result = await importProject(
      fixtureFile(
        validProjectWithExtras,
        "valid-project-with-extras.cib.json",
      ),
    );

    expect(result.project.identity).toEqual({
      hostname: "web-server",
      fqdn: "web-server.example.com",
    });
    expect(isUsersConfig(result.project.users)).toBe(true);
    if (!isUsersConfig(result.project.users)) {
      throw new Error("expected canonical users");
    }
    expect(result.project.users.preserveDefault).toBe(false);
    expect(result.project.users.entries).toHaveLength(1);
    expect(result.project.users.entries[0]).toMatchObject({
      name: "deploy",
      sudo: true,
      shell: "/bin/bash",
    });
  });

  it("normalizes absent users to default config", async () => {
    const withoutUsers = JSON.stringify({
      formatVersion: 1,
      metadata: {
        name: "No Users",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.1.0",
      },
    });

    const result = await importProject(
      fixtureFile(withoutUsers, "no-users.cib.json"),
    );

    expect(result.warnings).toEqual([]);
    expect(result.project.users).toEqual({
      preserveDefault: true,
      entries: [],
    });
  });

  it("normalizes legacy arrays with default sentinel", async () => {
    const legacy = JSON.stringify({
      formatVersion: 1,
      metadata: {
        name: "Legacy",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.1.0",
      },
      users: ["default", { name: "ops", sudo: true }],
    });

    const result = await importProject(
      fixtureFile(legacy, "legacy-default.cib.json"),
    );

    expect(isUsersConfig(result.project.users)).toBe(true);
    if (!isUsersConfig(result.project.users)) {
      throw new Error("expected canonical users");
    }
    expect(result.project.users.preserveDefault).toBe(true);
    expect(result.project.users.entries).toHaveLength(1);
    expect(result.project.users.entries[0]).toMatchObject({
      name: "ops",
      sudo: true,
    });
  });

  it("replaces invalid users shapes with defaults and a warning", async () => {
    const invalidUsers = JSON.stringify({
      formatVersion: 1,
      metadata: {
        name: "Bad Users",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.1.0",
      },
      users: { broken: true },
    });

    const result = await importProject(
      fixtureFile(invalidUsers, "invalid-users.cib.json"),
    );

    expect(result.project.users).toEqual({
      preserveDefault: true,
      entries: [],
    });
    expect(result.warnings.some((warning) => warning.path === "users")).toBe(
      true,
    );
  });

  it("rejects files exceeding MAX_FILE_SIZE", async () => {
    const oversized = new File(
      [new Uint8Array(MAX_FILE_SIZE + 1)],
      "huge.cib.json",
      { type: "application/json" },
    );

    await expect(importProject(oversized)).rejects.toThrow(/too large/i);
  });

  it("rejects invalid JSON", async () => {
    const badJson = new File(["{ not valid json"], "bad.cib.json", {
      type: "application/json",
    });

    await expect(importProject(badJson)).rejects.toThrow(
      /Failed to parse project file as JSON/i,
    );
  });
});

describe("exportProject", () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:mock-url");
  const revokeObjectURL = vi.fn();
  const click = vi.fn();
  let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    anchor = { href: "", download: "", click };

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return anchor as unknown as HTMLAnchorElement;
      }

      return document.createElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node as Node,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node as Node,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    click.mockClear();
  });

  it("creates an application/json Blob and triggers download", () => {
    const project = {
      formatVersion: 1,
      metadata: {
        name: "My Project",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.1.0",
      },
    };

    const dispatched = exportProject(project, "My Project");

    expect(dispatched).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    const [blobArg] = createObjectURL.mock.calls[0] ?? [];
    expect(blobArg).toBeInstanceOf(Blob);
    if (blobArg instanceof Blob) {
      expect(blobArg.type).toBe("application/json");
    }
    expect(anchor.download).toBe(getExportFilename("My Project"));
    expect(document.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(document.body.removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("returns false when document.body.appendChild throws", () => {
    const project = {
      formatVersion: 1,
      metadata: {
        name: "x",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.1.0",
      },
    };

    vi.spyOn(document.body, "appendChild").mockImplementation(() => {
      throw new Error("DOM detached");
    });

    expect(exportProject(project, "x")).toBe(false);
    expect(anchor.click).not.toHaveBeenCalled();
  });
});
