import { describe, expect, it } from "vitest";
import { isValidFqdn, isValidHostname } from "../../../src/validators/hostname.ts";

describe("isValidHostname", () => {
  it('accepts "web01"', () => {
    expect(isValidHostname("web01")).toBe(true);
  });

  it('accepts "WEB01" (uppercase OK)', () => {
    expect(isValidHostname("WEB01")).toBe(true);
  });

  it('accepts "web-01"', () => {
    expect(isValidHostname("web-01")).toBe(true);
  });

  it('rejects "-bad" (leading hyphen)', () => {
    expect(isValidHostname("-bad")).toBe(false);
  });

  it('rejects "bad-" (trailing hyphen)', () => {
    expect(isValidHostname("bad-")).toBe(false);
  });

  it('rejects "under_score" (underscore)', () => {
    expect(isValidHostname("under_score")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidHostname("")).toBe(false);
  });

  it('accepts 63-char label "aaa...aaa"', () => {
    expect(isValidHostname("a".repeat(63))).toBe(true);
  });

  it('rejects 64-char label "aaa...aaa"', () => {
    expect(isValidHostname("a".repeat(64))).toBe(false);
  });
});

describe("isValidFqdn", () => {
  it('accepts "web01.lan.example.com"', () => {
    expect(isValidFqdn("web01.lan.example.com")).toBe(true);
  });

  it('accepts "web01.example.com"', () => {
    expect(isValidFqdn("web01.example.com")).toBe(true);
  });

  it('rejects "web01." (trailing dot)', () => {
    expect(isValidFqdn("web01.")).toBe(false);
  });

  it('rejects "web01" (single label / no dot)', () => {
    expect(isValidFqdn("web01")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidFqdn("")).toBe(false);
  });

  it('rejects "web01.bad-.example.com" (invalid label)', () => {
    expect(isValidFqdn("web01.bad-.example.com")).toBe(false);
  });

  it("rejects FQDN longer than 253 chars", () => {
    const longFqdn = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}`;
    expect(longFqdn.length).toBeGreaterThan(253);
    expect(isValidFqdn(longFqdn)).toBe(false);
  });
});
