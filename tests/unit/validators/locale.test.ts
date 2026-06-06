import { describe, expect, it } from "vitest";
import { isValidLocale } from "../../../src/validators/locale.ts";

describe("isValidLocale", () => {
  it('accepts "en_US.UTF-8"', () => {
    expect(isValidLocale("en_US.UTF-8")).toBe(true);
  });

  it('accepts "ar_AE"', () => {
    expect(isValidLocale("ar_AE")).toBe(true);
  });

  it('accepts "sv_SE.UTF-8"', () => {
    expect(isValidLocale("sv_SE.UTF-8")).toBe(true);
  });

  it('accepts "en_US.UTF-8@euro" (modifier)', () => {
    expect(isValidLocale("en_US.UTF-8@euro")).toBe(true);
  });

  it('accepts "en" (language only)', () => {
    expect(isValidLocale("en")).toBe(true);
  });

  it('rejects "EN_us" (territory must be uppercase)', () => {
    expect(isValidLocale("EN_us")).toBe(false);
  });

  it('rejects "invalid locale" (whitespace)', () => {
    expect(isValidLocale("invalid locale")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidLocale("")).toBe(false);
  });
});
