import { describe, expect, it } from "vitest";
import {
  createBlankSshAuthorizedKey,
  createBlankUser,
  type UsersConfig,
} from "../../../src/models/users.ts";
import {
  USER_VALIDATION_MESSAGES,
  validateUsers,
} from "../../../src/validators/validateUsers.ts";

const BCRYPT_HASH =
  "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const SSH_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";

function usersConfig(entries: UsersConfig["entries"]): UsersConfig {
  return { preserveDefault: true, entries };
}

describe("validateUsers", () => {
  it("returns no issues for undefined users", () => {
    expect(validateUsers(undefined)).toEqual([]);
  });

  it("returns no issues for a fully blank card", () => {
    const user = createBlankUser("blank-user");
    expect(validateUsers(usersConfig([user]))).toEqual([]);
  });

  it("returns USER_NAME_REQUIRED for a configured nameless card", () => {
    const user = createBlankUser("nameless-user");
    user.gecos = "Someone";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toEqual([
      {
        path: "users.entries.nameless-user.name",
        code: "USER_NAME_REQUIRED",
        message: USER_VALIDATION_MESSAGES.USER_NAME_REQUIRED,
        severity: "error",
      },
    ]);
  });

  it("does not cascade USER_AUTH_REQUIRED onto a configured nameless card", () => {
    const user = createBlankUser("nameless-auth");
    user.gecos = "Someone";
    const issues = validateUsers(usersConfig([user]));
    expect(issues.some((issue) => issue.code === "USER_AUTH_REQUIRED")).toBe(
      false,
    );
  });

  it("returns USER_NAME_INVALID for invalid syntax", () => {
    const user = createBlankUser("invalid-name");
    user.name = "-bad";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.invalid-name.name",
      code: "USER_NAME_INVALID",
      message: USER_VALIDATION_MESSAGES.USER_NAME_INVALID,
      severity: "error",
    });
  });

  it("returns USER_NAME_RESERVED for reserved names case-insensitively", () => {
    const user = createBlankUser("reserved-user");
    user.name = "Root";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.reserved-user.name",
      code: "USER_NAME_RESERVED",
      message: USER_VALIDATION_MESSAGES.USER_NAME_RESERVED("Root"),
      severity: "error",
    });
  });

  it("returns USER_NAME_UPPERCASE warning only after syntax succeeds", () => {
    const user = createBlankUser("upper-user");
    user.name = "Deploy";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.upper-user.name",
      code: "USER_NAME_UPPERCASE",
      message: USER_VALIDATION_MESSAGES.USER_NAME_UPPERCASE,
      severity: "warning",
    });
    expect(issues.some((issue) => issue.code === "USER_NAME_INVALID")).toBe(
      false,
    );
  });

  it("marks every conflicting card for case-insensitive duplicate usernames", () => {
    const first = createBlankUser("dup-a");
    first.name = "deploy";
    const second = createBlankUser("dup-b");
    second.name = "Deploy";
    const issues = validateUsers(usersConfig([first, second]));
    const duplicateIssues = issues.filter(
      (issue) => issue.code === "USER_NAME_DUPLICATE",
    );
    expect(duplicateIssues).toHaveLength(2);
    expect(duplicateIssues[0]?.path).toBe("users.entries.dup-a.name");
    expect(duplicateIssues[1]?.path).toBe("users.entries.dup-b.name");
  });

  it("returns USER_PASSWORD_HASH_INVALID for unsupported canonical passwd", () => {
    const user = createBlankUser("bad-pass");
    user.name = "deploy";
    user.passwd = "hunter2";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.bad-pass.passwd",
      code: "USER_PASSWORD_HASH_INVALID",
      message: USER_VALIDATION_MESSAGES.USER_PASSWORD_HASH_INVALID,
      severity: "error",
    });
  });

  it("returns USER_PASSWORD_LOGIN_ENABLED warning for unlocked supported hash", () => {
    const user = createBlankUser("hash-user");
    user.name = "deploy";
    user.passwd = BCRYPT_HASH;
    user.lock_passwd = false;
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.hash-user.passwd",
      code: "USER_PASSWORD_LOGIN_ENABLED",
      message: USER_VALIDATION_MESSAGES.USER_PASSWORD_LOGIN_ENABLED,
      severity: "warning",
    });
  });

  it("returns USER_SSH_KEY_INVALID for malformed nonblank SSH rows", () => {
    const user = createBlankUser("bad-ssh");
    user.name = "deploy";
    user.ssh_authorized_keys = [
      createBlankSshAuthorizedKey("row-a"),
      { id: "row-b", value: "ssh-rsa AAAA... comment" },
    ];
    user.ssh_authorized_keys[0]!.value = "not-a-key";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.bad-ssh.ssh_authorized_keys.row-a",
      code: "USER_SSH_KEY_INVALID",
      message: USER_VALIDATION_MESSAGES.USER_SSH_KEY_INVALID,
      severity: "error",
    });
  });

  it("returns USER_SSH_KEY_DUPLICATE within one user but allows cross-user reuse", () => {
    const first = createBlankUser("ssh-dup-a");
    first.name = "deploy";
    first.ssh_authorized_keys = [
      { id: "row-1", value: SSH_KEY },
      { id: "row-2", value: `${SSH_KEY} alt-comment` },
    ];

    const second = createBlankUser("ssh-dup-b");
    second.name = "ops";
    second.ssh_authorized_keys = [{ id: "row-3", value: SSH_KEY }];

    const issues = validateUsers(usersConfig([first, second]));
    const duplicateIssues = issues.filter(
      (issue) => issue.code === "USER_SSH_KEY_DUPLICATE",
    );
    expect(duplicateIssues).toHaveLength(2);
    expect(
      issues.some(
        (issue) =>
          issue.code === "USER_SSH_KEY_DUPLICATE" &&
          issue.path.includes("ssh-dup-b"),
      ),
    ).toBe(false);
  });

  it("returns USER_AUTH_REQUIRED for login-capable users without auth", () => {
    const user = createBlankUser("auth-required");
    user.name = "deploy";
    const issues = validateUsers(usersConfig([user]));
    expect(issues).toContainEqual({
      path: "users.entries.auth-required.authentication",
      code: "USER_AUTH_REQUIRED",
      message: USER_VALIDATION_MESSAGES.USER_AUTH_REQUIRED,
      severity: "error",
    });
  });

  it("exempts system users from USER_AUTH_REQUIRED", () => {
    const user = createBlankUser("system-user");
    user.name = "svc";
    user.system = true;
    const issues = validateUsers(usersConfig([user]));
    expect(issues.some((issue) => issue.code === "USER_AUTH_REQUIRED")).toBe(
      false,
    );
  });

  it("exempts nologin users from USER_AUTH_REQUIRED", () => {
    const user = createBlankUser("nologin-user");
    user.name = "batch";
    user.shell = "/usr/sbin/nologin";
    const issues = validateUsers(usersConfig([user]));
    expect(issues.some((issue) => issue.code === "USER_AUTH_REQUIRED")).toBe(
      false,
    );
  });

  it("accepts a valid SSH key as sole authentication", () => {
    const user = createBlankUser("ssh-auth");
    user.name = "deploy";
    user.ssh_authorized_keys = [{ id: "row-1", value: SSH_KEY }];
    const issues = validateUsers(usersConfig([user]));
    expect(issues.some((issue) => issue.code === "USER_AUTH_REQUIRED")).toBe(
      false,
    );
  });

  it("preserves deterministic issue ordering by card and field", () => {
    const user = createBlankUser("order-user");
    user.name = "Deploy";
    user.passwd = "bad";
    user.ssh_authorized_keys = [{ id: "row-1", value: "bad-key" }];
    const issues = validateUsers(usersConfig([user]));
    expect(issues.map((issue) => issue.code)).toEqual([
      "USER_NAME_UPPERCASE",
      "USER_PASSWORD_HASH_INVALID",
      "USER_SSH_KEY_INVALID",
      "USER_AUTH_REQUIRED",
    ]);
  });
});
