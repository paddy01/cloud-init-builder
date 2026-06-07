import { describe, expect, it } from "vitest";
import {
  USER_KEY_ORDER,
  buildCloudInitUsers,
  mapBuilderUser,
} from "../../../src/generators/generateUsers.ts";
import type { BuilderUser, UsersConfig } from "../../../src/models/users.ts";
import { createBlankUser } from "../../../src/models/users.ts";

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
      },
      {
        name: "first",
        groups: ["alpha"],
        shell: "/bin/bash",
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
    });
  });
});
