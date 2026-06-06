import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectFile } from "../../../src/models/project.ts";
import {
  copyCloudInitYaml,
  exportCloudInitYaml,
} from "../../../src/services/yamlService.ts";
import * as validateConfig from "../../../src/validators/validateConfig.ts";

const baseMetadata = {
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
  appVersion: "0.1.0",
};

function validProject(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return {
    formatVersion: 1,
    metadata: { name: "Test Server Template", ...baseMetadata },
    identity: { hostname: "web01" },
    ...overrides,
  };
}

describe("exportCloudInitYaml", () => {
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

  it("creates a text/yaml Blob and triggers download for a valid project", () => {
    const dispatched = exportCloudInitYaml(validProject());

    expect(dispatched).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    const [blobArg] = createObjectURL.mock.calls[0] ?? [];
    expect(blobArg).toBeInstanceOf(Blob);
    if (blobArg instanceof Blob) {
      expect(blobArg.type).toBe("text/yaml;charset=utf-8");
    }
    expect(anchor.click).toHaveBeenCalledOnce();
  });

  it("uses hostname slug for download filename when hostname is set", () => {
    exportCloudInitYaml(validProject({ identity: { hostname: "web01" } }));
    expect(anchor.download).toBe("web01.yaml");
  });

  it("falls back to project-name slug when hostname is empty", () => {
    vi.spyOn(validateConfig, "validateIdentity").mockReturnValue([]);

    exportCloudInitYaml(
      validProject({
        metadata: { name: "My Server Template", ...baseMetadata },
        identity: undefined,
      }),
    );

    expect(anchor.download).toBe("my-server-template.yaml");
  });

  it("defers URL.revokeObjectURL until after the click microtask", () => {
    exportCloudInitYaml(validProject());

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("returns false without creating a Blob when validation fails", () => {
    const project = validProject({ identity: undefined });

    expect(exportCloudInitYaml(project)).toBe(false);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(anchor.click).not.toHaveBeenCalled();
  });

  it("returns false when document.body.appendChild throws", () => {
    vi.spyOn(document.body, "appendChild").mockImplementation(() => {
      throw new Error("DOM detached");
    });

    expect(exportCloudInitYaml(validProject())).toBe(false);
    expect(anchor.click).not.toHaveBeenCalled();
  });
});

describe("copyCloudInitYaml", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });
    writeText.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes YAML starting with #cloud-config to the clipboard", async () => {
    const success = await copyCloudInitYaml(validProject());

    expect(success).toBe(true);
    expect(writeText).toHaveBeenCalledOnce();
    const [text] = writeText.mock.calls[0] ?? [];
    expect(text).toMatch(/^#cloud-config\n/);
  });

  it("returns false when clipboard write fails", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));

    const success = await copyCloudInitYaml(validProject());
    expect(success).toBe(false);
  });
});
