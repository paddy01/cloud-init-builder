import { describe, expect, it } from "vitest";
import {
  SUPPORTED_SSH_KEY_TYPES,
  parseSshPublicKey,
} from "../../../src/validators/sshPublicKey.ts";

const ED25519_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";

describe("SUPPORTED_SSH_KEY_TYPES", () => {
  it("lists the seven approved SSH key types", () => {
    expect(SUPPORTED_SSH_KEY_TYPES).toEqual([
      "ssh-ed25519",
      "ssh-rsa",
      "ecdsa-sha2-nistp256",
      "ecdsa-sha2-nistp384",
      "ecdsa-sha2-nistp521",
      "sk-ssh-ed25519@openssh.com",
      "sk-ecdsa-sha2-nistp256@openssh.com",
    ]);
  });
});

describe("parseSshPublicKey", () => {
  it.each([
    "ssh-ed25519",
    "ssh-rsa",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "sk-ssh-ed25519@openssh.com",
    "sk-ecdsa-sha2-nistp256@openssh.com",
  ])("parses supported type %s with a decodable payload", (type) => {
    const value = `${type} AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z comment`;
    const parsed = parseSshPublicKey(value);
    expect(parsed?.type).toBe(type);
    expect(parsed?.comment).toBe("comment");
    expect(parsed?.identity).toBe(
      `${type} AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z`,
    );
  });

  it("accepts keys without a trailing comment", () => {
    const parsed = parseSshPublicKey(
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z",
    );
    expect(parsed?.type).toBe("ssh-ed25519");
    expect(parsed?.comment).toBeUndefined();
  });

  it("normalizes duplicate identity across padded and unpadded payloads", () => {
    const unpadded = parseSshPublicKey(ED25519_KEY);
    const padded = parseSshPublicKey(
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z= deploy@host",
    );
    expect(unpadded?.identity).toBe(padded?.identity);
  });

  it("rejects unsupported key types", () => {
    expect(
      parseSshPublicKey("ssh-dss AAAAB3NzaC1kc3MAAACBAL deploy@host"),
    ).toBeUndefined();
  });

  it("rejects invalid base64 payloads", () => {
    expect(parseSshPublicKey("ssh-ed25519 not!!!valid!!! deploy@host")).toBe(
      undefined,
    );
  });

  it("rejects empty decoded payloads", () => {
    expect(parseSshPublicKey("ssh-ed25519")).toBeUndefined();
    expect(parseSshPublicKey("ssh-ed25519    ")).toBeUndefined();
  });

  it("rejects blank input", () => {
    expect(parseSshPublicKey("")).toBeUndefined();
    expect(parseSshPublicKey("   ")).toBeUndefined();
  });
});
