// @ts-expect-error Vitest executes this source-inspection test in Node.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const fixture = (name: string) => `tests/fixtures/semantic-migration-audit/${name}.tsx`;

/**
 * RED: Task 1 will replace this placeholder with a deliberately bounded
 * TypeScript AST scanner. The fixture makes the first commit execute the
 * demanded negative path rather than claiming an unimplemented audit passed.
 */
async function inspectFixture(_path: string): Promise<never[]> {
  return [];
}

describe("semantic migration audit (RED)", () => {
  it("reports a legacy palette utility with source coordinates", async () => {
    const source = await readFile(fixture("legacy-palette"), "utf8");
    expect(source).toContain("bg-slate-100");

    const findings = await inspectFixture(fixture("legacy-palette"));
    expect(findings).toContainEqual(expect.objectContaining({
      kind: "palette",
      property: "className",
      value: "bg-slate-100",
    }));
  });
});
