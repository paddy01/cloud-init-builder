const LABEL_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function isValidHostname(input: string): boolean {
  return LABEL_REGEX.test(input);
}

export function isValidFqdn(input: string): boolean {
  if (input.length === 0 || input.length > 253) return false;
  if (input.endsWith(".")) return false;
  const labels = input.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) => LABEL_REGEX.test(label));
}
