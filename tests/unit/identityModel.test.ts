import { describe, expect, it } from "vitest";
import validProjectIdentityFull from "../fixtures/valid-project-identity-full.cib.json?raw";
import { identitySchema } from "../../src/models/identity.ts";
import { projectFileSchema } from "../../src/models/project.ts";

describe("identitySchema", () => {
  it("parses an empty object successfully", () => {
    const result = identitySchema.parse({});

    expect(result).toEqual({});
  });

  it("preserves manage_etc_hosts true", () => {
    const result = identitySchema.parse({ manage_etc_hosts: true });

    expect(result.manage_etc_hosts).toBe(true);
  });

  it('preserves manage_etc_hosts "localhost" literal', () => {
    const result = identitySchema.parse({ manage_etc_hosts: "localhost" });

    expect(result.manage_etc_hosts).toBe("localhost");
  });

  it('rejects deprecated manage_etc_hosts "template" literal', () => {
    const result = identitySchema.safeParse({ manage_etc_hosts: "template" });

    expect(result.success).toBe(false);
  });
});

describe("projectFileSchema with identity", () => {
  it("round-trips every advanced identity field from valid-project-identity-full fixture", () => {
    const data = JSON.parse(validProjectIdentityFull);
    const result = projectFileSchema.parse(data);

    expect(result.identity).toEqual({
      hostname: "web01",
      fqdn: "web01.lan.example.com",
      prefer_fqdn_over_hostname: true,
      manage_etc_hosts: "localhost",
      timezone: "Europe/Stockholm",
      locale: "en_US.UTF-8",
    });
  });
});
