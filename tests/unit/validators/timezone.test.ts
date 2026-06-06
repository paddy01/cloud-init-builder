import { describe, expect, it } from "vitest";
import { isValidTimezone } from "../../../src/validators/timezone.ts";

describe("isValidTimezone", () => {
  it('accepts "Europe/Stockholm"', () => {
    expect(isValidTimezone("Europe/Stockholm")).toBe(true);
  });

  it('accepts "America/New_York"', () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
  });

  it('accepts "UTC" (single segment)', () => {
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it('rejects "Mars/Olympus" (unknown timezone)', () => {
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
  });

  it('rejects "not_a_tz" (lowercase start)', () => {
    expect(isValidTimezone("not_a_tz")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidTimezone("")).toBe(false);
  });

  it('rejects "Europe/stockholm" (lowercase city after /)', () => {
    expect(isValidTimezone("Europe/stockholm")).toBe(false);
  });
});
