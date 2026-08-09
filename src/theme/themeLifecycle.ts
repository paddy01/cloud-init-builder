import {
  type ResolvedTheme,
  type ThemePreference,
  useThemeStore,
} from "./themeStore.ts";

export const THEME_STORAGE_KEY = "cloud-init-builder.theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export interface ThemeResolution {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

function isExplicitThemePreference(value: unknown): value is Exclude<ThemePreference, "system"> {
  return value === "light" || value === "dark";
}

export function resolveTheme(storedPreference: unknown, systemIsDark: boolean): ThemeResolution {
  if (isExplicitThemePreference(storedPreference)) {
    return { preference: storedPreference, resolvedTheme: storedPreference };
  }

  return {
    preference: "system",
    resolvedTheme: systemIsDark ? "dark" : "light",
  };
}

export function applyResolvedTheme(root: HTMLElement, resolvedTheme: ResolvedTheme): void {
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}

function readStoredPreference(): unknown {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return undefined;
  }
}

function readSystemIsDark(): boolean {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia(THEME_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

export function initializeThemeLifecycle(): ThemeResolution {
  const resolution = resolveTheme(readStoredPreference(), readSystemIsDark());
  applyResolvedTheme(document.documentElement, resolution.resolvedTheme);
  useThemeStore.setState(resolution);
  return resolution;
}

export function disposeThemeLifecycle(): void {
  // Listener and timer cleanup is added with the live System lifecycle expansion.
}
