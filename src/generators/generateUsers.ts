import type { BuilderUser, UsersConfig } from "../models/users.ts";
import {
  DEFAULT_USERS_CONFIG,
  isSemanticallyBlankUser,
} from "../models/users.ts";
import { isSupportedPasswordHash } from "../validators/passwordHash.ts";

export type CloudInitUserEntry = "default" | Record<string, unknown>;

export const USER_KEY_ORDER = [
  "name",
  "gecos",
  "primary_group",
  "groups",
  "sudo",
  "shell",
  "lock_passwd",
  "passwd",
  "ssh_authorized_keys",
  "homedir",
  "no_create_home",
  "system",
] as const;

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeGroups(groups: string[] | undefined): string[] | undefined {
  if (!groups || groups.length === 0) return undefined;
  const normalized = groups.map((g) => g.trim()).filter(Boolean);
  return normalized.length === 0 ? undefined : normalized;
}

function normalizeSshAuthorizedKeys(
  rows: BuilderUser["ssh_authorized_keys"],
): string[] | undefined {
  if (!rows || rows.length === 0) {
    return undefined;
  }

  const normalized = rows
    .map((row) => row.value.trim())
    .filter((value) => value !== "");
  return normalized.length === 0 ? undefined : normalized;
}

export function mapBuilderUser(
  user: BuilderUser,
): Record<string, unknown> | undefined {
  if (isSemanticallyBlankUser(user)) {
    return undefined;
  }

  const name = trimOptional(user.name);
  if (!name) {
    return undefined;
  }

  const lockPasswd = user.lock_passwd ?? true;
  const passwd =
    lockPasswd === false &&
    user.passwd !== undefined &&
    isSupportedPasswordHash(user.passwd)
      ? user.passwd
      : undefined;

  const mapped: Record<string, unknown> = {
    name,
    gecos: trimOptional(user.gecos),
    primary_group: trimOptional(user.primary_group),
    groups: normalizeGroups(user.groups),
    sudo: user.sudo,
    shell: trimOptional(user.shell),
    lock_passwd: lockPasswd,
    passwd,
    ssh_authorized_keys: normalizeSshAuthorizedKeys(user.ssh_authorized_keys),
    homedir: user.system ? undefined : trimOptional(user.homedir),
    no_create_home:
      user.system || user.no_create_home !== true ? undefined : true,
    system: user.system === true ? true : undefined,
  };

  const ordered: Record<string, unknown> = {};
  for (const key of USER_KEY_ORDER) {
    const value = mapped[key];
    if (value !== undefined) {
      ordered[key] = value;
    }
  }

  return ordered;
}

export function buildCloudInitUsers(
  config: UsersConfig = DEFAULT_USERS_CONFIG,
): CloudInitUserEntry[] {
  const entries: CloudInitUserEntry[] = [];

  if (config.preserveDefault) {
    entries.push("default");
  }

  for (const user of config.entries) {
    const mapped = mapBuilderUser(user);
    if (mapped) entries.push(mapped);
  }

  return entries;
}
