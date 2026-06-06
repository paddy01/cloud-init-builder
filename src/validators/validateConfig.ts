import type { IdentityConfig } from "../models/identity.ts";
import { isValidFqdn, isValidHostname } from "./hostname.ts";
import { isValidLocale } from "./locale.ts";
import { isValidTimezone } from "./timezone.ts";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export function validateIdentity(
  id: IdentityConfig | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!id?.hostname || id.hostname.trim() === "") {
    issues.push({
      path: "identity.hostname",
      code: "HOSTNAME_REQUIRED",
      message: "Hostname is required to export YAML.",
      severity: "error",
    });
  } else if (!isValidHostname(id.hostname)) {
    issues.push({
      path: "identity.hostname",
      code: "HOSTNAME_INVALID",
      message:
        "Hostname must be 1–63 chars, alphanumeric or hyphen, not starting/ending with a hyphen.",
      severity: "error",
    });
  }

  if (id?.fqdn && id.fqdn.trim() !== "" && !isValidFqdn(id.fqdn)) {
    issues.push({
      path: "identity.fqdn",
      code: "FQDN_INVALID",
      message: "FQDN must be a valid dotted name (≤253 chars, no trailing dot).",
      severity: "error",
    });
  }

  if (id?.timezone && id.timezone.trim() !== "" && !isValidTimezone(id.timezone)) {
    issues.push({
      path: "identity.timezone",
      code: "TIMEZONE_INVALID",
      message: "Timezone must be a valid IANA name (e.g. Europe/Stockholm).",
      severity: "error",
    });
  }

  if (id?.locale && id.locale.trim() !== "" && !isValidLocale(id.locale)) {
    issues.push({
      path: "identity.locale",
      code: "LOCALE_INVALID",
      message:
        "Locale must follow language[_TERRITORY][.codeset] (e.g. en_US.UTF-8).",
      severity: "error",
    });
  }

  return issues;
}
