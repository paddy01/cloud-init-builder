import { z } from "zod";

const sudoSchema = z.union([
  z.string(),
  z.array(z.union([z.string(), z.null()])),
  z.null(),
  z.boolean(),
]);

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
});

export const usersConfigSchema = z.object({
  preserveDefault: z.boolean(),
  entries: z.array(builderUserSchema),
});

export type BuilderUser = z.infer<typeof builderUserSchema>;
export type UsersConfig = z.infer<typeof usersConfigSchema>;

export const DEFAULT_USERS_CONFIG: UsersConfig = {
  preserveDefault: true,
  entries: [],
};

let userIdCounter = 0;

export function createUserId(): string {
  userIdCounter += 1;
  return `user-${userIdCounter}`;
}

export function createBlankUser(id = createUserId()): BuilderUser {
  return { id, shell: "/bin/bash" };
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

const UNSUPPORTED_USER_FIELDS = [
  "passwd",
  "plain_text_passwd",
  "lock_passwd",
  "ssh_authorized_keys",
  "ssh_import_id",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedLegacyUserRecord(
  entry: unknown,
): entry is Record<string, unknown> {
  return isPlainObject(entry) && typeof entry.name === "string";
}

function collectUnsupportedFieldWarnings(
  record: Record<string, unknown>,
): UsersImportWarning[] {
  const warnings: UsersImportWarning[] = [];
  const dropped: string[] = [];

  for (const field of UNSUPPORTED_USER_FIELDS) {
    if (field in record) {
      dropped.push(field);
    }
  }

  if (dropped.length > 0) {
    warnings.push({
      path: "users",
      message: `Unsupported user fields were omitted during import: ${dropped.join(", ")}.`,
    });
  }

  return warnings;
}

function normalizeLegacyUser(record: Record<string, unknown>): {
  user: BuilderUser;
  warnings: UsersImportWarning[];
} {
  const warnings = collectUnsupportedFieldWarnings(record);

  const user: BuilderUser = {
    id: createUserId(),
    name: record.name as string,
    gecos: typeof record.gecos === "string" ? record.gecos : undefined,
    groups: Array.isArray(record.groups)
      ? record.groups.filter((group): group is string => typeof group === "string")
      : undefined,
    shell: typeof record.shell === "string" ? record.shell : "/bin/bash",
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
    return {
      users: structuredClone(rawUsers),
      warnings: [],
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
        const normalized = normalizeLegacyUser(entry);
        entries.push(normalized.user);
        warnings.push(...normalized.warnings);
      }
    }

    return {
      users: { preserveDefault, entries },
      warnings,
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

  if (user.sudo === "ALL=(ALL) NOPASSWD:ALL") {
    badges.push("sudo");
  } else if (user.sudo === "ALL=(ALL) ALL") {
    badges.push("sudo (password)");
  } else if (user.sudo !== undefined && user.sudo !== false && user.sudo !== null) {
    badges.push("Custom sudo");
  }

  return { title, secondary, badges };
}
