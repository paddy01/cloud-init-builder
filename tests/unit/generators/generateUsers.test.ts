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
});
