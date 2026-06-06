import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PreviewPanel } from "../../../src/components/preview/PreviewPanel.tsx";
import { createDefaultProject } from "../../../src/models/project.ts";
import { useProjectStore } from "../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

describe("PreviewPanel empty state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows no-project state when project is null", () => {
    render(<PreviewPanel />);

    expect(screen.getByText("No project loaded")).toBeInTheDocument();
    expect(
      screen.getByText("Create or open a project to preview cloud-init YAML."),
    ).toBeInTheDocument();
  });

  it("shows empty state when identity is {}", () => {
    const project = createDefaultProject("Test");
    project.identity = {};
    useProjectStore.setState({ ...initialState, project });

    render(<PreviewPanel />);

    expect(screen.getByText("No identity yet")).toBeInTheDocument();
  });

  it("shows empty state when identity has hostname: undefined", () => {
    const project = createDefaultProject("Test");
    project.identity = { hostname: undefined };
    useProjectStore.setState({ ...initialState, project });

    render(<PreviewPanel />);

    expect(screen.getByText("No identity yet")).toBeInTheDocument();
  });

  it("shows empty state when identity has only cleared optional fields", () => {
    const project = createDefaultProject("Test");
    project.identity = {
      fqdn: "",
      timezone: undefined,
      locale: "",
    };
    useProjectStore.setState({ ...initialState, project });

    render(<PreviewPanel />);

    expect(screen.getByText("No identity yet")).toBeInTheDocument();
  });
});

describe("PreviewPanel debounce and validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not show hostname in preview before 300 ms debounce", () => {
    render(<PreviewPanel />);

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(screen.queryByText(/hostname: web01/)).toBeNull();
  });

  it("shows hostname in preview after 300 ms debounce", () => {
    const { container } = render(<PreviewPanel />);

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    act(() => {
      vi.advanceTimersByTime(1);
    });

    const code = container.querySelector("pre code");
    expect(code?.textContent).toContain("hostname: web01");
    expect(code?.textContent?.startsWith("#cloud-config")).toBe(true);
  });

  it("shows validation banner immediately without waiting for debounce", () => {
    render(<PreviewPanel />);

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "-bad" });
    });

    expect(screen.getByText("1 validation error")).toBeInTheDocument();
  });
});

describe("PreviewPanel security", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders YAML in pre/code without script injection surface", () => {
    const { container } = render(<PreviewPanel />);

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.querySelector("script")).toBeNull();
    expect(container.innerHTML.includes("dangerouslySetInnerHTML")).toBe(false);
    expect(container.querySelector("pre code")).not.toBeNull();
  });
});
