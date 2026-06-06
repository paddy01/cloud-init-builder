import { describe, expect, it } from "vitest";
import { validateIdentity } from "../../../src/validators/validateConfig.ts";

const HOSTNAME_REQUIRED = {
  path: "identity.hostname",
  code: "HOSTNAME_REQUIRED",
  message: "Hostname is required to export YAML.",
  severity: "error" as const,
};

const HOSTNAME_INVALID = {
  path: "identity.hostname",
  code: "HOSTNAME_INVALID",
  message:
    "Hostname must be 1–63 chars, alphanumeric or hyphen, not starting/ending with a hyphen.",
  severity: "error" as const,
};

const FQDN_INVALID = {
  path: "identity.fqdn",
  code: "FQDN_INVALID",
  message: "FQDN must be a valid dotted name (≤253 chars, no trailing dot).",
  severity: "error" as const,
};

const TIMEZONE_INVALID = {
  path: "identity.timezone",
  code: "TIMEZONE_INVALID",
  message: "Timezone must be a valid IANA name (e.g. Europe/Stockholm).",
  severity: "error" as const,
};

const LOCALE_INVALID = {
  path: "identity.locale",
  code: "LOCALE_INVALID",
  message:
    "Locale must follow language[_TERRITORY][.codeset] (e.g. en_US.UTF-8).",
  severity: "error" as const,
};

describe("validateIdentity", () => {
  it("returns HOSTNAME_REQUIRED for undefined identity", () => {
    expect(validateIdentity(undefined)).toEqual([HOSTNAME_REQUIRED]);
  });

  it("returns HOSTNAME_REQUIRED for empty object", () => {
    expect(validateIdentity({})).toEqual([HOSTNAME_REQUIRED]);
  });

  it('returns HOSTNAME_REQUIRED for empty hostname ""', () => {
    expect(validateIdentity({ hostname: "" })).toEqual([HOSTNAME_REQUIRED]);
  });

  it('returns HOSTNAME_INVALID for hostname "-bad"', () => {
    expect(validateIdentity({ hostname: "-bad" })).toEqual([HOSTNAME_INVALID]);
  });

  it('returns no issues for valid hostname "web01" only', () => {
    expect(validateIdentity({ hostname: "web01" })).toEqual([]);
  });

  it('returns no issues when fqdn is empty string ""', () => {
    expect(validateIdentity({ hostname: "web01", fqdn: "" })).toEqual([]);
  });

  it('returns FQDN_INVALID for trailing dot "web01."', () => {
    expect(validateIdentity({ hostname: "web01", fqdn: "web01." })).toEqual([
      FQDN_INVALID,
    ]);
  });

  it('returns TIMEZONE_INVALID for "Mars/Olympus"', () => {
    expect(
      validateIdentity({ hostname: "web01", timezone: "Mars/Olympus" }),
    ).toEqual([TIMEZONE_INVALID]);
  });

  it('returns LOCALE_INVALID for "invalid locale"', () => {
    expect(
      validateIdentity({ hostname: "web01", locale: "invalid locale" }),
    ).toEqual([LOCALE_INVALID]);
  });

  it("returns four issues when all optional fields are invalid", () => {
    const issues = validateIdentity({
      hostname: "-bad",
      fqdn: "web01.",
      timezone: "Mars/Olympus",
      locale: "invalid locale",
    });

    expect(issues).toHaveLength(4);
    expect(issues.map((issue) => issue.code)).toEqual([
      "HOSTNAME_INVALID",
      "FQDN_INVALID",
      "TIMEZONE_INVALID",
      "LOCALE_INVALID",
    ]);
    expect(issues).toEqual([
      HOSTNAME_INVALID,
      FQDN_INVALID,
      TIMEZONE_INVALID,
      LOCALE_INVALID,
    ]);
  });
});
