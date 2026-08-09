import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyResolvedTheme,
  disposeThemeLifecycle,
  initializeThemeLifecycle,
  resolveTheme,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from "../../src/theme/themeLifecycle.ts";
import { useThemeStore } from "../../src/theme/themeStore.ts";

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
  const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const documentForSource = document.implementation.createHTMLDocument("theme source");
  documentForSource.documentElement.innerHTML = indexHtml;
  const scripts = documentForSource.querySelectorAll("script#theme-bootstrap");
  expect(scripts).toHaveLength(1);
  const bootstrap = scripts[0];
  const module = documentForSource.querySelector('script[type="module"]');
  expect(bootstrap).not.toBeNull();
  expect(module).not.toBeNull();
  expect(bootstrap?.compareDocumentPosition(module!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
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

    const mainSource = readFileSync(new URL("../../src/main.tsx", import.meta.url), "utf8");
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

  it.todo("owns one System media listener, removes overrides, and disposes cleanly");
  it.todo("applies current System events and ignores stale events after explicit selection");
  it.todo("persists explicit overrides, removes System, and retains session appearance on failure");
  it.todo("silently survives storage and media failures without warn, error, or log output");
  it.todo("shows one six-second persistence warning without extending repeated failures");
  it.todo("keeps root state, listener ownership, and transition enablement idempotent");
  it.todo("uses the bounded 150ms ease-out color transition and disables it for reduced motion");
});
