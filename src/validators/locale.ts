const LOCALE_REGEX =
  /^[a-z]{2,3}(?:_[A-Z]{2})?(?:\.[A-Za-z0-9-]+)?(?:@[A-Za-z0-9]+)?$/;

export function isValidLocale(input: string): boolean {
  return LOCALE_REGEX.test(input);
}
