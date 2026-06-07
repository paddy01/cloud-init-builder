import { describe, expect, it } from "vitest";
import {
  SUPPORTED_PASSWORD_HASH_PREFIXES,
  isSupportedPasswordHash,
} from "../../../src/validators/passwordHash.ts";

const SHA512_HASH =
  "$6$rounds=5000$somesalt$JE8633wNOuGQ0Nr6YpvNR5shWgI3A0T.UrBxMhUaNJW4n5FZn1eX2g09dZ3gB1lZg2y0NnQlD3za5FyCzrE7mA";

const SHA256_HASH =
  "$5$rounds=1000$somesalt$EbZvZxqdMp7KjMWtU8ywxN9jF3kFZP8uLxE9yR2vS3t";

const BCRYPT_HASH =
  "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

describe("SUPPORTED_PASSWORD_HASH_PREFIXES", () => {
  it("lists the three approved modular-crypt prefixes", () => {
    expect(SUPPORTED_PASSWORD_HASH_PREFIXES).toEqual(["$6$", "$5$", "$2y$"]);
  });
});

describe("isSupportedPasswordHash", () => {
  it.each([
    ["$6$ SHA-512", SHA512_HASH],
    ["$5$ SHA-256", SHA256_HASH],
    ["$2y$ bcrypt", BCRYPT_HASH],
  ])("accepts a complete supported %s hash", (_label, hash) => {
    expect(isSupportedPasswordHash(hash)).toBe(true);
  });

  it("rejects prefix-only placeholders", () => {
    expect(isSupportedPasswordHash("$6$...")).toBe(false);
    expect(isSupportedPasswordHash("$5$")).toBe(false);
    expect(isSupportedPasswordHash("$2y$10$")).toBe(false);
  });

  it("rejects plaintext-looking values", () => {
    expect(isSupportedPasswordHash("hunter2")).toBe(false);
    expect(isSupportedPasswordHash("password123")).toBe(false);
  });

  it("rejects unsupported modular-crypt prefixes", () => {
    expect(isSupportedPasswordHash("$1$salt$hashvalue")).toBe(false);
    expect(
      isSupportedPasswordHash(
        "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      ),
    ).toBe(false);
  });

  it("rejects malformed SHA checksum lengths", () => {
    expect(isSupportedPasswordHash("$6$salt$tooshort")).toBe(false);
    expect(isSupportedPasswordHash("$5$salt$tooshort")).toBe(false);
  });

  it("rejects bcrypt costs outside 04-31", () => {
    expect(
      isSupportedPasswordHash(
        "$2y$03$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      ),
    ).toBe(false);
    expect(
      isSupportedPasswordHash(
        "$2y$32$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      ),
    ).toBe(false);
  });

  it("rejects bcrypt payloads with invalid characters or length", () => {
    expect(
      isSupportedPasswordHash(
        "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhW",
      ),
    ).toBe(false);
    expect(
      isSupportedPasswordHash(
        "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy!",
      ),
    ).toBe(false);
  });
});
