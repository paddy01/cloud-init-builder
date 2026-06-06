import { describe, expect, it } from "vitest";
import futureProjectV99 from "../fixtures/future-project-v99.cib.json?raw";
import invalidProjectBadMetadata from "../fixtures/invalid-project-bad-metadata.cib.json?raw";
import validProjectWithExtras from "../fixtures/valid-project-with-extras.cib.json?raw";
import {
  CURRENT_FORMAT_VERSION,
  createDefaultProject,
} from "../../src/models/project.ts";
import { importProject } from "../../src/services/projectService.ts";

function fileFromJson(json: string, name = "roundtrip.cib.json"): File {
  return new File([json], name, { type: "application/json" });
}

describe("lossless round-trip", () => {
  it("preserves metadata across export and import", async () => {
    const project = createDefaultProject("Roundtrip Test");
    const json = JSON.stringify(project, null, 2);
    const result = await importProject(fileFromJson(json));

    expect(result.project.formatVersion).toBe(project.formatVersion);
    expect(result.project.metadata.name).toBe(project.metadata.name);
    expect(result.project.metadata.createdAt).toBe(project.metadata.createdAt);
    expect(result.project.metadata.updatedAt).toBe(project.metadata.updatedAt);
    expect(result.project.metadata.appVersion).toBe(project.metadata.appVersion);
  });
});

describe("lossless pass-through of unknown keys", () => {
  it("preserves identity and users across single and double round-trip per D-11", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectWithExtras,
        "valid-project-with-extras.cib.json",
      ),
    );

    expect(firstImport.project.identity).toEqual({
      hostname: "web-server",
      fqdn: "web-server.example.com",
    });
    expect(firstImport.project.users).toEqual([{ name: "deploy", sudo: true }]);

    const exported = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported));

    expect(secondImport.project.identity).toEqual({
      hostname: "web-server",
      fqdn: "web-server.example.com",
    });
    expect(secondImport.project.users).toEqual([{ name: "deploy", sudo: true }]);
  });

  it("preserves identity and users through the lenient fallback path per D-11", async () => {
    const result = await importProject(
      fileFromJson(
        invalidProjectBadMetadata,
        "invalid-project-bad-metadata.cib.json",
      ),
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.project.identity).toEqual({
      hostname: "incomplete-host",
      fqdn: "incomplete-host.example.com",
    });
    expect(result.project.users).toEqual([{ name: "admin", sudo: true }]);
  });
});

describe("version handling integration", () => {
  it("imports a project saved with formatVersion 1", async () => {
    const project = createDefaultProject("Version One");
    const result = await importProject(
      fileFromJson(JSON.stringify(project, null, 2)),
    );

    expect(result.project.formatVersion).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it("migrates formatVersion 0 to CURRENT_FORMAT_VERSION", async () => {
    const legacy = {
      formatVersion: 0,
      metadata: {
        name: "Legacy Project",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.0.1",
      },
    };

    const result = await importProject(
      fileFromJson(JSON.stringify(legacy, null, 2), "legacy.cib.json"),
    );

    expect(result.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(result.project.metadata.name).toBe("Legacy Project");
  });

  it("rejects formatVersion 99", async () => {
    await expect(
      importProject(
        fileFromJson(futureProjectV99, "future-project-v99.cib.json"),
      ),
    ).rejects.toThrow(/format version 99.*supports up to/i);
  });
});
