export function orderKeys<T extends Record<string, unknown>>(
  obj: T,
  order: readonly string[],
): T {
  const out: Record<string, unknown> = {};
  for (const key of order) {
    if (key in obj) out[key] = obj[key];
  }
  for (const key of Object.keys(obj)) {
    if (!(key in out)) out[key] = obj[key];
  }
  return out as T;
}
