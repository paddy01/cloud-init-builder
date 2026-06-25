import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { PreviewPanel } from "../../../src/components/preview/PreviewPanel.tsx";
import { UserValidationProvider } from "../../../src/components/users/UserValidationProvider.tsx";
import { createDefaultProject } from "../../../src/models/project.ts";
import { useProjectStore } from "../../../src/state/projectStore.ts";

function renderPreviewPanel(ui: ReactElement = <PreviewPanel />) {
  return render(<UserValidationProvider>{ui}</UserValidationProvider>);
}

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
    renderPreviewPanel();

    expect(screen.getByText("No project loaded")).toBeInTheDocument();
    expect(
      screen.getByText("Create or open a project to preview cloud-init YAML."),
    ).toBeInTheDocument();
  });

  it("shows users YAML when identity is empty but default user is preserved", () => {
    const project = createDefaultProject("Test");
    project.identity = {};
    useProjectStore.setState({ ...initialState, project });

    const { container } = renderPreviewPanel();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const code = container.querySelector("pre code");
    expect(code?.textContent).toContain("users:");
    expect(code?.textContent).toContain("- default");
    expect(screen.queryByText("No identity yet")).not.toBeInTheDocument();
  });

  it("shows users YAML when identity has hostname: undefined", () => {
    const project = createDefaultProject("Test");
    project.identity = { hostname: undefined };
    useProjectStore.setState({ ...initialState, project });

    const { container } = renderPreviewPanel();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(container.querySelector("pre code")?.textContent).toContain("- default");
  });

  it("shows users YAML when identity has only cleared optional fields", () => {
    const project = createDefaultProject("Test");
    project.identity = {
      fqdn: "",
      timezone: undefined,
      locale: "",
    };
    useProjectStore.setState({ ...initialState, project });

    const { container } = renderPreviewPanel();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(container.querySelector("pre code")?.textContent).toContain("- default");
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
    renderPreviewPanel();

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(screen.queryByText(/hostname: web01/)).toBeNull();
  });

  it("shows hostname in preview after 300 ms debounce", () => {
    const { container } = renderPreviewPanel();

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
    renderPreviewPanel();

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "-bad" });
    });

    expect(screen.getByText("1 validation error")).toBeInTheDocument();
  });

  it("shows user validation errors immediately while YAML stays debounced", () => {
    const validSsh =
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
    const project = useProjectStore.getState().project;
    if (!project) throw new Error("expected project");

    const { container } = renderPreviewPanel();

    act(() => {
      useProjectStore.setState({
        project: {
          ...project,
          identity: { hostname: "web01" },
          users: {
            preserveDefault: true,
            entries: [
              {
                id: "dup-a",
                name: "shared",
                shell: "/bin/bash",
                ssh_authorized_keys: [{ id: "k1", value: validSsh }],
              },
              {
                id: "dup-b",
                name: "shared",
                shell: "/bin/bash",
                ssh_authorized_keys: [{ id: "k2", value: validSsh }],
              },
            ],
          },
        },
      });
    });

    expect(screen.getByText("2 validation errors")).toBeInTheDocument();
    expect(
      screen.getAllByText(/name: Export blocked: username conflicts/i),
    ).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(299);
    });
    const code = container.querySelector("pre code");
    expect(code?.textContent).not.toContain("name: shared");
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
    const { container } = renderPreviewPanel();

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
