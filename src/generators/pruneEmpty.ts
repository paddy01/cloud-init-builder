type Json = string | number | boolean | null | undefined | Json[] | { [k: string]: Json };

export function pruneEmpty<T extends Json>(value: T): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value === "" ? undefined : value;
  if (Array.isArray(value)) {
    const out = value.map(pruneEmpty).filter((v) => v !== undefined);
    return (out.length === 0 ? undefined : out) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value)) {
      const pruned = pruneEmpty(v as Json);
      if (pruned !== undefined) out[k] = pruned;
    }
    return (Object.keys(out).length === 0 ? undefined : out) as T;
  }
  return value;
}
