const TZ_PATTERN = /^[A-Z][A-Za-z0-9_+-]+(?:\/[A-Z][A-Za-z0-9_+-]+)*$/;

export function isValidTimezone(input: string): boolean {
  if (!TZ_PATTERN.test(input)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: input });
    return true;
  } catch {
    return false;
  }
}
