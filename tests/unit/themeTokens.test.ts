import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesPath = resolve(process.cwd(), "src/assets/styles.css");
const requiredProperties = [
  "--ui-canvas",
  "--ui-raised",
  "--ui-inset",
  "--ui-border",
  "--ui-text",
  "--ui-muted-text",
  "--ui-action",
  "--ui-action-hover",
  "--ui-action-contrast",
  "--ui-selected-fill",
  "--ui-selected-border",
  "--ui-selected-text",
  "--ui-disabled-fill",
  "--ui-disabled-border",
  "--ui-disabled-text",
  "--ui-error-surface",
  "--ui-error-border",
  "--ui-error-text",
  "--ui-warning-surface",
  "--ui-warning-border",
  "--ui-warning-text",
  "--ui-focus",
  "--ui-focus-offset-canvas",
  "--ui-focus-offset-raised",
  "--ui-focus-offset-inset",
  "--ui-focus-offset-selected",
  "--ui-focus-offset-error",
  "--ui-focus-offset-warning",
  "--ui-focus-offset-terminal",
  "--ui-overlay",
  "--ui-terminal-background",
  "--ui-terminal-border",
  "--ui-terminal-text",
] as const;

type ThemeTokens = Record<(typeof requiredProperties)[number], string>;

function parseThemeTokens(css: string, theme: "light" | "dark"): ThemeTokens {
  const selector = `html[data-theme="${theme}"]`;
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g");
  const matches = [...withoutComments.matchAll(rule)];
  expect(matches).toHaveLength(1);

  const declarations = new Map<string, string[]>();
  for (const declaration of matches[0][1].split(";")) {
    const [property, ...value] = declaration.split(":");
    if (!property || value.length === 0) continue;
    const name = property.trim();
    if (!requiredProperties.includes(name as (typeof requiredProperties)[number])) continue;
    declarations.set(name, [...(declarations.get(name) ?? []), value.join(":").trim()]);
  }

  return Object.fromEntries(requiredProperties.map((property) => {
    const values = declarations.get(property) ?? [];
    expect(values, `${theme} must declare ${property} exactly once`).toHaveLength(1);
    return [property, values[0]];
  })) as ThemeTokens;
}

function resolveToken(tokens: ThemeTokens, token: keyof ThemeTokens): string {
  const value = tokens[token];
  const reference = value.match(/^var\((--ui-[^)]+)\)$/)?.[1] as keyof ThemeTokens | undefined;
  return reference ? resolveToken(tokens, reference) : value;
}

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((part) => Number.parseInt(part, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Expected a hex color, received ${hex}`);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("semantic theme tokens", () => {
  it("declares contrast-safe canonical roles for each resolved theme", async () => {
    const css = await readFile(stylesPath, "utf8");
    const light = parseThemeTokens(css, "light");
    const dark = parseThemeTokens(css, "dark");

    expect(resolveToken(light, "--ui-focus")).toBe("#2563EB");
    expect(resolveToken(dark, "--ui-focus")).toBe("#60A5FA");

    for (const tokens of [light, dark]) {
      for (const [text, surface] of [
        ["--ui-text", "--ui-canvas"],
        ["--ui-muted-text", "--ui-raised"],
        ["--ui-selected-text", "--ui-selected-fill"],
        ["--ui-disabled-text", "--ui-disabled-fill"],
        ["--ui-error-text", "--ui-error-surface"],
        ["--ui-warning-text", "--ui-warning-surface"],
        ["--ui-terminal-text", "--ui-terminal-background"],
      ] as const) {
        expect(contrast(resolveToken(tokens, text), resolveToken(tokens, surface))).toBeGreaterThanOrEqual(4.5);
      }

      expect(contrast(resolveToken(tokens, "--ui-selected-border"), resolveToken(tokens, "--ui-selected-fill"))).toBeGreaterThanOrEqual(3);
      for (const surface of [
        "--ui-focus-offset-canvas",
        "--ui-focus-offset-raised",
        "--ui-focus-offset-inset",
        "--ui-focus-offset-selected",
        "--ui-focus-offset-error",
        "--ui-focus-offset-warning",
        "--ui-focus-offset-terminal",
      ] as const) {
        expect(contrast(resolveToken(tokens, "--ui-focus"), resolveToken(tokens, surface))).toBeGreaterThanOrEqual(3);
      }
    }

    for (const token of ["--ui-terminal-background", "--ui-terminal-border", "--ui-terminal-text"] as const) {
      expect(resolveToken(light, token)).toBe(resolveToken(dark, token));
    }
  });
});
