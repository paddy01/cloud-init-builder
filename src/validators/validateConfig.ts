import {
  MANAGE_ETC_HOSTS_VALUES,
  type IdentityConfig,
} from "../models/identity.ts";
import type { ProjectFile } from "../models/project.ts";
import { isUsersConfig } from "../models/users.ts";
import { isValidFqdn, isValidHostname } from "./hostname.ts";
import { isValidLocale } from "./locale.ts";
import { isValidTimezone } from "./timezone.ts";
import { validateUsers } from "./validateUsers.ts";

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
  const allowedManageEtcHosts = new Set<unknown>(MANAGE_ETC_HOSTS_VALUES);

  if (
    id?.manage_etc_hosts !== undefined &&
    !allowedManageEtcHosts.has(id.manage_etc_hosts)
  ) {
    issues.push({
      path: "identity.manage_etc_hosts",
      code: "MANAGE_ETC_HOSTS_INVALID",
      message: "Manage /etc/hosts must be true, false, or localhost.",
      severity: "error",
    });
  }

  if (!id?.hostname || id.hostname.trim() === "") {
    issues.push({
      path: "identity.hostname",
      code: "HOSTNAME_REQUIRED",
      message: "Hostname is required to export YAML.",
      severity: "error",
    });
  } else if (!isValidHostname(id.hostname.trim())) {
    issues.push({
      path: "identity.hostname",
      code: "HOSTNAME_INVALID",
      message:
        "Hostname must be 1–63 chars, alphanumeric or hyphen, not starting/ending with a hyphen.",
      severity: "error",
    });
  }

  const fqdn = id?.fqdn?.trim();
  if (fqdn && !isValidFqdn(fqdn)) {
    issues.push({
      path: "identity.fqdn",
      code: "FQDN_INVALID",
      message: "FQDN must be a valid dotted name (≤253 chars, no trailing dot).",
      severity: "error",
    });
  }

  const timezone = id?.timezone?.trim();
  if (timezone && !isValidTimezone(timezone)) {
    issues.push({
      path: "identity.timezone",
      code: "TIMEZONE_INVALID",
      message: "Timezone must be a valid IANA name (e.g. Europe/Stockholm).",
      severity: "error",
    });
  }

  const locale = id?.locale?.trim();
  if (locale && !isValidLocale(locale)) {
    issues.push({
      path: "identity.locale",
      code: "LOCALE_INVALID",
      message:
        "Locale must follow language[_TERRITORY][.codeset] (e.g. en_US.UTF-8).",
      severity: "error",
    });
  }

  if (id?.prefer_fqdn_over_hostname && !id.fqdn?.trim()) {
    issues.push({
      path: "identity.prefer_fqdn_over_hostname",
      code: "PREFER_FQDN_WITHOUT_FQDN",
      message: "Prefer FQDN is enabled but no FQDN is set.",
      severity: "warning",
    });
  }

  return issues;
}

export function validateConfig(
  project: ProjectFile | null,
): ValidationIssue[] {
  return [
    ...validateIdentity(project?.identity),
    ...validateUsers(
      isUsersConfig(project?.users) ? project.users : undefined,
    ),
  ];
}
