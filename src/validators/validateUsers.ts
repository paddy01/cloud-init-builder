import {
  isSemanticallyBlankUser,
  type BuilderUser,
  type UsersConfig,
} from "../models/users.ts";
import { isSupportedPasswordHash } from "./passwordHash.ts";
import { parseSshPublicKey } from "./sshPublicKey.ts";
import type { ValidationIssue } from "./validateConfig.ts";

const USERNAME_REGEX = /^[A-Za-z_][A-Za-z0-9_-]{0,31}$/;

const RESERVED_USERNAMES = new Set(
  ["root", "daemon", "bin", "nobody"].map((name) => name.toLowerCase()),
);

export const USER_VALIDATION_MESSAGES = {
  USER_NAME_REQUIRED:
    "Export blocked: enter a username or clear the other fields to omit this card.",
  USER_NAME_INVALID:
    "Export blocked: use 1-32 letters, numbers, underscores, or hyphens, starting with a letter or underscore.",
  USER_NAME_RESERVED: (name: string) =>
    `Export blocked: ${name} is reserved. Choose another username.`,
  USER_NAME_DUPLICATE: (otherName: string) =>
    `Export blocked: username conflicts with ${otherName}. Usernames must be unique regardless of letter case.`,
  USER_NAME_UPPERCASE:
    "Lowercase usernames are recommended for broader Linux compatibility.",
  USER_PASSWORD_HASH_INVALID:
    "Export blocked: enter a supported password hash beginning with $6$, $5$, or $2y$. Plaintext is not accepted.",
  USER_PASSWORD_LOGIN_ENABLED:
    "Password hashes in cloud-config may be exposed; SSH keys are recommended for login.",
  USER_SSH_KEY_INVALID:
    "Export blocked: enter a supported key type followed by a valid base64 payload.",
  USER_SSH_KEY_DUPLICATE:
    "Export blocked: this SSH key is already added to this user.",
  USER_AUTH_REQUIRED:
    "Export blocked: add a supported password hash or at least one valid SSH key for this login user.",
} as const;

function userFieldPath(userId: string, field: string): string {
  return `users.entries.${userId}.${field}`;
}

function sshRowPath(userId: string, rowId: string): string {
  return `users.entries.${userId}.ssh_authorized_keys.${rowId}`;
}

function isAuthExempt(user: BuilderUser): boolean {
  if (user.system === true) {
    return true;
  }
  return (user.shell?.trim() ?? "") === "/usr/sbin/nologin";
}

function hasUsablePassword(user: BuilderUser): boolean {
  const hash = user.passwd ?? "";
  return user.lock_passwd === false && isSupportedPasswordHash(hash);
}

function hasValidSshKey(user: BuilderUser): boolean {
  const rows = user.ssh_authorized_keys ?? [];
  const seenIdentities = new Set<string>();

  for (const row of rows) {
    const trimmed = row.value.trim();
    if (trimmed === "") {
      continue;
    }

    const parsed = parseSshPublicKey(trimmed);
    if (!parsed) {
      continue;
    }

    if (seenIdentities.has(parsed.identity)) {
      continue;
    }

    seenIdentities.add(parsed.identity);
    return true;
  }

  return false;
}

function buildDuplicateUsernameMap(
  entries: BuilderUser[],
): Map<string, BuilderUser[]> {
  const byLowerName = new Map<string, BuilderUser[]>();

  for (const user of entries) {
    const trimmed = user.name?.trim() ?? "";
    if (trimmed === "") {
      continue;
    }

    const key = trimmed.toLowerCase();
    const group = byLowerName.get(key);
    if (group) {
      group.push(user);
    } else {
      byLowerName.set(key, [user]);
    }
  }

  return byLowerName;
}

function pushUsernameIssues(
  user: BuilderUser,
  duplicateGroups: Map<string, BuilderUser[]>,
  issues: ValidationIssue[],
): void {
  const trimmedName = user.name?.trim() ?? "";

  if (trimmedName === "") {
    issues.push({
      path: userFieldPath(user.id, "name"),
      code: "USER_NAME_REQUIRED",
      message: USER_VALIDATION_MESSAGES.USER_NAME_REQUIRED,
      severity: "error",
    });
    return;
  }

  if (!USERNAME_REGEX.test(trimmedName)) {
    issues.push({
      path: userFieldPath(user.id, "name"),
      code: "USER_NAME_INVALID",
      message: USER_VALIDATION_MESSAGES.USER_NAME_INVALID,
      severity: "error",
    });
    return;
  }

  if (RESERVED_USERNAMES.has(trimmedName.toLowerCase())) {
    issues.push({
      path: userFieldPath(user.id, "name"),
      code: "USER_NAME_RESERVED",
      message: USER_VALIDATION_MESSAGES.USER_NAME_RESERVED(trimmedName),
      severity: "error",
    });
  }

  const duplicateGroup = duplicateGroups.get(trimmedName.toLowerCase());
  if (duplicateGroup && duplicateGroup.length > 1) {
    const other = duplicateGroup.find((candidate) => candidate.id !== user.id);
    const otherName = other?.name?.trim() ?? trimmedName;
    issues.push({
      path: userFieldPath(user.id, "name"),
      code: "USER_NAME_DUPLICATE",
      message: USER_VALIDATION_MESSAGES.USER_NAME_DUPLICATE(otherName),
      severity: "error",
    });
  }

  if (/[A-Z]/.test(trimmedName)) {
    issues.push({
      path: userFieldPath(user.id, "name"),
      code: "USER_NAME_UPPERCASE",
      message: USER_VALIDATION_MESSAGES.USER_NAME_UPPERCASE,
      severity: "warning",
    });
  }
}

function pushPasswordIssues(user: BuilderUser, issues: ValidationIssue[]): void {
  const passwd = user.passwd ?? "";
  const passwordErrors: ValidationIssue[] = [];
  const passwordWarnings: ValidationIssue[] = [];

  if (passwd !== "" && !isSupportedPasswordHash(passwd)) {
    passwordErrors.push({
      path: userFieldPath(user.id, "passwd"),
      code: "USER_PASSWORD_HASH_INVALID",
      message: USER_VALIDATION_MESSAGES.USER_PASSWORD_HASH_INVALID,
      severity: "error",
    });
  }

  if (hasUsablePassword(user)) {
    passwordWarnings.push({
      path: userFieldPath(user.id, "passwd"),
      code: "USER_PASSWORD_LOGIN_ENABLED",
      message: USER_VALIDATION_MESSAGES.USER_PASSWORD_LOGIN_ENABLED,
      severity: "warning",
    });
  }

  issues.push(...passwordErrors, ...passwordWarnings);
}

function pushSshIssues(user: BuilderUser, issues: ValidationIssue[]): void {
  const rows = user.ssh_authorized_keys ?? [];
  const identityToRowIds = new Map<string, string[]>();

  for (const row of rows) {
    const trimmed = row.value.trim();
    if (trimmed === "") {
      continue;
    }

    const parsed = parseSshPublicKey(trimmed);
    if (!parsed) {
      issues.push({
        path: sshRowPath(user.id, row.id),
        code: "USER_SSH_KEY_INVALID",
        message: USER_VALIDATION_MESSAGES.USER_SSH_KEY_INVALID,
        severity: "error",
      });
      continue;
    }

    const rowIds = identityToRowIds.get(parsed.identity);
    if (rowIds) {
      rowIds.push(row.id);
    } else {
      identityToRowIds.set(parsed.identity, [row.id]);
    }
  }

  const duplicateRowIds = new Set<string>();
  for (const rowIds of identityToRowIds.values()) {
    if (rowIds.length > 1) {
      for (const rowId of rowIds) {
        duplicateRowIds.add(rowId);
      }
    }
  }

  for (const row of rows) {
    if (!duplicateRowIds.has(row.id)) {
      continue;
    }

    issues.push({
      path: sshRowPath(user.id, row.id),
      code: "USER_SSH_KEY_DUPLICATE",
      message: USER_VALIDATION_MESSAGES.USER_SSH_KEY_DUPLICATE,
      severity: "error",
    });
  }
}

function pushAuthenticationIssue(
  user: BuilderUser,
  issues: ValidationIssue[],
): void {
  const trimmedName = user.name?.trim() ?? "";
  if (trimmedName === "" || isAuthExempt(user)) {
    return;
  }

  if (hasUsablePassword(user) || hasValidSshKey(user)) {
    return;
  }

  issues.push({
    path: userFieldPath(user.id, "authentication"),
    code: "USER_AUTH_REQUIRED",
    message: USER_VALIDATION_MESSAGES.USER_AUTH_REQUIRED,
    severity: "error",
  });
}

function validateSingleUser(
  user: BuilderUser,
  duplicateGroups: Map<string, BuilderUser[]>,
): ValidationIssue[] {
  if (isSemanticallyBlankUser(user)) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  pushUsernameIssues(user, duplicateGroups, issues);
  pushPasswordIssues(user, issues);
  pushSshIssues(user, issues);
  pushAuthenticationIssue(user, issues);
  return issues;
}

export function validateUsers(
  users: UsersConfig | undefined,
): ValidationIssue[] {
  if (!users) {
    return [];
  }

  const duplicateGroups = buildDuplicateUsernameMap(users.entries);
  const issues: ValidationIssue[] = [];

  for (const user of users.entries) {
    issues.push(...validateSingleUser(user, duplicateGroups));
  }

  return issues;
}
