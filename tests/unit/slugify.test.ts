import { describe, expect, it } from "vitest";
import { getExportFilename, slugify } from "../../src/utils/slugify.ts";

describe("slugify", () => {
  it('converts "My Project" to "my-project"', () => {
    expect(slugify("My Project")).toBe("my-project");
  });

  it('collapses multiple separators in "hello   world"', () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it('strips leading and trailing hyphens from "---test---"', () => {
    expect(slugify("---test---")).toBe("test");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("returns empty string for string with only special characters", () => {
    expect(slugify("!!!@@@")).toBe("");
  });
});

describe("getExportFilename", () => {
  it('returns "my-project.cib.json" for "My Project"', () => {
    expect(getExportFilename("My Project")).toBe("my-project.cib.json");
  });

  it('returns "untitled.cib.json" for empty string', () => {
    expect(getExportFilename("")).toBe("untitled.cib.json");
  });

  it('returns "test-server.cib.json" for "Test Server"', () => {
    expect(getExportFilename("Test Server")).toBe("test-server.cib.json");
  });
});
