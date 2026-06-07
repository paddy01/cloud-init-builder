import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MainLayout } from "../../src/layouts/MainLayout.tsx";
import { createBlankUser, isUsersConfig } from "../../src/models/users.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

const DISABLE_DEFAULT_CONFIRM =
  "Turn off default user? Cloud-init will omit `- default` unless you add your own users.";

describe("MainLayout users workflow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("navigates to Users, preserves default, confirms disable, and updates preview", () => {
    const { container } = render(<MainLayout />);

    expect(screen.getByRole("heading", { name: "Identity" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Users" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Identity" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Preserve default user")).toBeChecked();
    expect(screen.getByText("Default cloud-init user")).toBeInTheDocument();
    expect(screen.queryByText("No login users configured")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).toContain("users:");
    expect(previewCode?.textContent).toContain("- default");

    const toggle = screen.getByLabelText("Preserve default user");
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(toggle);

    expect(window.confirm).toHaveBeenCalledWith(DISABLE_DEFAULT_CONFIRM);
    expect(toggle).toBeChecked();
    const usersAfterCancel = useProjectStore.getState().project?.users;
    expect(isUsersConfig(usersAfterCancel) && usersAfterCancel.preserveDefault).toBe(
      true,
    );
    expect(screen.queryByText("No login users configured")).not.toBeInTheDocument();
    expect(previewCode?.textContent).toContain("- default");

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    const usersAfterDisable = useProjectStore.getState().project?.users;
    expect(
      isUsersConfig(usersAfterDisable) && usersAfterDisable.preserveDefault,
    ).toBe(false);
    expect(screen.getByText("No login users configured")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You turned off the default user and haven't added a custom user yet. Add a user below if this machine needs a provisioned account.",
      ),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(previewCode?.textContent).toContain("users:");
    expect(previewCode?.textContent).not.toContain("- default");
    expect(previewCode?.textContent).toMatch(/users:\s*\[\]/);
  });

  it("marks only the active sidebar section with aria-current", () => {
    render(<MainLayout />);

    const nav = screen.getByRole("navigation");
    const identityButton = within(nav).getByRole("button", { name: "Identity" });
    const usersButton = within(nav).getByRole("button", { name: "Users" });

    expect(identityButton).toHaveAttribute("aria-current", "page");
    expect(usersButton).not.toHaveAttribute("aria-current");

    for (const label of ["Commands", "Export"] as const) {
      const row = within(nav).getByText(label).closest("span");
      expect(row?.className).toContain("text-gray-400");
      expect(row?.className).toContain("cursor-not-allowed");
    }

    fireEvent.click(usersButton);

    expect(usersButton).toHaveAttribute("aria-current", "page");
    expect(identityButton).not.toHaveAttribute("aria-current");
  });
});

describe("MainLayout users regression hardening", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("skips blank cards in YAML and preserves project state after generation", () => {
    const blankUser = createBlankUser("blank-test-id");
    const projectBefore = useProjectStore.getState().project;
    if (!projectBefore?.users) throw new Error("expected users config");

    useProjectStore.setState({
      project: {
        ...projectBefore,
        users: {
          preserveDefault: false,
          entries: [blankUser],
        },
      },
    });

    const { container } = render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).toMatch(/users:\s*\[\]/);
    expect(previewCode?.textContent).not.toContain("id:");
    expect(useProjectStore.getState().project?.users).toEqual({
      preserveDefault: false,
      entries: [blankUser],
    });
  });

  it("emits only default when preserved with blank custom entries", () => {
    const blankUser = createBlankUser("blank-default-id");
    const projectBefore = useProjectStore.getState().project;
    if (!projectBefore?.users) throw new Error("expected users config");

    useProjectStore.setState({
      project: {
        ...projectBefore,
        users: {
          preserveDefault: true,
          entries: [blankUser],
        },
      },
    });

    const { container } = render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).toContain("- default");
    expect(previewCode?.textContent).not.toContain("name:");
    expect(previewCode?.textContent).not.toContain("id:");
  });

  it("mounts exactly one editor across section and responsive tab switches", () => {
    render(<MainLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Identity" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Identity" }));
    expect(screen.getByRole("heading", { name: "Identity" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Users" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));
    fireEvent.click(screen.getByRole("tab", { name: /editor/i }));
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Identity" })).not.toBeInTheDocument();
  });
});
