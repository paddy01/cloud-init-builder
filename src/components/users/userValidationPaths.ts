import type { BuilderUser } from "../../models/users.ts";

export function isUserIssuePath(path: string): boolean {
  return path.startsWith("users.entries.");
}

export function getUserIdFromIssuePath(path: string): string | null {
  const match = path.match(/^users\.entries\.([^.]+)\./);
  return match?.[1] ?? null;
}

export function pathToFocusTargetId(path: string): string | null {
  const sshMatch = path.match(
    /^users\.entries\.([^.]+)\.ssh_authorized_keys\.([^.]+)$/,
  );
  if (sshMatch) {
    const [, userId, rowId] = sshMatch;
    return `user-ssh-key-${userId}-${rowId}`;
  }

  const match = path.match(/^users\.entries\.([^.]+)\.([^.]+)$/);
  if (!match) {
    return null;
  }

  const [, userId, field] = match;
  if (field === "name") {
    return `user-username-${userId}`;
  }
  if (field === "passwd") {
    return `user-password-${userId}`;
  }
  if (field === "authentication") {
    return `user-auth-${userId}`;
  }

  return null;
}

export function getSshRowIdFromPath(path: string): string | null {
  const match = path.match(/^users\.entries\.[^.]+\.ssh_authorized_keys\.([^.]+)$/);
  return match?.[1] ?? null;
}

export function getUserLabel(user: BuilderUser, position: number): string {
  const trimmed = user.name?.trim() ?? "";
  return trimmed === "" ? `New user ${position}` : trimmed;
}
