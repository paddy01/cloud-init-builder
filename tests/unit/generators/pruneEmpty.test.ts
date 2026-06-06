import { describe, expect, it } from "vitest";
import { pruneEmpty } from "../../../src/generators/pruneEmpty.ts";

describe("pruneEmpty", () => {
  it("returns undefined for undefined", () => {
    expect(pruneEmpty(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(pruneEmpty(null)).toBeUndefined();
  });

  it('returns undefined for empty string ""', () => {
    expect(pruneEmpty("")).toBeUndefined();
  });

  it("preserves false (Pitfall 1 regression guard)", () => {
    expect(pruneEmpty(false)).toBe(false);
  });

  it("preserves zero", () => {
    expect(pruneEmpty(0)).toBe(0);
  });

  it("returns undefined for empty object {}", () => {
    expect(pruneEmpty({})).toBeUndefined();
  });

  it("returns undefined for empty array []", () => {
    expect(pruneEmpty([])).toBeUndefined();
  });

  it("prunes empty string values from objects", () => {
    expect(pruneEmpty({ hostname: "web01", fqdn: "" })).toEqual({
      hostname: "web01",
    });
  });

  it("prunes null values from objects", () => {
    expect(pruneEmpty({ hostname: "web01", timezone: null })).toEqual({
      hostname: "web01",
    });
  });

  it("returns undefined when all object values are pruned", () => {
    expect(pruneEmpty({ hostname: "", fqdn: null })).toBeUndefined();
  });

  it("preserves false inside objects", () => {
    expect(pruneEmpty({ manage_etc_hosts: false })).toEqual({
      manage_etc_hosts: false,
    });
  });

  it("prunes empty elements from arrays", () => {
    expect(pruneEmpty(["a", "", null, undefined])).toEqual(["a"]);
  });

  it("returns undefined when all array elements are pruned", () => {
    expect(pruneEmpty(["", null])).toBeUndefined();
  });

  it("recursively prunes nested objects", () => {
    expect(
      pruneEmpty({
        hostname: "web01",
        nested: { empty: "", keep: "value" },
      }),
    ).toEqual({
      hostname: "web01",
      nested: { keep: "value" },
    });
  });

  it("returns undefined when nested object becomes empty", () => {
    expect(pruneEmpty({ outer: { inner: "" } })).toBeUndefined();
  });
});
