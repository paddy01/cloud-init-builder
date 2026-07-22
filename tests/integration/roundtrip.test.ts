import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../package.json";
import futureProjectV99 from "../fixtures/future-project-v99.cib.json?raw";
import invalidProjectBadMetadata from "../fixtures/invalid-project-bad-metadata.cib.json?raw";
import legacyProjectUsersArray from "../fixtures/legacy-project-users-array.cib.json?raw";
import validProjectIdentityFull from "../fixtures/valid-project-identity-full.cib.json?raw";
import validProjectCommandsFull from "../fixtures/valid-project-commands-full.cib.json?raw";
import validProjectNetworkingV2 from "../fixtures/valid-project-networking-v2.cib.json?raw";
import validProjectNetworkingAddressing from "../fixtures/valid-project-networking-addressing.cib.json?raw";
import validProjectUsersFull from "../fixtures/valid-project-users-full.cib.json?raw";
import validProjectWithExtras from "../fixtures/valid-project-with-extras.cib.json?raw";
import {
  CURRENT_FORMAT_VERSION,
  createDefaultProject,
} from "../../src/models/project.ts";
import { isCommandsConfig } from "../../src/models/commands.ts";
import { isUsersConfig } from "../../src/models/users.ts";
import { createBlankNetworkInterface } from "../../src/models/networking.ts";
import { generateCloudInit } from "../../src/generators/generateCloudInit.ts";
import {
  exportProject,
  importProject,
} from "../../src/services/projectService.ts";
import identityUsersCommandsFull from "../fixtures/identity-users-commands-full.yaml?raw";
import identityUsersSafetyValid from "../fixtures/identity-users-safety-valid.yaml?raw";
import usersSafetyValid from "../fixtures/users-safety-valid.yaml?raw";

const BCRYPT_HASH =
  "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const SSH_KEY_A =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
const SSH_KEY_B = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB deploy@host";
const LEGACY_SSH = "ssh-rsa AAAA...";

function fileFromJson(json: string, name = "roundtrip.cib.json"): File {
  return new File([json], name, { type: "application/json" });
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read Blob."));
    reader.readAsText(blob);
  });
}

describe("lossless round-trip", () => {
  it("preserves metadata across export and import", async () => {
    const project = createDefaultProject("Roundtrip Test");
    const json = JSON.stringify(project, null, 2);
    const result = await importProject(fileFromJson(json));

    expect(result.project.formatVersion).toBe(project.formatVersion);
    expect(result.project.metadata.name).toBe(project.metadata.name);
    expect(result.project.metadata.createdAt).toBe(project.metadata.createdAt);
    expect(result.project.metadata.updatedAt).toBe(project.metadata.updatedAt);
    expect(result.project.metadata.appVersion).toBe(project.metadata.appVersion);
  });
});

describe("networking project round-trip", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("preserves interface order, stable IDs, modes, and both drafts through two round trips", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectNetworkingV2,
        "valid-project-networking-v2.cib.json",
      ),
    );

    expect(firstImport.warnings).toEqual([]);
    expect(firstImport.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(firstImport.project.networking.interfaces).toEqual([
      {
        ...createBlankNetworkInterface("network-interface-uplink"),
        name: "uplink-\u00e9",
        macAddress: "52:54:00:12:34:56",
      },
      {
        ...createBlankNetworkInterface("network-interface-failover"),
        identityMode: "mac",
        name: "uplink-e\u0301",
        macAddress: "02:42:ac:11:00:02",
      },
    ]);

    const exportedOnce = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exportedOnce));
    const exportedTwice = JSON.stringify(secondImport.project, null, 2);
    const thirdImport = await importProject(fileFromJson(exportedTwice));

    expect(secondImport.warnings).toEqual([]);
    expect(thirdImport.warnings).toEqual([]);
    expect(secondImport.project).toEqual(firstImport.project);
    expect(thirdImport.project).toEqual(firstImport.project);
    expect(secondImport.project.networking.interfaces[0]?.name).toBe(
      "uplink-\u00e9",
    );
    expect(secondImport.project.networking.interfaces[1]?.name).toBe(
      "uplink-e\u0301",
    );
    expect(
      secondImport.project.networking.interfaces[0]?.name.normalize("NFD"),
    ).toBe(secondImport.project.networking.interfaces[1]?.name);
    expect(secondImport.project.networking.interfaces[0]?.name).not.toBe(
      secondImport.project.networking.interfaces[1]?.name,
    );
  });

  it("preserves rich addressing drafts and provenance through two round trips without lowering networking", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectNetworkingAddressing,
        "valid-project-networking-addressing.cib.json",
      ),
    );
    const expectedNetworking = JSON.parse(
      validProjectNetworkingAddressing,
    ).networking;

    expect(firstImport.warnings).toEqual([]);
    expect(firstImport.project.networking).toEqual(expectedNetworking);

    const secondImport = await importProject(
      fileFromJson(JSON.stringify(firstImport.project, null, 2)),
    );
    const thirdImport = await importProject(
      fileFromJson(JSON.stringify(secondImport.project, null, 2)),
    );

    expect(secondImport.warnings).toEqual([]);
    expect(thirdImport.warnings).toEqual([]);
    expect(secondImport.project).toEqual(firstImport.project);
    expect(thirdImport.project).toEqual(firstImport.project);
    expect(thirdImport.project.networking).toEqual(expectedNetworking);

    const generatorInput = {
      identity: thirdImport.project.identity,
      users: isUsersConfig(thirdImport.project.users)
        ? thirdImport.project.users
        : undefined,
      commands: isCommandsConfig(thirdImport.project.commands)
        ? thirdImport.project.commands
        : undefined,
    };
    const yamlWithNetworkingState = generateCloudInit(generatorInput).yaml;
    const yamlWithoutNetworkingState = generateCloudInit({
      identity: firstImport.project.identity,
      users: isUsersConfig(firstImport.project.users)
        ? firstImport.project.users
        : undefined,
      commands: isCommandsConfig(firstImport.project.commands)
        ? firstImport.project.commands
        : undefined,
    }).yaml;

    expect(yamlWithNetworkingState).toBe(yamlWithoutNetworkingState);
    expect(yamlWithNetworkingState).toBe("#cloud-config\nusers:\n  - default\n");
    expect(yamlWithNetworkingState).not.toMatch(/^network:/m);
    expect(yamlWithNetworkingState).not.toContain("isExampleValue");
    expect(yamlWithNetworkingState).not.toContain("exampleFields");
    expect(yamlWithNetworkingState).not.toContain("network-interface-rich");
  });

  it("keeps networking outside generated cloud-init YAML", async () => {
    const { project } = await importProject(
      fileFromJson(validProjectNetworkingV2),
    );
    const generatorInput = {
      identity: project.identity,
      users: isUsersConfig(project.users) ? project.users : undefined,
      commands: isCommandsConfig(project.commands)
        ? project.commands
        : undefined,
    };
    const yamlBefore = generateCloudInit(generatorInput).yaml;

    project.networking.interfaces.reverse();
    project.networking.interfaces[0]!.name = "changed-after-yaml";
    const yamlAfter = generateCloudInit(generatorInput).yaml;

    expect(yamlAfter).toBe(yamlBefore);
    expect(yamlAfter).not.toMatch(/^network:/m);
    expect(yamlAfter).not.toContain("network-interface-");
  });

  it("serializes an invocation-time snapshot without mutating live project state", async () => {
    const { project } = await importProject(
      fileFromJson(validProjectNetworkingV2),
    );
    const beforeSave = structuredClone(project);
    let capturedBlob: Blob | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:networking-roundtrip";
      }),
      revokeObjectURL: vi.fn(),
    });
    const anchor = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(
      anchor as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node,
    );

    expect(exportProject(project, project.metadata.name)).toBe(true);
    expect(project).toEqual(beforeSave);
    expect(capturedBlob).toBeInstanceOf(Blob);

    project.networking.interfaces[0]!.name = "live-edit-after-save";
    const savedProject = JSON.parse(
      await blobText(capturedBlob!),
    ) as typeof project;
    expect(savedProject).toEqual(beforeSave);
    expect(savedProject.networking.interfaces[0]?.name).toBe("uplink-\u00e9");
    expect(project.networking.interfaces[0]?.name).toBe("live-edit-after-save");
  });

  it("does not mutate project state when a download is interrupted", async () => {
    const { project } = await importProject(
      fileFromJson(validProjectNetworkingV2),
    );
    const beforeSave = structuredClone(project);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:interrupted"),
      revokeObjectURL: vi.fn(),
    });
    const anchor = {
      href: "",
      download: "",
      click: vi.fn(() => {
        throw new Error("download interrupted");
      }),
    };
    vi.spyOn(document, "createElement").mockReturnValue(
      anchor as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node,
    );

    expect(exportProject(project, project.metadata.name)).toBe(false);
    expect(project).toEqual(beforeSave);
  });
});

describe("normalizes imported metadata names", () => {
  it("cleans padded imported names across JSON round-trip", async () => {
    const padded = JSON.stringify({
      formatVersion: 1,
      metadata: {
        name: "  Demo Server  ",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: packageJson.version,
      },
    });

    const firstImport = await importProject(fileFromJson(padded, "padded.cib.json"));
    expect(firstImport.project.metadata.name).toBe("Demo Server");

    const exported = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported, "roundtrip.cib.json"));
    expect(secondImport.project.metadata.name).toBe("Demo Server");
    expect(secondImport.warnings).toEqual([]);
  });
});

describe("lossless pass-through of unknown keys", () => {
  it("preserves identity and users across single and double round-trip per D-11", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectWithExtras,
        "valid-project-with-extras.cib.json",
      ),
    );

    expect(firstImport.project.identity).toEqual({
      hostname: "web-server",
      fqdn: "web-server.example.com",
    });
    expect(isUsersConfig(firstImport.project.users)).toBe(true);
    if (!isUsersConfig(firstImport.project.users)) {
      throw new Error("expected canonical users");
    }
    expect(firstImport.project.users.preserveDefault).toBe(false);
    expect(firstImport.project.users.entries[0]).toMatchObject({
      name: "deploy",
      sudo: true,
    });

    const exported = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported));

    expect(secondImport.project.identity).toEqual({
      hostname: "web-server",
      fqdn: "web-server.example.com",
    });
    expect(secondImport.project.users).toEqual(firstImport.project.users);
  });

  it("preserves all advanced identity fields across round-trip per Pitfall 6", async () => {
    const result = await importProject(
      fileFromJson(
        validProjectIdentityFull,
        "valid-project-identity-full.cib.json",
      ),
    );

    expect(result.project.identity).toEqual({
      hostname: "web01",
      fqdn: "web01.lan.example.com",
      prefer_fqdn_over_hostname: true,
      manage_etc_hosts: "localhost",
      timezone: "Europe/Stockholm",
      locale: "en_US.UTF-8",
    });
    expect(result.warnings).toEqual([]);

    const exported = JSON.stringify(result.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported));

    expect(secondImport.project.identity).toEqual({
      hostname: "web01",
      fqdn: "web01.lan.example.com",
      prefer_fqdn_over_hostname: true,
      manage_etc_hosts: "localhost",
      timezone: "Europe/Stockholm",
      locale: "en_US.UTF-8",
    });
  });

  it("preserves identity and users through the lenient fallback path per D-11", async () => {
    const result = await importProject(
      fileFromJson(
        invalidProjectBadMetadata,
        "invalid-project-bad-metadata.cib.json",
      ),
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.project.identity).toEqual({
      hostname: "incomplete-host",
      fqdn: "incomplete-host.example.com",
    });
    expect(isUsersConfig(result.project.users)).toBe(true);
    if (!isUsersConfig(result.project.users)) {
      throw new Error("expected canonical users");
    }
    expect(result.project.users.entries[0]).toMatchObject({ name: "admin" });
  });
});

describe("version handling integration", () => {
  it("imports a project saved with formatVersion 1", async () => {
    const project = createDefaultProject("Version One");
    const result = await importProject(
      fileFromJson(JSON.stringify(project, null, 2)),
    );

    expect(result.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(result.warnings).toEqual([]);
  });

  it("migrates formatVersion 0 to CURRENT_FORMAT_VERSION", async () => {
    const legacy = {
      formatVersion: 0,
      metadata: {
        name: "Legacy Project",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.0.1",
      },
    };

    const result = await importProject(
      fileFromJson(JSON.stringify(legacy, null, 2), "legacy.cib.json"),
    );

    expect(result.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(result.project.metadata.name).toBe("Legacy Project");
  });

  it("rejects formatVersion 99", async () => {
    await expect(
      importProject(
        fileFromJson(futureProjectV99, "future-project-v99.cib.json"),
      ),
    ).rejects.toThrow(/format version 99.*supports up to/i);
  });
});

describe("users project round-trip", () => {
  it("preserves canonical full users through double round-trip", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectUsersFull,
        "valid-project-users-full.cib.json",
      ),
    );

    expect(firstImport.warnings).toEqual([]);
    expect(isUsersConfig(firstImport.project.users)).toBe(true);
    if (!isUsersConfig(firstImport.project.users)) {
      throw new Error("expected canonical users");
    }

    expect(firstImport.project.users).toEqual({
      preserveDefault: true,
      entries: [
        {
          id: "user-stable-deploy",
          name: "deploy",
          gecos: "Deploy User",
          groups: ["docker", "admins"],
          shell: "/usr/local/bin/fish",
          sudo: "ALL=(ALL) NOPASSWD:ALL",
          primary_group: "deploy",
          homedir: "/srv/deploy",
          lock_passwd: false,
          passwd: BCRYPT_HASH,
          ssh_authorized_keys: [
            { id: "key-deploy-a", value: SSH_KEY_A },
            { id: "key-deploy-b", value: SSH_KEY_B },
          ],
        },
        {
          id: "user-stable-ops",
          name: "ops",
          groups: ["wheel"],
          shell: "/bin/sh",
          sudo: "ALL=(ALL) ALL",
          no_create_home: true,
          primary_group: "ops",
          lock_passwd: true,
        },
      ],
    });
    expect(firstImport.project).toMatchObject({
      futureFeature: { enabled: true },
    });

    const exportedOnce = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exportedOnce));
    const exportedTwice = JSON.stringify(secondImport.project, null, 2);
    const thirdImport = await importProject(fileFromJson(exportedTwice));

    expect(secondImport.project.users).toEqual(firstImport.project.users);
    expect(thirdImport.project.users).toEqual(firstImport.project.users);
    expect(thirdImport.project).toMatchObject({
      futureFeature: { enabled: true },
    });
    expect(JSON.stringify(thirdImport.project)).not.toContain("plain_text_passwd");
    expect(JSON.stringify(thirdImport.project)).not.toContain("hunter2");
  });

  it("normalizes legacy user arrays with warnings and preserves editable SSH rows", async () => {
    const result = await importProject(
      fileFromJson(
        legacyProjectUsersArray,
        "legacy-project-users-array.cib.json",
      ),
    );

    const warningText = JSON.stringify(result.warnings);
    expect(warningText).toContain("plain_text_passwd");
    expect(warningText).not.toContain(
      "Unsupported user fields were omitted during import: ssh_authorized_keys",
    );
    expect(isUsersConfig(result.project.users)).toBe(true);
    if (!isUsersConfig(result.project.users)) {
      throw new Error("expected canonical users");
    }

    expect(result.project.users.preserveDefault).toBe(true);
    expect(result.project.users.entries).toHaveLength(2);

    const legacyEntry = result.project.users.entries[0];
    if (!legacyEntry) {
      throw new Error("expected legacy user entry");
    }
    expect(legacyEntry).toMatchObject({
      name: "legacy",
      gecos: "Legacy User",
      groups: ["adm"],
      shell: "/bin/bash",
      sudo: "ALL=(ALL) NOPASSWD:ALL",
      primary_group: "legacy",
      homedir: "/home/legacy",
      lock_passwd: true,
    });
    expect(legacyEntry).not.toHaveProperty("plain_text_passwd");
    expect(legacyEntry).not.toHaveProperty("passwd");
    expect(legacyEntry.ssh_authorized_keys).toHaveLength(1);
    expect(legacyEntry.ssh_authorized_keys?.[0]).toMatchObject({
      value: LEGACY_SSH,
    });
    expect(typeof legacyEntry.ssh_authorized_keys?.[0]?.id).toBe("string");

    expect(result.project.users.entries[1]).toMatchObject({
      name: "daemon",
      system: true,
      shell: "/usr/sbin/nologin",
      homedir: "/var/lib/daemon",
      lock_passwd: true,
    });

    const exported = JSON.stringify(result.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported));
    expect(secondImport.project.users).toEqual(result.project.users);
    expect(secondImport.warnings).toEqual([]);
    expect(JSON.stringify(secondImport.project)).not.toContain("plain_text_passwd");
  });

  it("generates users-safety-valid YAML without builder IDs after round-trip", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectUsersFull,
        "valid-project-users-full.cib.json",
      ),
    );

    const safetyProject = {
      users: isUsersConfig(firstImport.project.users)
        ? firstImport.project.users
        : undefined,
    };

    const yaml = generateCloudInit(safetyProject).yaml;
    expect(yaml).not.toContain("key-deploy-a");
    expect(yaml).not.toContain("user-stable-deploy");
    expect(yaml).not.toContain("plain_text_passwd");

    const exported = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported));
    const thirdImport = await importProject(
      fileFromJson(JSON.stringify(secondImport.project, null, 2)),
    );
    const roundTrippedYaml = generateCloudInit({
      users: isUsersConfig(thirdImport.project.users)
        ? thirdImport.project.users
        : undefined,
    }).yaml;

    expect(roundTrippedYaml).toBe(yaml);
    expect(thirdImport.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
  });

  it("preserves lock state, supported hash, stable SSH row IDs, and key order through double round-trip", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectUsersFull,
        "valid-project-users-full.cib.json",
      ),
    );

    expect(isUsersConfig(firstImport.project.users)).toBe(true);
    if (!isUsersConfig(firstImport.project.users)) {
      throw new Error("expected canonical users");
    }

    const deploy = firstImport.project.users.entries[0];
    const ops = firstImport.project.users.entries[1];
    expect(deploy?.lock_passwd).toBe(false);
    expect(deploy?.passwd).toBe(BCRYPT_HASH);
    expect(deploy?.ssh_authorized_keys?.map((row) => row.id)).toEqual([
      "key-deploy-a",
      "key-deploy-b",
    ]);
    expect(deploy?.ssh_authorized_keys?.map((row) => row.value)).toEqual([
      SSH_KEY_A,
      SSH_KEY_B,
    ]);
    expect(ops?.lock_passwd).toBe(true);
    expect(ops?.passwd).toBeUndefined();

    const exportedOnce = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exportedOnce));
    const exportedTwice = JSON.stringify(secondImport.project, null, 2);
    const thirdImport = await importProject(fileFromJson(exportedTwice));

    expect(thirdImport.project.users).toEqual(firstImport.project.users);
    expect(thirdImport.project).toMatchObject({
      futureFeature: { enabled: true },
    });
    expect(JSON.stringify(thirdImport.project)).not.toContain("plain_text_passwd");
    expect(JSON.stringify(thirdImport.project)).not.toContain("hunter2");
  });

  it("double round-trips safety fixtures without forbidden password material", async () => {
    const safetyProject = {
      formatVersion: 1,
      metadata: {
        name: "Safety Roundtrip",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
        appVersion: "0.1.0",
      },
      identity: {
        hostname: "web01",
        fqdn: "web01.lan.example.com",
        prefer_fqdn_over_hostname: true,
        manage_etc_hosts: "localhost" as const,
        timezone: "Europe/Stockholm",
        locale: "en_US.UTF-8",
      },
      users: {
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
      },
      futureFeature: { enabled: true },
    };

    const usersYaml = generateCloudInit({ users: safetyProject.users }).yaml;
    expect(usersYaml).toBe(usersSafetyValid);

    const combinedYaml = generateCloudInit({
      identity: safetyProject.identity,
      users: safetyProject.users,
    }).yaml;
    expect(combinedYaml).toBe(identityUsersSafetyValid);

    const firstImport = await importProject(
      fileFromJson(JSON.stringify(safetyProject, null, 2)),
    );
    const secondImport = await importProject(
      fileFromJson(JSON.stringify(firstImport.project, null, 2)),
    );
    const thirdImport = await importProject(
      fileFromJson(JSON.stringify(secondImport.project, null, 2)),
    );

    expect(thirdImport.project.users).toEqual(safetyProject.users);
    expect(thirdImport.project.identity).toEqual(safetyProject.identity);
    expect(thirdImport.project).toMatchObject({
      futureFeature: { enabled: true },
    });
    expect(thirdImport.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);

    const roundTrippedYaml = generateCloudInit({
      identity: thirdImport.project.identity,
      users: isUsersConfig(thirdImport.project.users)
        ? thirdImport.project.users
        : undefined,
    }).yaml;
    expect(roundTrippedYaml).toBe(identityUsersSafetyValid);
    expect(JSON.stringify(thirdImport.project)).not.toContain("plain_text_passwd");
  });
});

describe("Phase 3 dependency fence", () => {
  it("keeps package manifests free of new Phase 3 runtime dependencies", () => {
    expect(Object.keys(packageJson.dependencies).sort()).toEqual([
      "lucide-react",
      "react",
      "react-dom",
      "yaml",
      "zod",
      "zustand",
    ]);
  });
});

describe("commands project round-trip", () => {
  it("preserves canonical full commands through double round-trip", async () => {
    const firstImport = await importProject(
      fileFromJson(
        validProjectCommandsFull,
        "valid-project-commands-full.cib.json",
      ),
    );

    expect(firstImport.warnings).toEqual([]);
    expect(isCommandsConfig(firstImport.project.commands)).toBe(true);
    if (!isCommandsConfig(firstImport.project.commands)) {
      throw new Error("expected canonical commands");
    }

    expect(firstImport.project.commands).toEqual({
      bootcmd: [
        {
          id: "boot-shell",
          form: "shell",
          command: "mkdir -p /run/cloud-init-builder",
        },
        { id: "boot-argv", form: "argv", executable: "/bin/true", arguments: [] },
      ],
      runcmd: [
        { id: "run-shell", form: "shell", command: "apt-get update" },
        {
          id: "run-argv",
          form: "argv",
          executable: "touch",
          arguments: [{ id: "arg-1", value: "/run/foo" }],
        },
        { id: "run-meta", form: "shell", command: 'printf "|" "$HOME"' },
      ],
    });

    const exportedOnce = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exportedOnce));
    const exportedTwice = JSON.stringify(secondImport.project, null, 2);
    const thirdImport = await importProject(fileFromJson(exportedTwice));

    expect(secondImport.project.commands).toEqual(firstImport.project.commands);
    expect(thirdImport.project.commands).toEqual(firstImport.project.commands);
    expect(thirdImport.project.identity).toEqual(firstImport.project.identity);
    expect(thirdImport.project.users).toEqual(firstImport.project.users);
    expect(thirdImport.project.formatVersion).toBe(CURRENT_FORMAT_VERSION);

    const yaml = generateCloudInit({
      identity: thirdImport.project.identity,
      users: isUsersConfig(thirdImport.project.users)
        ? thirdImport.project.users
        : undefined,
      commands: isCommandsConfig(thirdImport.project.commands)
        ? thirdImport.project.commands
        : undefined,
    }).yaml;
    expect(yaml).toBe(identityUsersCommandsFull);
    expect(yaml).not.toContain("boot-shell");
    expect(yaml).not.toContain("run-meta");
    expect(yaml).not.toContain("full-1");
    expect(yaml).not.toContain("arg-1");
  });

  it("keeps YAML section order identity, users, bootcmd, runcmd", async () => {
    const result = await importProject(
      fileFromJson(
        validProjectCommandsFull,
        "valid-project-commands-full.cib.json",
      ),
    );
    const yaml = generateCloudInit({
      identity: result.project.identity,
      users: isUsersConfig(result.project.users)
        ? result.project.users
        : undefined,
      commands: isCommandsConfig(result.project.commands)
        ? result.project.commands
        : undefined,
    }).yaml;

    const body = yaml.slice("#cloud-config\n".length);
    const keys = body
      .trim()
      .split("\n")
      .filter((line) => !line.startsWith(" ") && line.includes(":"))
      .map((line) => line.split(":")[0]);

    expect(keys).toEqual([
      "hostname",
      "fqdn",
      "prefer_fqdn_over_hostname",
      "manage_etc_hosts",
      "timezone",
      "locale",
      "users",
      "bootcmd",
      "runcmd",
    ]);
  });
});

describe("Phase 4 dependency and format fence", () => {
  it("keeps package manifests free of new Phase 4 runtime dependencies", () => {
    expect(Object.keys(packageJson.dependencies).sort()).toEqual([
      "lucide-react",
      "react",
      "react-dom",
      "yaml",
      "zod",
      "zustand",
    ]);
  });

  it("keeps the builder format-version fence explicit", () => {
    expect(CURRENT_FORMAT_VERSION).toBe(2);
  });
});

describe("Phase 5 final verification", () => {
  it("keeps package manifests free of new Phase 5 runtime dependencies", () => {
    expect(Object.keys(packageJson.dependencies).sort()).toEqual([
      "lucide-react",
      "react",
      "react-dom",
      "yaml",
      "zod",
      "zustand",
    ]);
  });
});
