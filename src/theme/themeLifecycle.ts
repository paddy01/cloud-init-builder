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

let activeMediaQuery: MediaQueryList | undefined;
let activeMediaListener: ((event: MediaQueryListEvent) => void) | undefined;
let transitionEnableTimer: ReturnType<typeof setTimeout> | undefined;
let warningClearTimer: ReturnType<typeof setTimeout> | undefined;

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

function getMediaQuery(): MediaQueryList | undefined {
  try {
    return typeof window.matchMedia === "function"
      ? window.matchMedia(THEME_MEDIA_QUERY)
      : undefined;
  } catch {
    return undefined;
  }
}

function stopSystemListener(): void {
  if (activeMediaQuery && activeMediaListener) {
    try {
      activeMediaQuery.removeEventListener("change", activeMediaListener);
    } catch {
      // Browser media-query failures must not disrupt the application.
    }
  }
  activeMediaQuery = undefined;
  activeMediaListener = undefined;
}

function applySessionTheme(resolution: ThemeResolution): void {
  applyResolvedTheme(document.documentElement, resolution.resolvedTheme);
  useThemeStore.setState(resolution);
}

function supportsThemeTransitions(): boolean {
  try {
    return typeof window.matchMedia === "function"
      ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  } catch {
    return false;
  }
}

function scheduleTransitionEnablement(): void {
  if (transitionEnableTimer !== undefined || !supportsThemeTransitions()) return;

  transitionEnableTimer = setTimeout(() => {
    transitionEnableTimer = undefined;
    document.documentElement.dataset.themeTransitions = "enabled";
  }, 0);
}

function startSystemListener(mediaQuery = getMediaQuery()): void {
  stopSystemListener();
  if (!mediaQuery) return;

  const listener = (event: MediaQueryListEvent) => {
    if (useThemeStore.getState().preference !== "system") return;
    applySessionTheme({
      preference: "system",
      resolvedTheme: event.matches ? "dark" : "light",
    });
  };

  try {
    mediaQuery.addEventListener("change", listener);
    activeMediaQuery = mediaQuery;
    activeMediaListener = listener;
  } catch {
    // Browser media-query failures must not disrupt the application.
  }
}

function persistPreference(preference: ThemePreference): void {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    const { storageWarningShown } = useThemeStore.getState();
    if (storageWarningShown) return;

    useThemeStore.setState({ storageWarningShown: true, storageWarningVisible: true });
    warningClearTimer = setTimeout(() => {
      warningClearTimer = undefined;
      useThemeStore.setState({ storageWarningVisible: false });
    }, 6_000);
  }
}

export function initializeThemeLifecycle(): ThemeResolution {
  const mediaQuery = getMediaQuery();
  const resolution = resolveTheme(readStoredPreference(), mediaQuery?.matches ?? false);
  applySessionTheme(resolution);
  if (resolution.preference === "system") startSystemListener(mediaQuery);
  else stopSystemListener();
  scheduleTransitionEnablement();
  return resolution;
}

export function setThemePreference(preference: ThemePreference): ThemeResolution {
  const mediaQuery = preference === "system" ? getMediaQuery() : undefined;
  const resolution: ThemeResolution = {
    preference,
    resolvedTheme: preference === "system" ? (mediaQuery?.matches ? "dark" : "light") : preference,
  };

  if (preference === "system") startSystemListener(mediaQuery);
  else stopSystemListener();
  applySessionTheme(resolution);
  scheduleTransitionEnablement();
  persistPreference(preference);
  return resolution;
}

export function disposeThemeLifecycle(): void {
  stopSystemListener();
  if (transitionEnableTimer !== undefined) clearTimeout(transitionEnableTimer);
  if (warningClearTimer !== undefined) clearTimeout(warningClearTimer);
  transitionEnableTimer = undefined;
  warningClearTimer = undefined;
  document.documentElement.removeAttribute("data-theme-transitions");
}
