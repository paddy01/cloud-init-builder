export const SUPPORTED_PASSWORD_HASH_PREFIXES = ["$6$", "$5$", "$2y$"] as const;

const SHA_CRYPT_RE =
  /^\$(5|6)\$(?:rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]+$/;

const BCRYPT_2Y_RE =
  /^\$2y\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

const SHA_CHECKSUM_LENGTH: Record<string, number> = {
  "5": 43,
  "6": 86,
};

function isValidShaCrypt(value: string): boolean {
  if (!SHA_CRYPT_RE.test(value)) {
    return false;
  }

  const algorithm = value.startsWith("$6$") ? "6" : "5";
  const checksum = value.slice(value.lastIndexOf("$") + 1);
  return checksum.length === SHA_CHECKSUM_LENGTH[algorithm];
}

export function isSupportedPasswordHash(value: string): boolean {
  if (BCRYPT_2Y_RE.test(value)) {
    return true;
  }

  return isValidShaCrypt(value);
}
