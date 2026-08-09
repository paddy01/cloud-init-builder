import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import indexHtml from "../../index.html?raw";
import mainSource from "../../src/main.tsx?raw";
import {
  applyResolvedTheme,
  disposeThemeLifecycle,
  initializeThemeLifecycle,
  resolveTheme,
  setThemePreference,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from "../../src/theme/themeLifecycle.ts";
import { resetThemeStore, useThemeStore } from "../../src/theme/themeStore.ts";

type StorageFailure = "get" | "set" | "remove";

interface ControlledStorage {
  install(): void;
  values: Map<string, string>;
  failures: Set<StorageFailure>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface ControlledMediaQueryList {
  readonly media: string;
  matches: boolean;
  addEventListener(type: string, listener: (event: MediaQueryListEvent) => void): void;
  removeEventListener(type: string, listener: (event: MediaQueryListEvent) => void): void;
  emit(matches: boolean): void;
  listenerCount(): number;
}

export function createControlledStorage(
  initialValues: Record<string, string> = {},
): ControlledStorage {
  const values = new Map(Object.entries(initialValues));
  const failures = new Set<StorageFailure>();

  const fail = (operation: StorageFailure) => {
    if (failures.has(operation)) {
      throw new Error(`storage ${operation} failure`);
    }
  };

  const storage: ControlledStorage = {
    values,
    failures,
    install() {
      vi.stubGlobal("localStorage", storage);
    },
    getItem(key) {
      fail("get");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      fail("set");
      values.set(key, value);
    },
    removeItem(key) {
      fail("remove");
      values.delete(key);
    },
  };

  return storage;
}

export function createControlledMediaQueryList(
  query: string,
  initialMatches = false,
): ControlledMediaQueryList {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    media: query,
    get matches() {
      return matches;
    },
    set matches(value) {
      matches = value;
    },
    addEventListener(type, listener) {
      if (type === "change") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") listeners.delete(listener);
    },
    emit(nextMatches) {
      matches = nextMatches;
      const event = { matches, media: query } as MediaQueryListEvent;
      for (const listener of [...listeners]) listener(event);
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

export function installControlledMatchMedia(media: ControlledMediaQueryList): void {
  vi.stubGlobal("matchMedia", vi.fn(() => media));
}

export function extractThemeBootstrapBody(): string {
  const documentForSource = document.implementation.createHTMLDocument("theme source");
  documentForSource.documentElement.innerHTML = indexHtml;
  const scripts = documentForSource.querySelectorAll("script#theme-bootstrap");
  expect(scripts).toHaveLength(1);
  const bootstrap = scripts[0];
  const module = documentForSource.querySelector('script[type="module"]');
  expect(bootstrap).not.toBeNull();
  expect(module).not.toBeNull();
  if (!bootstrap || !module) throw new Error("theme bootstrap or module script missing");
  expect(bootstrap.compareDocumentPosition(module) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  return bootstrap?.textContent ?? "";
}

export function resetThemeTestEnvironment(): void {
  vi.clearAllTimers();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-transitions");
  document.documentElement.style.removeProperty("color-scheme");
}

describe("theme lifecycle", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.useFakeTimers();
    resetThemeTestEnvironment();
  });

  afterEach(() => {
    disposeThemeLifecycle();
    resetThemeStore();
    resetThemeTestEnvironment();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("provides deterministic storage and media-query fakes for later lifecycle cases", () => {
    const storage = createControlledStorage({ preference: "dark" });
    const media = createControlledMediaQueryList("(prefers-color-scheme: dark)");
    const listener = vi.fn();

    expect(storage.getItem("preference")).toBe("dark");
    media.addEventListener("change", listener);
    media.emit(true);

    expect(media.listenerCount()).toBe(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ matches: true, media: "(prefers-color-scheme: dark)" }),
    );
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, false, "system", "light"],
    [undefined, true, "system", "dark"],
    ["light", true, "light", "light"],
    ["dark", false, "dark", "dark"],
    ["not-a-theme", true, "system", "dark"],
  ] as const)(
    "resolves %s storage with OS dark=%s as %s/%s",
    (storedPreference, osDark, preference, resolvedTheme) => {
      expect(resolveTheme(storedPreference, osDark)).toEqual({ preference, resolvedTheme });
    },
  );

  it("keeps the exact bootstrap body and runtime root application in parity", () => {
    const body = extractThemeBootstrapBody();

    for (const [storedPreference, osDark] of [
      [undefined, false],
      [undefined, true],
      ["light", true],
      ["dark", false],
      ["invalid", true],
    ] as const) {
      resetThemeTestEnvironment();
      const storage = createControlledStorage(
        storedPreference === undefined ? {} : { [THEME_STORAGE_KEY]: storedPreference },
      );
      storage.install();
      installControlledMatchMedia(createControlledMediaQueryList(THEME_MEDIA_QUERY, osDark));
      new Function(body)();
      const bootstrapPair = [
        document.documentElement.dataset.theme,
        document.documentElement.style.colorScheme,
      ];

      resetThemeTestEnvironment();
      storage.install();
      installControlledMatchMedia(createControlledMediaQueryList(THEME_MEDIA_QUERY, osDark));
      initializeThemeLifecycle();
      expect([
        document.documentElement.dataset.theme,
        document.documentElement.style.colorScheme,
      ]).toEqual(bootstrapPair);
    }
  });

  it("applies only resolved root themes and initializes before React without transitions", () => {
    applyResolvedTheme(document.documentElement, "dark");

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement).not.toHaveAttribute("data-theme-transitions");

    expect(mainSource.indexOf("initializeThemeLifecycle()")).toBeLessThan(
      mainSource.indexOf("createRoot(rootElement)"),
    );
  });

  it.each(["get", "media"] as const)(
    "silently applies a fallback root for guarded %s failure",
    (failure) => {
      const storage = createControlledStorage();
      storage.install();
      if (failure === "get") storage.failures.add("get");
      installControlledMatchMedia(
        failure === "media"
          ? ({
              media: THEME_MEDIA_QUERY,
              matches: false,
              addEventListener() {
                throw new Error("media failure");
              },
              removeEventListener() {},
              emit() {},
              listenerCount() {
                return 0;
              },
            } satisfies ControlledMediaQueryList)
          : createControlledMediaQueryList(THEME_MEDIA_QUERY, true),
      );

      initializeThemeLifecycle();

      expect(document.documentElement.dataset.theme).toMatch(/^(light|dark)$/);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    },
  );

  it("owns one System media listener, removes overrides, and disposes cleanly", () => {
    const storage = createControlledStorage();
    const media = createControlledMediaQueryList(THEME_MEDIA_QUERY, false);
    storage.install();
    installControlledMatchMedia(media);

    initializeThemeLifecycle();
    initializeThemeLifecycle();
    expect(media.listenerCount()).toBe(1);

    setThemePreference("dark");
    expect(media.listenerCount()).toBe(0);
    setThemePreference("system");
    expect(media.listenerCount()).toBe(1);

    disposeThemeLifecycle();
    expect(media.listenerCount()).toBe(0);
  });

  it("applies current System events and ignores stale events after explicit selection", () => {
    const storage = createControlledStorage();
    const media = createControlledMediaQueryList(THEME_MEDIA_QUERY, false);
    storage.install();
    installControlledMatchMedia(media);
    initializeThemeLifecycle();

    media.emit(true);
    expect(useThemeStore.getState()).toMatchObject({ preference: "system", resolvedTheme: "dark" });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    setThemePreference("light");
    media.emit(true);
    expect(useThemeStore.getState()).toMatchObject({ preference: "light", resolvedTheme: "light" });
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("persists explicit overrides, removes System, and retains session appearance on failure", () => {
    const storage = createControlledStorage();
    const media = createControlledMediaQueryList(THEME_MEDIA_QUERY, true);
    storage.install();
    installControlledMatchMedia(media);
    initializeThemeLifecycle();

    setThemePreference("light");
    expect(storage.values.get(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    setThemePreference("system");
    expect(storage.values.has(THEME_STORAGE_KEY)).toBe(false);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    storage.failures.add("set");
    setThemePreference("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(useThemeStore.getState().storageWarningVisible).toBe(true);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it.each(["get", "set", "remove"] as const)(
    "silently survives %s storage failures without warn, error, or log output",
    (failure) => {
      const storage = createControlledStorage();
      const media = createControlledMediaQueryList(THEME_MEDIA_QUERY, true);
      storage.install();
      installControlledMatchMedia(media);
      storage.failures.add(failure);

      initializeThemeLifecycle();
      if (failure === "set") setThemePreference("dark");
      if (failure === "remove") setThemePreference("system");

      expect(document.documentElement.dataset.theme).toMatch(/^(light|dark)$/);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    },
  );

  it("shows one six-second persistence warning without extending repeated failures", () => {
    const storage = createControlledStorage();
    const media = createControlledMediaQueryList(THEME_MEDIA_QUERY, false);
    storage.install();
    installControlledMatchMedia(media);
    initializeThemeLifecycle();
    storage.failures.add("set");

    setThemePreference("dark");
    expect(useThemeStore.getState()).toMatchObject({ storageWarningVisible: true, storageWarningShown: true });
    vi.advanceTimersByTime(5_000);
    setThemePreference("light");
    vi.advanceTimersByTime(1_001);

    expect(useThemeStore.getState()).toMatchObject({ storageWarningVisible: false, storageWarningShown: true });
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it("keeps root state, listener ownership, and transition enablement idempotent", () => {
    const storage = createControlledStorage();
    const media = createControlledMediaQueryList(THEME_MEDIA_QUERY, false);
    storage.install();
    installControlledMatchMedia(media);

    initializeThemeLifecycle();
    initializeThemeLifecycle();
    setThemePreference("system");
    setThemePreference("system");
    vi.runOnlyPendingTimers();

    expect(media.listenerCount()).toBe(1);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).toHaveAttribute("data-theme-transitions", "enabled");
  });

  it("uses the bounded 150ms ease-out color transition and disables it for reduced motion", async () => {
    const styles = await import("../../src/assets/styles.css?raw");
    expect(styles.default).toContain('html[data-theme-transitions="enabled"]');
    expect(styles.default).toContain("background-color, color, border-color, fill, stroke, outline-color");
    expect(styles.default).toContain("150ms ease-out");
    expect(styles.default).toContain("[data-theme-transition-focus]:is(:focus-visible, :focus-within)");
    expect(styles.default).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
