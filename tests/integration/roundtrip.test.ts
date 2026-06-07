import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import futureProjectV99 from "../fixtures/future-project-v99.cib.json?raw";
import invalidProjectBadMetadata from "../fixtures/invalid-project-bad-metadata.cib.json?raw";
import legacyProjectUsersArray from "../fixtures/legacy-project-users-array.cib.json?raw";
import validProjectIdentityFull from "../fixtures/valid-project-identity-full.cib.json?raw";
import validProjectUsersFull from "../fixtures/valid-project-users-full.cib.json?raw";
import validProjectWithExtras from "../fixtures/valid-project-with-extras.cib.json?raw";
import {
  CURRENT_FORMAT_VERSION,
  createDefaultProject,
} from "../../src/models/project.ts";
import { isUsersConfig } from "../../src/models/users.ts";
import { importProject } from "../../src/services/projectService.ts";

function fileFromJson(json: string, name = "roundtrip.cib.json"): File {
  return new File([json], name, { type: "application/json" });
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

    expect(result.project.formatVersion).toBe(1);
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
        },
        {
          id: "user-stable-ops",
          name: "ops",
          groups: ["wheel"],
          shell: "/bin/sh",
          sudo: "ALL=(ALL) ALL",
          no_create_home: true,
          primary_group: "ops",
        },
      ],
    });

    const exportedOnce = JSON.stringify(firstImport.project, null, 2);
    const secondImport = await importProject(fileFromJson(exportedOnce));
    const exportedTwice = JSON.stringify(secondImport.project, null, 2);
    const thirdImport = await importProject(fileFromJson(exportedTwice));

    expect(secondImport.project.users).toEqual(firstImport.project.users);
    expect(thirdImport.project.users).toEqual(firstImport.project.users);
  });

  it("normalizes legacy user arrays with warnings and preserves supported fields", async () => {
    const result = await importProject(
      fileFromJson(
        legacyProjectUsersArray,
        "legacy-project-users-array.cib.json",
      ),
    );

    const warningText = JSON.stringify(result.warnings);
    expect(warningText).toContain("plain_text_passwd");
    expect(warningText).toContain("ssh_authorized_keys");
    expect(isUsersConfig(result.project.users)).toBe(true);
    if (!isUsersConfig(result.project.users)) {
      throw new Error("expected canonical users");
    }

    expect(result.project.users.preserveDefault).toBe(true);
    expect(result.project.users.entries).toHaveLength(2);
    expect(result.project.users.entries[0]).toMatchObject({
      name: "legacy",
      gecos: "Legacy User",
      groups: ["adm"],
      shell: "/bin/bash",
      sudo: "ALL=(ALL) NOPASSWD:ALL",
      primary_group: "legacy",
      homedir: "/home/legacy",
    });
    expect(result.project.users.entries[0]).not.toHaveProperty(
      "plain_text_passwd",
    );
    expect(result.project.users.entries[0]).not.toHaveProperty(
      "ssh_authorized_keys",
    );
    expect(result.project.users.entries[1]).toMatchObject({
      name: "daemon",
      system: true,
      shell: "/usr/sbin/nologin",
      homedir: "/var/lib/daemon",
    });

    const exported = JSON.stringify(result.project, null, 2);
    const secondImport = await importProject(fileFromJson(exported));
    expect(secondImport.project.users).toEqual(result.project.users);
    expect(secondImport.warnings).toEqual([]);
  });
});

describe("Phase 3 dependency fence", () => {
  it("keeps package manifests free of new Phase 3 runtime dependencies", () => {
    expect(Object.keys(packageJson.dependencies).sort()).toEqual([
      "react",
      "react-dom",
      "yaml",
      "zod",
      "zustand",
    ]);
  });
});
