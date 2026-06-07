import { describe, expect, it } from "vitest";
import {
  USER_KEY_ORDER,
  buildCloudInitUsers,
  mapBuilderUser,
} from "../../../src/generators/generateUsers.ts";
import type { BuilderUser, UsersConfig } from "../../../src/models/users.ts";
import {
  createBlankSshAuthorizedKey,
  createBlankUser,
} from "../../../src/models/users.ts";

const BCRYPT_HASH =
  "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const SSH_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";

function userWith(
  patch: Partial<BuilderUser>,
  id = "gen-user-1",
): BuilderUser {
  return { ...createBlankUser(id), ...patch };
}

describe("mapBuilderUser", () => {
  it("omits blank names and strips builder ids", () => {
    const user = userWith({ name: "  ", groups: ["docker"] });
    expect(mapBuilderUser(user)).toBeUndefined();
  });

  it("trims optional scalars and preserves group order without reordering", () => {
    const user = userWith({
      name: " deploy ",
      gecos: " Deploy User ",
      groups: [" wheel ", "docker", "docker"],
      shell: " /bin/bash ",
    });
    const mapped = mapBuilderUser(user);
    expect(mapped).toEqual({
      name: "deploy",
      gecos: "Deploy User",
      groups: ["wheel", "docker", "docker"],
      shell: "/bin/bash",
      lock_passwd: true,
    });
    expect(Object.keys(mapped!)).toEqual(
      USER_KEY_ORDER.filter((key) => key in mapped!),
    );
  });

  it("does not mutate the source user object", () => {
    const user = userWith({
      name: "deploy",
      groups: [" Alpha ", "Beta"],
      shell: " /custom/shell ",
    });
    const before = structuredClone(user);
    mapBuilderUser(user);
    expect(user).toEqual(before);
  });

  it("never emits builder-only fields", () => {
    const mapped = mapBuilderUser(
      userWith({ name: "deploy", groups: ["admins"] }),
    );
    expect(mapped).not.toHaveProperty("id");
    expect(Object.keys(mapped ?? {})).not.toContain("id");
  });

  it("emits passwd only for unlocked users with supported hashes", () => {
    const locked = mapBuilderUser(
      userWith({ name: "deploy", passwd: BCRYPT_HASH, lock_passwd: true }),
    );
    expect(locked).toMatchObject({
      name: "deploy",
      lock_passwd: true,
    });
    expect(locked).not.toHaveProperty("passwd");

    const unlocked = mapBuilderUser(
      userWith({ name: "deploy", passwd: BCRYPT_HASH, lock_passwd: false }),
    );
    expect(unlocked).toEqual({
      name: "deploy",
      shell: "/bin/bash",
      lock_passwd: false,
      passwd: BCRYPT_HASH,
    });
  });

  it("omits unsupported password material from YAML output", () => {
    const mapped = mapBuilderUser(
      userWith({
        name: "deploy",
        passwd: "hunter2",
        lock_passwd: false,
      }),
    );
    expect(mapped).toMatchObject({
      name: "deploy",
      lock_passwd: false,
    });
    expect(mapped).not.toHaveProperty("passwd");
  });

  it("maps nonblank SSH rows to ordered strings without builder IDs", () => {
    const mapped = mapBuilderUser(
      userWith({
        name: "deploy",
        ssh_authorized_keys: [
          createBlankSshAuthorizedKey("key-a"),
          { id: "key-b", value: SSH_KEY },
          { id: "key-c", value: "   " },
        ],
      }),
    );
    expect(mapped?.ssh_authorized_keys).toEqual([SSH_KEY]);
    expect(mapped).not.toHaveProperty("id");
    expect(JSON.stringify(mapped)).not.toContain("key-b");
  });
});

describe("buildCloudInitUsers", () => {
  it("emits default first, then custom users in insertion order", () => {
    const config: UsersConfig = {
      preserveDefault: true,
      entries: [
        userWith({ name: "second", groups: ["beta"] }, "u2"),
        userWith({ name: "first", groups: ["alpha"] }, "u1"),
      ],
    };
    const users = buildCloudInitUsers(config);
    expect(users).toEqual([
      "default",
      {
        name: "second",
        groups: ["beta"],
        shell: "/bin/bash",
        lock_passwd: true,
      },
      {
        name: "first",
        groups: ["alpha"],
        shell: "/bin/bash",
        lock_passwd: true,
      },
    ]);
  });

  it("keeps explicit users: [] when default is disabled and cards are blank", () => {
    const config: UsersConfig = {
      preserveDefault: false,
      entries: [createBlankUser("blank-only")],
    };
    expect(buildCloudInitUsers(config)).toEqual([]);
  });

  it.each([
    ["passwordless", "ALL=(ALL) NOPASSWD:ALL"],
    ["require-password", "ALL=(ALL) ALL"],
    ["custom-string", "deploy ALL=(ALL) NOPASSWD:/usr/bin/systemctl"],
    ["custom-array", ["deploy ALL=(ALL) ALL", null] as (string | null)[]],
    ["custom-null", null],
    ["custom-boolean", true],
  ])(
    "preserves exact sudo value (%s) through generation without input mutation",
    (_label, sudoValue) => {
      const user = userWith({
        name: "deploy",
        sudo: sudoValue as BuilderUser["sudo"],
      });
      const before = structuredClone(user);
      const mapped = mapBuilderUser(user);
      expect(user).toEqual(before);
      if (sudoValue === "ALL=(ALL) NOPASSWD:ALL" || sudoValue === "ALL=(ALL) ALL") {
        expect(mapped?.sudo).toBe(sudoValue);
        return;
      }
      expect(mapped?.sudo).toEqual(sudoValue);
    },
  );

  it("omits sudo for newly authored No sudo state", () => {
    const mapped = mapBuilderUser(userWith({ name: "deploy" }));
    expect(mapped).not.toHaveProperty("sudo");
  });

  it("emits no_create_home only when create home is unchecked", () => {
    const mapped = mapBuilderUser(
      userWith({ name: "service", no_create_home: true, homedir: "/srv/service" }),
    );
    expect(mapped).toEqual({
      name: "service",
      shell: "/bin/bash",
      lock_passwd: true,
      homedir: "/srv/service",
      no_create_home: true,
    });
  });

  it("omits contradictory home fields for system users while retaining order", () => {
    const mapped = mapBuilderUser(
      userWith({
        name: "daemon",
        primary_group: "daemon",
        homedir: "/var/lib/daemon",
        no_create_home: true,
        system: true,
        shell: "/usr/sbin/nologin",
      }),
    );
    expect(mapped).toEqual({
      name: "daemon",
      primary_group: "daemon",
      shell: "/usr/sbin/nologin",
      lock_passwd: true,
      system: true,
    });
    expect(Object.keys(mapped!)).toEqual(
      USER_KEY_ORDER.filter((key) => key in mapped!),
    );
  });

  it("re-emits retained homedir after system is cleared", () => {
    const user = userWith({
      name: "daemon",
      homedir: "/var/lib/daemon",
      system: true,
    });
    expect(mapBuilderUser(user)).not.toHaveProperty("homedir");

    const restored = { ...user, system: undefined };
    expect(mapBuilderUser(restored)).toMatchObject({
      homedir: "/var/lib/daemon",
      lock_passwd: true,
    });
  });

  it("preserves credential field order in generated user mappings", () => {
    const mapped = mapBuilderUser(
      userWith({
        name: "deploy",
        passwd: BCRYPT_HASH,
        lock_passwd: false,
        ssh_authorized_keys: [{ id: "key-a", value: SSH_KEY }],
      }),
    );
    expect(Object.keys(mapped!)).toEqual([
      "name",
      "shell",
      "lock_passwd",
      "passwd",
      "ssh_authorized_keys",
    ]);
  });

  it("preserves explicit lock_passwd false for locked users without passwd", () => {
    const mapped = mapBuilderUser(
      userWith({
        name: "deploy",
        lock_passwd: false,
      }),
    );
    expect(mapped).toMatchObject({
      name: "deploy",
      lock_passwd: false,
    });
    expect(mapped).not.toHaveProperty("passwd");
  });
});
