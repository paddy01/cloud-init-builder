import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "../../../../src/components/users/UserCard.tsx";
import {
  createBlankUser,
  type BuilderUser,
} from "../../../../src/models/users.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; msg: string }[],
};

function StoreBackedUserCard({ userId }: { userId: string }) {
  const user = useProjectStore((state) =>
    state.project?.users.entries.find((entry) => entry.id === userId),
  );
  if (!user) {
    return null;
  }
  return <UserCard user={user} onRemove={() => undefined} />;
}

function renderUserCard(user: BuilderUser) {
  render(<StoreBackedUserCard userId={user.id} />);
}

function seedProject(users: BuilderUser[]) {
  const project = useProjectStore.getState().project;
  if (!project) throw new Error("expected project");
  useProjectStore.setState({
    project: {
      ...project,
      users: {
        preserveDefault: true,
        entries: users,
      },
    },
    isDirty: true,
  });
}

describe("CommonUserFields groups", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("commits groups on Enter, comma, comma paste, and blur with exact dedupe", async () => {
    const user = createBlankUser("groups-user");
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    const groupsInput = screen.getByLabelText("Additional groups");
    await userEvent.type(groupsInput, "docker{Enter}");
    expect(
      useProjectStore.getState().project?.users.entries[0]?.groups,
    ).toEqual(["docker"]);

    await userEvent.type(groupsInput, "wheel,");
    expect(
      useProjectStore.getState().project?.users.entries[0]?.groups,
    ).toEqual(["docker", "wheel"]);

    fireEvent.paste(groupsInput, {
      clipboardData: { getData: () => "admins, docker, Admins" },
    });
    expect(
      useProjectStore.getState().project?.users.entries[0]?.groups,
    ).toEqual(["docker", "wheel", "admins", "Admins"]);

    await userEvent.type(groupsInput, "beta");
    fireEvent.blur(groupsInput);
    expect(
      useProjectStore.getState().project?.users.entries[0]?.groups,
    ).toEqual(["docker", "wheel", "admins", "Admins", "beta"]);

    expect(screen.getByText("docker, wheel, admins, Admins, beta")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove group docker" }),
    ).toBeInTheDocument();
  });

  it("removes committed groups via accessible chip buttons", async () => {
    const user = createBlankUser("remove-group");
    user.groups = ["docker", "wheel"];
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    fireEvent.click(screen.getByRole("button", { name: "Remove group docker" }));
    expect(
      useProjectStore.getState().project?.users.entries[0]?.groups,
    ).toEqual(["wheel"]);
  });

  it("shows exact groups copy and No groups header fallback", () => {
    const user = createBlankUser("groups-copy");
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    expect(screen.getByLabelText("Additional groups")).toHaveAttribute(
      "placeholder",
      "Type a group and press Enter",
    );
    expect(
      screen.getByText(
        "Add one group per tag. Pasting comma-separated values creates multiple tags.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No groups")).toBeInTheDocument();
  });
});

describe("CommonUserFields shell", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("renders shell presets and help copy verbatim", () => {
    const user = createBlankUser("shell-copy");
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    const shellSelect = screen.getByLabelText("Shell");
    expect(shellSelect).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a common login shell or pick Other to enter a custom path.",
      ),
    ).toBeInTheDocument();

    const options = within(shellSelect).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "/bin/bash",
      "/bin/sh",
      "/usr/sbin/nologin",
      "Other",
    ]);
  });

  it("reveals custom shell path when Other is selected", async () => {
    const user = createBlankUser("shell-other");
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    await userEvent.selectOptions(screen.getByLabelText("Shell"), "other");
    expect(screen.getByLabelText("Custom shell path")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom shell path")).toHaveAttribute(
      "placeholder",
      "e.g. /usr/local/bin/fish",
    );
  });

  it("preserves imported custom shell paths across render and unrelated edits", async () => {
    const user = createBlankUser("shell-custom");
    user.shell = "/usr/local/bin/fish";
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    expect(screen.getByLabelText("Shell")).toHaveValue("other");
    expect(screen.getByLabelText("Custom shell path")).toHaveValue(
      "/usr/local/bin/fish",
    );
    expect(screen.getByText("Custom shell")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Username"), "deploy");
    expect(
      useProjectStore.getState().project?.users.entries[0]?.shell,
    ).toBe("/usr/local/bin/fish");
    expect(screen.getByLabelText("Custom shell path")).toHaveValue(
      "/usr/local/bin/fish",
    );
  });

  it("activates the nologin badge for /usr/sbin/nologin", () => {
    const user = createBlankUser("shell-nologin");
    user.shell = "/usr/sbin/nologin";
    seedProject([user]);
    renderUserCard(useProjectStore.getState().project!.users.entries[0]!);

    expect(screen.getByText("nologin")).toBeInTheDocument();
    expect(screen.queryByText("Custom shell")).toBeNull();
  });
});
