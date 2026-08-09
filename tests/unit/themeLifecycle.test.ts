import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  const scripts = document.querySelectorAll("script#theme-bootstrap");
  expect(scripts).toHaveLength(1);
  return scripts[0]?.textContent ?? "";
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

  it.todo("resolves missing System preference through OS Light and Dark");
  it.todo("allows only stored light and dark overrides and rejects invalid storage values");
  it.todo("keeps bootstrap and runtime root data-theme and color-scheme parity");
  it.todo("orders the exact theme bootstrap body before the application module");
  it.todo("applies only resolved root themes without a first-paint transition marker");
  it.todo("owns one System media listener, removes overrides, and disposes cleanly");
  it.todo("applies current System events and ignores stale events after explicit selection");
  it.todo("persists explicit overrides, removes System, and retains session appearance on failure");
  it.todo("silently survives storage and media failures without warn, error, or log output");
  it.todo("shows one six-second persistence warning without extending repeated failures");
  it.todo("keeps root state, listener ownership, and transition enablement idempotent");
  it.todo("uses the bounded 150ms ease-out color transition and disables it for reduced motion");
});
