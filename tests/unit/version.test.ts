import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { APP_VERSION } from "../../src/utils/version.ts";

describe("APP_VERSION", () => {
  it("matches the version field in package.json", () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  it("is a non-empty semver-like string", () => {
    expect(typeof APP_VERSION).toBe("string");
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
