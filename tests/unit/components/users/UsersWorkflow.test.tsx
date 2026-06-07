import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MainLayout } from "../../../../src/layouts/MainLayout.tsx";
import {
  createBlankUser,
  isUsersConfig,
} from "../../../../src/models/users.ts";
import { importProject } from "../../../../src/services/projectService.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

const REMOVE_USER_CONFIRM =
  "Remove user? This removes the custom user card from the project.";

function fixtureFile(content: string, name: string): File {
  return new File([content], name, { type: "application/json" });
}

describe("UsersWorkflow add and edit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("adds ordered cards, focuses new username, edits by stable ID, and round-trips project JSON", async () => {
    const { container } = render(<MainLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    const firstUsername = screen.getByLabelText("Username");
    expect(firstUsername).toHaveFocus();
    const usersAfterAdd = useProjectStore.getState().project?.users;
    if (!isUsersConfig(usersAfterAdd)) {
      throw new Error("expected users config");
    }
    const firstId = usersAfterAdd.entries[0]?.id ?? "";
    expect(firstUsername).toHaveAttribute("id", `user-username-${firstId}`);

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    const usernameInputs = screen.getAllByLabelText("Username");
    expect(usernameInputs).toHaveLength(2);
    expect(usernameInputs[1]).toHaveFocus();

    fireEvent.change(usernameInputs[0]!, { target: { value: "deploy" } });
    fireEvent.change(usernameInputs[1]!, { target: { value: "deploy" } });
    fireEvent.change(screen.getAllByLabelText("Full name")[0]!, {
      target: { value: "First Deploy" },
    });
    fireEvent.change(screen.getAllByLabelText("Full name")[1]!, {
      target: { value: "Second Deploy" },
    });

    const storeUsers = useProjectStore.getState().project?.users;
    expect(isUsersConfig(storeUsers)).toBe(true);
    if (!isUsersConfig(storeUsers)) throw new Error("expected users config");
    expect(storeUsers.entries.map((entry) => entry.id)).toEqual([
      firstId,
      storeUsers.entries[1]?.id,
    ]);
    expect(storeUsers.entries[0]?.name).toBe("deploy");
    expect(storeUsers.entries[1]?.gecos).toBe("Second Deploy");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const previewCode = container.querySelector("aside pre code");
    const yaml = previewCode?.textContent ?? "";
    expect(yaml).toMatch(/name: deploy[\s\S]*name: deploy/);
    expect(yaml).toContain("gecos: First Deploy");
    expect(yaml).toContain("gecos: Second Deploy");
    expect(yaml).not.toContain("id:");

    vi.useRealTimers();
    const exported = JSON.stringify(useProjectStore.getState().project, null, 2);
    const reimported = await importProject(
      fixtureFile(exported, "roundtrip.cib.json"),
    );
    expect(reimported.project.users).toEqual(storeUsers);

    useProjectStore.getState().loadProject(reimported.project);
    expect(screen.getAllByLabelText("Username")[0]).toHaveValue("deploy");
    expect(screen.getAllByLabelText("Full name")[1]).toHaveValue(
      "Second Deploy",
    );
  });

  it("keeps blank cards in project JSON but omits them from YAML", () => {
    const { container } = render(<MainLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    const storeUsers = useProjectStore.getState().project?.users;
    expect(isUsersConfig(storeUsers)).toBe(true);
    if (!isUsersConfig(storeUsers)) throw new Error("expected users config");
    expect(storeUsers.entries).toHaveLength(1);
    expect(storeUsers.entries[0]?.name).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).toContain("- default");
    expect(previewCode?.textContent).not.toContain("name:");
  });
});

describe("UsersWorkflow remove", () => {
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

  it("removes only the targeted duplicate-name card after confirmation", () => {
    const first = createBlankUser("dup-a");
    const second = createBlankUser("dup-b");
    const projectBefore = useProjectStore.getState().project;
    if (!projectBefore?.users || !isUsersConfig(projectBefore.users)) {
      throw new Error("expected users config");
    }

    useProjectStore.setState({
      project: {
        ...projectBefore,
        users: {
          preserveDefault: true,
          entries: [
            { ...first, name: "shared" },
            { ...second, name: "shared", gecos: "Keep me" },
          ],
        },
      },
      isDirty: true,
    });

    const { container } = render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const previewBefore = container.querySelector("aside pre code")?.textContent;

    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(
      within(cards[0]!).getByRole("button", { name: "Remove user" }),
    );
    expect(window.confirm).toHaveBeenCalledWith(REMOVE_USER_CONFIRM);
    expect(useProjectStore.getState().project?.users).toEqual({
      preserveDefault: true,
      entries: [
        { ...first, name: "shared" },
        { ...second, name: "shared", gecos: "Keep me" },
      ],
    });
    expect(useProjectStore.getState().isDirty).toBe(true);
    expect(container.querySelector("aside pre code")?.textContent).toBe(
      previewBefore,
    );

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(
      within(cards[0]!).getByRole("button", { name: "Remove user" }),
    );
    expect(useProjectStore.getState().project?.users).toEqual({
      preserveDefault: true,
      entries: [{ ...second, name: "shared", gecos: "Keep me" }],
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Keep me")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const previewAfter = container.querySelector("aside pre code")?.textContent;
    expect(previewAfter).toContain("name: shared");
    expect(previewAfter).toContain("gecos: Keep me");
    expect(previewAfter?.match(/name: shared/g)).toHaveLength(1);
  });

  it("shows approved header metadata fallbacks", () => {
    const blank = createBlankUser("header-id");
    const projectBefore = useProjectStore.getState().project;
    if (!projectBefore?.users || !isUsersConfig(projectBefore.users)) {
      throw new Error("expected users config");
    }

    useProjectStore.setState({
      project: {
        ...projectBefore,
        users: {
          preserveDefault: true,
          entries: [blank],
        },
      },
    });

    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    expect(screen.getByText("New user")).toBeInTheDocument();
    expect(screen.getByText("No full name")).toBeInTheDocument();
    expect(screen.getByText("No groups")).toBeInTheDocument();
  });
});
