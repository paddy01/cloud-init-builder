import { describe, expect, it } from "vitest";
import { writeYaml } from "../../../src/generators/yamlWriter.ts";

describe("writeYaml", () => {
  it('emits hostname as "hostname: web01\\n"', () => {
    expect(writeYaml({ hostname: "web01" })).toBe("hostname: web01\n");
  });

  it('emits unquoted localhost for manage_etc_hosts (Pitfall 5)', () => {
    expect(writeYaml({ manage_etc_hosts: "localhost" })).toBe(
      "manage_etc_hosts: localhost\n",
    );
  });

  it("preserves false boolean literal", () => {
    expect(writeYaml({ manage_etc_hosts: false })).toBe(
      "manage_etc_hosts: false\n",
    );
  });

  it('emits empty object as "{}" with trailing newline', () => {
    expect(writeYaml({})).toBe("{}\n");
  });

  it("does not emit --- document marker (Pitfall 2)", () => {
    const output = writeYaml({ hostname: "web01" });
    expect(output.startsWith("---")).toBe(false);
  });
});
