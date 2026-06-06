import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "../../src/layouts/TopBar.tsx";
import { useProjectStore } from "../../src/state/projectStore.ts";
import { createDefaultProject } from "../../src/models/project.ts";
import * as projectService from "../../src/services/projectService.ts";

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
