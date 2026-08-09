import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeControl } from "../../src/components/theme/ThemeControl.tsx";
import { generateCloudInit } from "../../src/generators/generateCloudInit.ts";
import { createDefaultProject } from "../../src/models/project.ts";
import { toGenerateInput } from "../../src/services/yamlService.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";
import { disposeThemeLifecycle, initializeThemeLifecycle, setThemePreference } from "../../src/theme/themeLifecycle.ts";
import { resetThemeStore, useThemeStore } from "../../src/theme/themeStore.ts";

interface ControlledMediaQuery {
  matches: boolean;
  emit(matches: boolean): void;
}

function installControlledMatchMedia(initialMatches = false): ControlledMediaQuery {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
  } as MediaQueryList;
  vi.stubGlobal("matchMedia", vi.fn(() => query));

  return {
    get matches() {
      return matches;
    },
    emit(nextMatches) {
      matches = nextMatches;
      for (const listener of [...listeners]) {
        listener({ matches, media: query.media } as MediaQueryListEvent);
      }
    },
  };
}

function resetThemeControlTestEnvironment() {
  disposeThemeLifecycle();
  resetThemeStore();
  vi.clearAllTimers();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-transitions");
  document.documentElement.style.removeProperty("color-scheme");
}

/**
 * Wave 0 map for the Appearance control. Tasks 1 and 2 replace these
 * discoverable markers with the shared render, browser-fake, and cleanup
 * harness before activating the corresponding assertions.
 */
describe("ThemeControl native appearance semantics (THEM-03)", () => {
  beforeEach(() => {
    installControlledMatchMedia();
    initializeThemeLifecycle();
  });

  afterEach(() => {
    cleanup();
    resetThemeControlTestEnvironment();
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.restoreAllMocks();
  });

  it("keeps System, Light, and Dark native same-name radios in order with one checked choice", () => {
    render(<ThemeControl />);

    expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios.map((radio) => radio.getAttribute("name"))).toEqual([
      "appearance",
      "appearance",
      "appearance",
    ]);
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1);
    expect(radios[0]).toBeChecked();
  });

  it("uses native Tab, ArrowRight, ArrowLeft, and Space radio behavior without a key handler", async () => {
    const user = userEvent.setup();
    render(<ThemeControl />);
    const system = screen.getByRole("radio", { name: "System (currently Light)" });
    const light = screen.getByRole("radio", { name: "Light" });
    const dark = screen.getByRole("radio", { name: "Dark" });

    await user.tab();
    expect(system).toHaveFocus();
    expect(system).toBeChecked();
    await user.keyboard("{ArrowRight}");
    expect(light).toHaveFocus();
    expect(light).toBeChecked();
    await user.keyboard("{ArrowRight}");
    expect(dark).toHaveFocus();
    expect(dark).toBeChecked();
    await user.keyboard("{ArrowLeft}");
    expect(light).toHaveFocus();
    expect(light).toBeChecked();
    system.focus();
    await user.keyboard(" ");
    expect(system).toBeChecked();
  });

  it.each([390, 1024])(
    "keeps exact computed radio names at %ipx independent of visible responsive content",
    (width) => {
      window.innerWidth = width;
      render(<ThemeControl />);

      expect(screen.getByRole("radio", { name: "System (currently Light)" })).toHaveAccessibleName(
        "System (currently Light)",
      );
      expect(screen.getByRole("radio", { name: "Light" })).toHaveAccessibleName("Light");
      expect(screen.getByRole("radio", { name: "Dark" })).toHaveAccessibleName("Dark");
    },
  );

  it("excludes decorative SVGs and supplementary System tooltips from radio accessible names", () => {
    render(<ThemeControl />);
    const system = screen.getByRole("radio", { name: "System (currently Light)" });

    expect(system).toHaveAccessibleName("System (currently Light)");
    expect(screen.getByText("System (Light)")).toBeInTheDocument();
    expect(
      screen.getByText("System (currently Light) — follows your device setting."),
    ).toHaveAttribute("aria-hidden", "true");
    for (const icon of document.querySelectorAll("[data-theme-icon]")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    }
  });

  it("keeps 40px narrow segments, transition opt-ins, selected state, and focus rings", () => {
    render(<ThemeControl />);

    const track = screen.getByTestId("theme-control-track");
    expect(track).toHaveAttribute("data-theme-transition", "colors");
    for (const label of document.querySelectorAll("[data-theme-segment]")) {
      expect(label).toHaveAttribute("data-theme-transition", "colors");
      expect(label).toHaveAttribute("data-theme-transition-focus");
      expect(label).toHaveClass("min-h-10");
    }
  });

  it("updates System live resolution silently without moving focus and ignores events for fixed overrides", () => {
    const media = installControlledMatchMedia(false);
    initializeThemeLifecycle();
    render(<ThemeControl />);
    const system = screen.getByRole("radio", { name: "System (currently Light)" });
    system.focus();

    act(() => {
      media.emit(true);
    });
    expect(system).toHaveFocus();
    expect(screen.getByRole("radio", { name: "System (currently Dark)" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    act(() => {
      media.emit(false);
    });
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
  });
});

describe("ThemeControl bounded persistence feedback (QUAL-01)", () => {
  beforeEach(() => {
    resetThemeControlTestEnvironment();
  });

  afterEach(() => {
    cleanup();
    resetThemeControlTestEnvironment();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders one exact polite atomic storage warning while preserving selection and focus", () => {
    vi.useFakeTimers();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage unavailable");
      },
      removeItem: () => {
        throw new Error("storage unavailable");
      },
    });
    initializeThemeLifecycle();
    render(<ThemeControl />);
    const light = screen.getByRole("radio", { name: "Light" });
    light.focus();

    act(() => fireEvent.click(light));

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent(
      "Appearance set for this session only. Your browser could not save it, so it will reset after reload.",
    );
    expect(light).toBeChecked();
    expect(light).toHaveFocus();
  });

  it("clears the storage warning after six seconds without repeating or extending it later in the session", () => {
    vi.useFakeTimers();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage unavailable");
      },
      removeItem: () => {
        throw new Error("storage unavailable");
      },
    });
    initializeThemeLifecycle();
    render(<ThemeControl />);
    const light = screen.getByRole("radio", { name: "Light" });

    act(() => {
      fireEvent.click(light);
      vi.advanceTimersByTime(5_999);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => fireEvent.click(screen.getByRole("radio", { name: "Dark" })));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it.todo("has no empty, loading, partial, disabled, toast, banner, modal, or appearance-success state");
});

describe("ThemeControl portable project isolation (VISU-03)", () => {
  beforeEach(() => {
    resetThemeControlTestEnvironment();
  });

  afterEach(() => {
    cleanup();
    resetThemeControlTestEnvironment();
    vi.restoreAllMocks();
  });

  it("preserves project reference, content, saved state, dirty state, JSON, generator input, and YAML across theme changes", () => {
    const project = createDefaultProject("Appearance isolation");
    useProjectStore.setState({
      project,
      lastSavedProject: structuredClone(project),
      isDirty: true,
      importWarnings: [],
    });
    const beforeState = useProjectStore.getState();
    const beforeJson = JSON.stringify(project);
    const beforeInput = toGenerateInput(project);
    const beforeYaml = generateCloudInit(beforeInput).yaml;

    act(() => {
      setThemePreference("light");
      setThemePreference("dark");
      setThemePreference("system");
    });

    const afterState = useProjectStore.getState();
    expect(afterState.project).toBe(beforeState.project);
    expect(afterState.lastSavedProject).toEqual(beforeState.lastSavedProject);
    expect(afterState.isDirty).toBe(beforeState.isDirty);
    expect(JSON.stringify(afterState.project)).toBe(beforeJson);
    expect(toGenerateInput(afterState.project!)).toEqual(beforeInput);
    expect(generateCloudInit(toGenerateInput(afterState.project!)).yaml).toBe(beforeYaml);
    expect(beforeJson).not.toContain("appearance");
    expect(JSON.stringify(beforeInput)).not.toContain("theme");
  });
  it.todo("keeps New, Open, Save, Copy YAML, and Export YAML behavior equivalent with or without a preceding theme change");
  it.todo("keeps appearance preferences and resolved themes out of builder JSON and generator input");
});

describe("TopBar Appearance integration (THEM-03, QUAL-01)", () => {
  it.todo("places ThemeControl and its warning slot after project identity and before copy feedback, spacer, and actions");
  it.todo("preserves narrow order-1 Appearance, order-2 actions, and order-3 copy feedback utility priority");
});
