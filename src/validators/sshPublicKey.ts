export const SUPPORTED_SSH_KEY_TYPES = [
  "ssh-ed25519",
  "ssh-rsa",
  "ecdsa-sha2-nistp256",
  "ecdsa-sha2-nistp384",
  "ecdsa-sha2-nistp521",
  "sk-ssh-ed25519@openssh.com",
  "sk-ecdsa-sha2-nistp256@openssh.com",
] as const;

export type SupportedSshKeyType = (typeof SUPPORTED_SSH_KEY_TYPES)[number];

export interface ParsedSshPublicKey {
  type: SupportedSshKeyType;
  payload: string;
  comment?: string;
  identity: string;
}

const SUPPORTED_TYPE_SET = new Set<string>(SUPPORTED_SSH_KEY_TYPES);

function normalizeBase64Payload(payload: string): string | undefined {
  const trimmed = payload.trim();
  if (trimmed === "") {
    return undefined;
  }

  const withoutPadding = trimmed.replace(/=+$/, "");
  const paddingLength = (4 - (withoutPadding.length % 4)) % 4;
  const padded = withoutPadding + "=".repeat(paddingLength);

  try {
    const decoded = atob(padded);
    if (decoded.length === 0) {
      return undefined;
    }
    return withoutPadding;
  } catch {
    return undefined;
  }
}

function isSupportedType(type: string): type is SupportedSshKeyType {
  return SUPPORTED_TYPE_SET.has(type);
}

export function parseSshPublicKey(
  value: string,
): ParsedSshPublicKey | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return undefined;
  }

  const type = parts[0];
  const payload = parts[1];
  const commentParts = parts.slice(2);
  if (type === undefined || payload === undefined || !isSupportedType(type)) {
    return undefined;
  }

  const normalizedPayload = normalizeBase64Payload(payload);
  if (!normalizedPayload) {
    return undefined;
  }

  const comment =
    commentParts.length > 0 ? commentParts.join(" ") : undefined;

  return {
    type,
    payload,
    comment,
    identity: `${type} ${normalizedPayload}`,
  };
}
