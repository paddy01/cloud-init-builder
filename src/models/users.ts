import { z } from "zod";
import { isSupportedPasswordHash } from "../validators/passwordHash.ts";

const sudoSchema = z.union([
  z.string(),
  z.array(z.union([z.string(), z.null()])),
  z.null(),
  z.boolean(),
]);

export const builderSshAuthorizedKeySchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const builderUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  gecos: z.string().optional(),
  groups: z.array(z.string()).optional(),
  shell: z.string().optional(),
  sudo: sudoSchema.optional(),
  primary_group: z.string().optional(),
  no_create_home: z.boolean().optional(),
  homedir: z.string().optional(),
  system: z.boolean().optional(),
  lock_passwd: z.boolean().optional(),
  passwd: z.string().optional(),
  ssh_authorized_keys: z.array(builderSshAuthorizedKeySchema).optional(),
});

export const usersConfigSchema = z.object({
  preserveDefault: z.boolean(),
  entries: z.array(builderUserSchema),
});

export type BuilderSshAuthorizedKey = z.infer<
  typeof builderSshAuthorizedKeySchema
>;
export type BuilderUser = z.infer<typeof builderUserSchema>;
export type UsersConfig = z.infer<typeof usersConfigSchema>;

export const DEFAULT_USERS_CONFIG: UsersConfig = {
  preserveDefault: true,
  entries: [],
};

export const SHELL_PRESETS = [
  "/bin/bash",
  "/bin/sh",
  "/usr/sbin/nologin",
] as const;

export type ShellPreset = (typeof SHELL_PRESETS)[number];

export function isShellPreset(shell: string | undefined): shell is ShellPreset {
  return (
    shell !== undefined &&
    (SHELL_PRESETS as readonly string[]).includes(shell)
  );
}

export function getShellChoice(shell: string | undefined): ShellPreset | "other" {
  if (isShellPreset(shell)) {
    return shell;
  }
  return "other";
}

export const SUDO_PASSWORDLESS = "ALL=(ALL) NOPASSWD:ALL";
export const SUDO_REQUIRE_PASSWORD = "ALL=(ALL) ALL";

export type SudoPresetChoice =
  | "none"
  | "passwordless"
  | "require-password"
  | "custom";

export function getSudoPresetChoice(
  sudo: BuilderUser["sudo"],
): SudoPresetChoice {
  if (sudo === undefined || sudo === false) {
    return "none";
  }
  if (sudo === SUDO_PASSWORDLESS) {
    return "passwordless";
  }
  if (sudo === SUDO_REQUIRE_PASSWORD) {
    return "require-password";
  }
  return "custom";
}

let userIdCounter = 0;

export function createUserId(): string {
  userIdCounter += 1;
  return `user-${userIdCounter}`;
}

export function createBlankUser(id = createUserId()): BuilderUser {
  return { id, shell: "/bin/bash", lock_passwd: true };
}

let sshKeyIdCounter = 0;

export function createSshKeyId(): string {
  sshKeyIdCounter += 1;
  return `ssh-key-${sshKeyIdCounter}`;
}

export function createBlankSshAuthorizedKey(
  id = createSshKeyId(),
): BuilderSshAuthorizedKey {
  return { id, value: "" };
}

function isBlankOptionalString(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

function hasNonblankGroups(groups: string[] | undefined): boolean {
  return groups?.some((group) => group.trim() !== "") ?? false;
}

function hasNonblankSshRows(
  rows: BuilderSshAuthorizedKey[] | undefined,
): boolean {
  return rows?.some((row) => row.value.trim() !== "") ?? false;
}

export function isSemanticallyBlankUser(user: BuilderUser): boolean {
  if (!isBlankOptionalString(user.name)) {
    return false;
  }
  if (!isBlankOptionalString(user.gecos)) {
    return false;
  }
  if (!isBlankOptionalString(user.primary_group)) {
    return false;
  }
  if (!isBlankOptionalString(user.homedir)) {
    return false;
  }
  if (hasNonblankGroups(user.groups)) {
    return false;
  }
  if (user.sudo !== undefined && user.sudo !== false) {
    return false;
  }

  const shell = user.shell?.trim() ?? "";
  if (shell !== "" && shell !== "/bin/bash") {
    return false;
  }

  if (user.no_create_home === true) {
    return false;
  }
  if (user.system === true) {
    return false;
  }

  if (
    user.passwd !== undefined &&
    user.passwd !== "" &&
    isSupportedPasswordHash(user.passwd)
  ) {
    return false;
  }
  if (user.lock_passwd === false) {
    return false;
  }

  if (hasNonblankSshRows(user.ssh_authorized_keys)) {
    return false;
  }

  return true;
}

export function isUsersConfig(value: unknown): value is UsersConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "preserveDefault" in value &&
    typeof (value as UsersConfig).preserveDefault === "boolean" &&
    Array.isArray((value as UsersConfig).entries)
  );
}

export interface UsersImportWarning {
  path: string;
  message: string;
}

export interface UsersNormalizationResult {
  users: UsersConfig;
  warnings: UsersImportWarning[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedLegacyUserRecord(
  entry: unknown,
): entry is Record<string, unknown> {
  return isPlainObject(entry) && typeof entry.name === "string";
}

function isCanonicalSshRow(
  value: unknown,
): value is BuilderSshAuthorizedKey {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.value === "string"
  );
}

function dedupeWarnings(
  warnings: UsersImportWarning[],
): UsersImportWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.path}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeSshAuthorizedKeys(
  raw: unknown,
  warnings: UsersImportWarning[],
): BuilderSshAuthorizedKey[] | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (!Array.isArray(raw)) {
    warnings.push({
      path: "users",
      message: "Invalid ssh_authorized_keys was omitted during import.",
    });
    return undefined;
  }

  const rows: BuilderSshAuthorizedKey[] = [];

  for (const item of raw) {
    if (typeof item === "string") {
      rows.push({ id: createSshKeyId(), value: item });
      continue;
    }

    if (isCanonicalSshRow(item)) {
      rows.push({ id: item.id, value: item.value });
      continue;
    }

    warnings.push({
      path: "users",
      message: "Invalid SSH key entry was omitted during import.",
    });
  }

  return rows.length > 0 ? rows : undefined;
}

function normalizePasswordFields(
  record: Record<string, unknown>,
  warnings: UsersImportWarning[],
): Pick<BuilderUser, "lock_passwd" | "passwd"> {
  let explicitLock: boolean | undefined;
  if (typeof record.lock_passwd === "boolean") {
    explicitLock = record.lock_passwd;
  }

  let supportedHash: string | undefined;

  if (typeof record.passwd === "string") {
    if (isSupportedPasswordHash(record.passwd)) {
      supportedHash = record.passwd;
    } else {
      warnings.push({
        path: "users",
        message: "Unsupported passwd value was omitted during import.",
      });
    }
  } else if (record.passwd !== undefined) {
    warnings.push({
      path: "users",
      message: "Invalid passwd value was omitted during import.",
    });
  }

  if (typeof record.hashed_passwd === "string") {
    if (isSupportedPasswordHash(record.hashed_passwd)) {
      if (supportedHash === undefined) {
        supportedHash = record.hashed_passwd;
        warnings.push({
          path: "users",
          message: "hashed_passwd was canonicalized to passwd during import.",
        });
      }
    } else {
      warnings.push({
        path: "users",
        message: "Unsupported hashed_passwd value was omitted during import.",
      });
    }
  } else if (record.hashed_passwd !== undefined) {
    warnings.push({
      path: "users",
      message: "Invalid hashed_passwd value was omitted during import.",
    });
  }

  if ("plain_text_passwd" in record) {
    warnings.push({
      path: "users",
      message: "plain_text_passwd was omitted during import.",
    });
  }

  const result: Pick<BuilderUser, "lock_passwd" | "passwd"> = {};

  if (supportedHash !== undefined) {
    result.passwd = supportedHash;
  }

  if (explicitLock !== undefined) {
    result.lock_passwd = explicitLock;
  } else if (supportedHash !== undefined) {
    result.lock_passwd = false;
  } else {
    result.lock_passwd = true;
  }

  return result;
}

function normalizeUserRecord(
  record: Record<string, unknown>,
  options: { legacy?: boolean },
): { user: BuilderUser; warnings: UsersImportWarning[] } {
  const warnings: UsersImportWarning[] = [];

  if ("ssh_import_id" in record) {
    warnings.push({
      path: "users",
      message:
        "Unsupported user fields were omitted during import: ssh_import_id.",
    });
  }

  const passwordFields = normalizePasswordFields(record, warnings);
  const sshKeys = normalizeSshAuthorizedKeys(
    record.ssh_authorized_keys,
    warnings,
  );

  const user: BuilderUser = {
    id: typeof record.id === "string" ? record.id : createUserId(),
    name: typeof record.name === "string" ? record.name : undefined,
    gecos: typeof record.gecos === "string" ? record.gecos : undefined,
    groups: Array.isArray(record.groups)
      ? record.groups.filter((group): group is string => typeof group === "string")
      : undefined,
    shell:
      typeof record.shell === "string"
        ? record.shell
        : options.legacy
          ? "/bin/bash"
          : undefined,
    sudo: record.sudo as BuilderUser["sudo"],
    primary_group:
      typeof record.primary_group === "string"
        ? record.primary_group
        : undefined,
    no_create_home:
      typeof record.no_create_home === "boolean"
        ? record.no_create_home
        : undefined,
    homedir: typeof record.homedir === "string" ? record.homedir : undefined,
    system: typeof record.system === "boolean" ? record.system : undefined,
    ...passwordFields,
    ...(sshKeys !== undefined ? { ssh_authorized_keys: sshKeys } : {}),
  };

  return { user, warnings };
}

export function normalizeUsersSection(
  rawUsers: unknown,
): UsersNormalizationResult {
  if (rawUsers === undefined || rawUsers === null) {
    return {
      users: structuredClone(DEFAULT_USERS_CONFIG),
      warnings: [],
    };
  }

  if (isUsersConfig(rawUsers)) {
    const entries: BuilderUser[] = [];
    const warnings: UsersImportWarning[] = [];

    for (const entry of rawUsers.entries) {
      if (isPlainObject(entry)) {
        const normalized = normalizeUserRecord(entry, { legacy: false });
        entries.push(normalized.user);
        warnings.push(...normalized.warnings);
      }
    }

    return {
      users: {
        preserveDefault: rawUsers.preserveDefault,
        entries,
      },
      warnings: dedupeWarnings(warnings),
    };
  }

  if (Array.isArray(rawUsers)) {
    let preserveDefault = false;
    const entries: BuilderUser[] = [];
    const warnings: UsersImportWarning[] = [];

    for (const entry of rawUsers) {
      if (entry === "default") {
        preserveDefault = true;
        continue;
      }

      if (isSupportedLegacyUserRecord(entry)) {
        const normalized = normalizeUserRecord(entry, { legacy: true });
        entries.push(normalized.user);
        warnings.push(...normalized.warnings);
      }
    }

    return {
      users: { preserveDefault, entries },
      warnings: dedupeWarnings(warnings),
    };
  }

  return {
    users: structuredClone(DEFAULT_USERS_CONFIG),
    warnings: [
      {
        path: "users",
        message: "Invalid users data was replaced with defaults.",
      },
    ],
  };
}

export function getUserHeaderMetadata(user: BuilderUser): {
  title: string;
  secondary: string[];
  badges: string[];
} {
  const trimmedName = user.name?.trim() ?? "";
  const title = trimmedName === "" ? "New user" : trimmedName;

  const secondary: string[] = [];
  const gecos = user.gecos?.trim() ?? "";
  secondary.push(gecos === "" ? "No full name" : gecos);

  const groups = user.groups?.filter((group) => group.trim() !== "") ?? [];
  secondary.push(groups.length === 0 ? "No groups" : groups.join(", "));

  const badges: string[] = [];
  if (user.shell === "/usr/sbin/nologin") {
    badges.push("nologin");
  } else if (
    user.shell !== undefined &&
    user.shell !== "" &&
    user.shell !== "/bin/bash" &&
    user.shell !== "/bin/sh"
  ) {
    badges.push("Custom shell");
  }

  if (user.sudo === SUDO_PASSWORDLESS) {
    badges.push("sudo");
  } else if (user.sudo === SUDO_REQUIRE_PASSWORD) {
    badges.push("sudo (password)");
  } else if (user.sudo !== undefined && user.sudo !== false) {
    badges.push("Custom sudo");
  }

  return { title, secondary, badges };
}
