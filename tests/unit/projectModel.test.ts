import { describe, expect, it } from "vitest";
import validProjectV1 from "../fixtures/valid-project-v1.cib.json?raw";
import validProjectWithExtras from "../fixtures/valid-project-with-extras.cib.json?raw";
import { APP_VERSION } from "../../src/utils/version.ts";
import {
  CURRENT_FORMAT_VERSION,
  createDefaultProject,
  projectFileSchema,
} from "../../src/models/project.ts";

describe("projectFileSchema", () => {
  it("parses valid-project-v1 fixture with correct formatVersion and metadata", () => {
    const data = JSON.parse(validProjectV1);
    const result = projectFileSchema.parse(data);

    expect(result.formatVersion).toBe(1);
    expect(result.metadata.name).toBe("Test Server Template");
    expect(result.metadata.createdAt).toBe("2026-06-01T10:00:00.000Z");
    expect(result.metadata.updatedAt).toBe("2026-06-01T12:30:00.000Z");
    expect(result.metadata.appVersion).toBe("0.1.0");
  });

  it("preserves unknown top-level keys from valid-project-with-extras fixture", () => {
    const data = JSON.parse(validProjectWithExtras);
    const result = projectFileSchema.parse(data);

    expect(result.identity).toEqual({
      hostname: "web-server",
      fqdn: "web-server.example.com",
    });
    expect(result.users).toEqual([{ name: "deploy", sudo: true }]);
  });

  it("returns success false when formatVersion is missing", () => {
    const result = projectFileSchema.safeParse({ metadata: { name: "x" } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("returns success false when input is a string", () => {
    const result = projectFileSchema.safeParse("not an object");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("CURRENT_FORMAT_VERSION", () => {
  it("equals 1", () => {
    expect(CURRENT_FORMAT_VERSION).toBe(1);
  });
});

describe("createDefaultProject", () => {
  it("returns a ProjectFile with correct defaults for My Server", () => {
    const project = createDefaultProject("My Server");

    expect(project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(project.metadata.name).toBe("My Server");
    expect(project.metadata.appVersion).toBe(APP_VERSION);
    expect(() => new Date(project.metadata.createdAt)).not.toThrow();
    expect(() => new Date(project.metadata.updatedAt)).not.toThrow();
    expect(new Date(project.metadata.createdAt).toISOString()).toBe(
      project.metadata.createdAt,
    );
    expect(new Date(project.metadata.updatedAt).toISOString()).toBe(
      project.metadata.updatedAt,
    );
  });
});
