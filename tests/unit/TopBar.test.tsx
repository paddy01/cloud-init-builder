import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "../../src/layouts/TopBar.tsx";
import { useProjectStore } from "../../src/state/projectStore.ts";
import { createDefaultProject } from "../../src/models/project.ts";
import * as projectService from "../../src/services/projectService.ts";
import * as yamlService from "../../src/services/yamlService.ts";

describe("TopBar Open dirty guard (WR-01)", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm");
    vi.spyOn(window, "alert");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aborts Open and resets input value when user cancels confirm in dirty state", () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      isDirty: true,
    });
    vi.mocked(window.confirm).mockReturnValue(false);
    const importSpy = vi.spyOn(projectService, "importProject");

    const { container } = render(<TopBar />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [new File(["{}"], "x.cib.json", { type: "application/json" })],
      },
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "You have unsaved changes. Open another project anyway?",
    );
    expect(input.value).toBe("");
    expect(importSpy).not.toHaveBeenCalled();
    expect(useProjectStore.getState().project?.metadata.name).toBe("Test");
  });

  it("proceeds with import when user confirms in dirty state", async () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      isDirty: true,
    });
    vi.mocked(window.confirm).mockReturnValue(true);

    const importedProject = createDefaultProject("Imported");
    vi.spyOn(projectService, "importProject").mockResolvedValue({
      project: importedProject,
      warnings: [],
    });

    const { container } = render(<TopBar />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [new File(["{}"], "x.cib.json", { type: "application/json" })],
      },
    });

    await vi.waitFor(() => {
      expect(projectService.importProject).toHaveBeenCalledOnce();
    });
  });
});

describe("TopBar Save conditional markSaved (WR-03)", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm");
    vi.spyOn(window, "alert");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls markSaved when exportProject returns true", async () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      isDirty: true,
    });
    vi.spyOn(projectService, "exportProject").mockReturnValue(true);

    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it("does NOT call markSaved when exportProject returns false", async () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      isDirty: true,
    });
    vi.spyOn(projectService, "exportProject").mockReturnValue(false);

    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(useProjectStore.getState().isDirty).toBe(true);
  });
});

describe("TopBar warning banner detail (IN-02)", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm");
    vi.spyOn(window, "alert");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders up to 3 warning paths and messages", () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      importWarnings: [
        { path: "metadata.createdAt", message: "Required" },
        { path: "metadata.updatedAt", message: "Required" },
        { path: "metadata.appVersion", message: "Required" },
      ],
    });

    render(<TopBar />);

    expect(screen.getByText("metadata.createdAt")).toBeInTheDocument();
    expect(screen.getByText("metadata.updatedAt")).toBeInTheDocument();
    expect(screen.getByText("metadata.appVersion")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.filter((li) => li.textContent?.includes("Required"))).toHaveLength(3);
  });

  it('shows "…and N more" when warnings exceed 3', () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      importWarnings: [
        { path: "a", message: "m1" },
        { path: "b", message: "m2" },
        { path: "c", message: "m3" },
        { path: "d", message: "m4" },
        { path: "e", message: "m5" },
      ],
    });

    render(<TopBar />);

    expect(screen.getByText(/and 2 more/i)).toBeInTheDocument();
  });
});

describe("Export YAML button", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm");
    vi.spyOn(window, "alert");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is disabled on a fresh project with D-12 tooltip on wrapper span", () => {
    useProjectStore.getState().newProject("Test");
    render(<TopBar />);

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toBeDisabled();

    const wrapper = exportBtn.closest("span");
    expect(wrapper).toHaveAttribute("title");
    expect(wrapper?.getAttribute("title")).toContain("Cannot export yet");
    expect(wrapper?.getAttribute("title")).toContain("1 validation error");
  });

  it("enables after updateIdentity sets hostname", () => {
    useProjectStore.getState().newProject("Test");
    const { rerender } = render(<TopBar />);

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    rerender(<TopBar />);

    expect(screen.getByRole("button", { name: /export yaml/i })).toBeEnabled();
  });

  it("calls exportCloudInitYaml without markSaved", async () => {
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    const exportSpy = vi
      .spyOn(yamlService, "exportCloudInitYaml")
      .mockReturnValue(true);

    render(<TopBar />);
    expect(useProjectStore.getState().isDirty).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /export yaml/i }));

    expect(exportSpy).toHaveBeenCalledWith(useProjectStore.getState().project);
    expect(useProjectStore.getState().isDirty).toBe(true);
  });
});

describe("Copy YAML button", () => {
  const writeTextMock = vi.fn();

  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm");
    vi.spyOn(window, "alert");
    writeTextMock.mockReset();
    vi.stubGlobal("navigator", { clipboard: { writeText: writeTextMock } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows success feedback then clears after 2000 ms", async () => {
    vi.useFakeTimers();
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    writeTextMock.mockResolvedValue(undefined);

    render(<TopBar />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy yaml/i }));
    });

    expect(screen.getByText("Copied YAML to clipboard.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Copied YAML to clipboard.")).not.toBeInTheDocument();
  });

  it("shows failure feedback then clears after 4000 ms", async () => {
    vi.useFakeTimers();
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    writeTextMock.mockRejectedValue(new Error("clipboard denied"));

    render(<TopBar />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy yaml/i }));
    });

    expect(
      screen.getByText("Couldn't copy. Select the preview text and copy manually."),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(
      screen.queryByText("Couldn't copy. Select the preview text and copy manually."),
    ).not.toBeInTheDocument();
  });
});

describe("TopBar typography", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses font-semibold not font-bold for the title", () => {
    render(<TopBar />);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: /cloud-init builder/i,
    });
    expect(heading.className).toContain("font-semibold");
    expect(heading.className).not.toContain("font-bold");
  });
});
