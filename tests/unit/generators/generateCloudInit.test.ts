import { describe, expect, it } from "vitest";
import identityEmptyAdvanced from "../../fixtures/identity-empty-advanced.yaml?raw";
import identityFull from "../../fixtures/identity-full.yaml?raw";
import identityMinimal from "../../fixtures/identity-minimal.yaml?raw";
import identityUsersSafetyValid from "../../fixtures/identity-users-safety-valid.yaml?raw";
import usersSafetyValid from "../../fixtures/users-safety-valid.yaml?raw";
import {
  CLOUD_CONFIG_HEADER,
  CLOUD_CONFIG_ORDER,
  generateCloudInit,
} from "../../../src/generators/generateCloudInit.ts";
import type { UsersConfig } from "../../../src/models/users.ts";

const BCRYPT_HASH =
  "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const SSH_KEY_A =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
const SSH_KEY_B = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB deploy@host";

const SAFETY_IDENTITY = {
  hostname: "web01",
  fqdn: "web01.lan.example.com",
  prefer_fqdn_over_hostname: true,
  manage_etc_hosts: "localhost" as const,
  timezone: "Europe/Stockholm",
  locale: "en_US.UTF-8",
};

const SAFETY_USERS_CONFIG: UsersConfig = {
  preserveDefault: true,
  entries: [
    {
      id: "user-unlocked",
      name: "deploy",
      shell: "/bin/bash",
      lock_passwd: false,
      passwd: BCRYPT_HASH,
      ssh_authorized_keys: [
        { id: "key-a", value: SSH_KEY_A },
        { id: "key-b", value: SSH_KEY_B },
      ],
    },
    {
      id: "user-locked",
      name: "ops",
      shell: "/bin/bash",
      lock_passwd: true,
      ssh_authorized_keys: [{ id: "key-c", value: SSH_KEY_A }],
    },
  ],
};

describe("generateCloudInit", () => {
  it("matches identity-minimal golden fixture", () => {
    const result = generateCloudInit({ identity: { hostname: "web01" } });
    expect(result.yaml).toBe(identityMinimal);
  });

  it("matches identity-full golden fixture", () => {
    const result = generateCloudInit({
      identity: {
        hostname: "web01",
        fqdn: "web01.lan.example.com",
        prefer_fqdn_over_hostname: true,
        manage_etc_hosts: "localhost",
        timezone: "Europe/Stockholm",
        locale: "en_US.UTF-8",
      },
    });
    expect(result.yaml).toBe(identityFull);
  });

  it("matches identity-empty-advanced golden fixture", () => {
    const result = generateCloudInit({
      identity: {
        hostname: "web01",
        fqdn: "web01.lan.example.com",
        prefer_fqdn_over_hostname: undefined,
        manage_etc_hosts: undefined,
        timezone: "",
        locale: undefined,
      },
    });
    expect(result.yaml).toBe(identityEmptyAdvanced);
  });

  it("returns header-only output when identity is undefined", () => {
    expect(generateCloudInit({}).yaml).toBe(CLOUD_CONFIG_HEADER);
    expect(generateCloudInit({ identity: undefined }).yaml).toBe(
      CLOUD_CONFIG_HEADER,
    );
  });

  it("returns header-only output for empty identity object", () => {
    expect(generateCloudInit({ identity: {} }).yaml).toBe(CLOUD_CONFIG_HEADER);
  });

  it("returns header-only output when hostname is undefined", () => {
    expect(generateCloudInit({ identity: { hostname: undefined } }).yaml).toBe(
      CLOUD_CONFIG_HEADER,
    );
  });

  it("returns header-only output when only optional fields are empty", () => {
    expect(
      generateCloudInit({
        identity: { fqdn: "", timezone: undefined, locale: "" },
      }).yaml,
    ).toBe(CLOUD_CONFIG_HEADER);
  });

  it("preserves manage_etc_hosts: false", () => {
    const result = generateCloudInit({
      identity: { manage_etc_hosts: false },
    });
    expect(result.yaml).toBe(
      `${CLOUD_CONFIG_HEADER}manage_etc_hosts: false\n`,
    );
  });

  it("orders keys per CLOUD_CONFIG_ORDER regardless of input order", () => {
    const result = generateCloudInit({
      identity: {
        locale: "en_US.UTF-8",
        hostname: "web01",
        timezone: "Europe/Stockholm",
        fqdn: "web01.lan.example.com",
        manage_etc_hosts: true,
        prefer_fqdn_over_hostname: false,
      },
    });
    const body = result.yaml.slice(CLOUD_CONFIG_HEADER.length);
    const keys = body
      .trim()
      .split("\n")
      .map((line) => line.split(":")[0]);
    expect(keys).toEqual(
      [...CLOUD_CONFIG_ORDER].filter((key) => key !== "users"),
    );
  });

  it("ends with exactly one trailing newline", () => {
    const result = generateCloudInit({ identity: { hostname: "web01" } });
    expect(result.yaml.endsWith("\n")).toBe(true);
    expect(result.yaml.endsWith("\n\n")).toBe(false);
  });

  it("suppresses header when includeHeader is false", () => {
    const result = generateCloudInit(
      { identity: { hostname: "web01" } },
      { includeHeader: false },
    );
    expect(result.yaml).toBe("hostname: web01\n");
    expect(result.yaml.startsWith("#cloud-config")).toBe(false);
  });

  it("returns empty errors and warnings arrays", () => {
    const result = generateCloudInit({ identity: { hostname: "web01" } });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("never emits empty mapping, null, or identity wrapper", () => {
    const cases = [
      {},
      { identity: undefined },
      { identity: {} },
      { identity: { hostname: undefined } },
      { identity: { fqdn: "", timezone: undefined, locale: "" } },
      { identity: { hostname: "web01" } },
      { identity: { manage_etc_hosts: false } },
    ];
    for (const project of cases) {
      const { yaml } = generateCloudInit(project);
      expect(yaml).not.toContain("{}");
      expect(yaml).not.toContain("null");
      expect(yaml).not.toContain("identity:");
    }
  });

  it("matches users-safety-valid golden fixture byte-for-byte", () => {
    const result = generateCloudInit({ users: SAFETY_USERS_CONFIG });
    expect(result.yaml).toBe(usersSafetyValid);
    expect(result.yaml.endsWith("\n")).toBe(true);
    expect(result.yaml).not.toContain("key-a");
    expect(result.yaml).not.toContain("key-b");
    expect(result.yaml).not.toContain("key-c");
    expect(result.yaml).not.toMatch(/\r/);
  });

  it("matches identity-users-safety-valid golden fixture byte-for-byte", () => {
    const result = generateCloudInit({
      identity: SAFETY_IDENTITY,
      users: SAFETY_USERS_CONFIG,
    });
    expect(result.yaml).toBe(identityUsersSafetyValid);
    expect(result.yaml.endsWith("\n")).toBe(true);
    expect(result.yaml.endsWith("\n\n")).toBe(false);
    expect(result.yaml).not.toContain("key-a");
    expect(result.yaml).not.toContain("user-unlocked");
    expect(result.yaml).not.toMatch(/\r/);
  });
});
