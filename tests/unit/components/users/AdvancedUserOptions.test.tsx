import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "../../../../src/components/users/UserCard.tsx";
import {
  createBlankUser,
  isUsersConfig,
  type BuilderUser,
} from "../../../../src/models/users.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";
import {
  buildCloudInitUsers,
  mapBuilderUser,
} from "../../../../src/generators/generateUsers.ts";
import advancedFixture from "../../../fixtures/users-advanced.yaml?raw";
import { generateCloudInit } from "../../../../src/generators/generateCloudInit.ts";
import type { UsersConfig } from "../../../../src/models/users.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; msg: string }[],
};

function StoreBackedUserCard({ userId }: { userId: string }) {
  const user = useProjectStore((state) => {
    const users = state.project?.users;
    if (!isUsersConfig(users)) {
      return undefined;
    }
    return users.entries.find((entry) => entry.id === userId);
  });

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
        preserveDefault: false,
        entries: users,
      },
    },
    isDirty: true,
  });
}

function getStoreUser(userId: string): BuilderUser | undefined {
  const users = useProjectStore.getState().project?.users;
  if (!isUsersConfig(users)) {
    return undefined;
  }
  return users.entries.find((candidate) => candidate.id === userId);
}

const ADVANCED_PROJECT: UsersConfig = {
  preserveDefault: false,
  entries: [
    {
      id: "adv-1",
      name: "service",
      primary_group: "service",
      homedir: "/srv/service",
      no_create_home: true,
      shell: "/bin/bash",
    },
    {
      id: "adv-2",
      name: "daemon",
      primary_group: "daemon",
      homedir: "/var/lib/daemon",
      system: true,
      shell: "/usr/sbin/nologin",
    },
  ],
};

describe("AdvancedUserOptions disclosure", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("renders collapsed native details without an open attribute", () => {
    const user = createBlankUser("details-user");
    seedProject([user]);
    renderUserCard(user);

    const details = screen.getByText("Advanced user options").closest("details");
    expect(details).toBeInTheDocument();
    expect(details).not.toHaveAttribute("open");
  });

  it("uses exact approved advanced copy verbatim", async () => {
    const user = createBlankUser("copy-user");
    seedProject([user]);
    renderUserCard(user);

    await userEvent.click(screen.getByText("Advanced user options"));

    expect(screen.getByLabelText("Primary group")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary group")).toHaveAttribute(
      "placeholder",
      "e.g. deploy",
    );
    expect(
      screen.getByText("Optional. Sets `primary_group` for this user."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Create home directory")).toBeInTheDocument();
    expect(
      screen.getByText("Turn this off to emit `no_create_home: true`."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Home directory")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. /srv/deploy")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Optional override for the generated home directory path.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("System user")).toBeInTheDocument();
    expect(
      screen.getByText("Marks the account as a system user in cloud-init."),
    ).toBeInTheDocument();
  });

  it("stays collapsed after reopening a project-backed card", () => {
    const user = createBlankUser("reopen-user");
    user.primary_group = "ops";
    seedProject([user]);
    renderUserCard(user);

    const details = screen.getByText("Advanced user options").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Primary group")).toHaveValue("ops");
  });
});

describe("AdvancedUserOptions create-home inversion", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("emits only no_create_home: true when create home is unchecked", async () => {
    const user = createBlankUser("create-home-user");
    user.name = "deploy";
    seedProject([user]);
    renderUserCard(user);

    await userEvent.click(screen.getByText("Advanced user options"));
    const createHome = screen.getByLabelText("Create home directory");
    expect(createHome).toBeChecked();

    await userEvent.click(createHome);
    expect(getStoreUser(user.id)?.no_create_home).toBe(true);

    const mapped = mapBuilderUser(getStoreUser(user.id)!);
    expect(mapped?.no_create_home).toBe(true);
    expect(mapped).not.toHaveProperty("homedir");
  });
});

describe("AdvancedUserOptions system user projection", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("disables create-home visually when system user is checked", async () => {
    const user = createBlankUser("system-ui");
    user.name = "daemon";
    user.homedir = "/var/lib/daemon";
    seedProject([user]);
    renderUserCard(user);

    await userEvent.click(screen.getByText("Advanced user options"));
    const createHome = screen.getByLabelText("Create home directory");
    await userEvent.click(screen.getByLabelText("System user"));

    expect(createHome).toBeDisabled();
    expect(createHome).not.toBeChecked();
    expect(getStoreUser(user.id)?.homedir).toBe("/var/lib/daemon");
  });

  it("retains homedir in project state across system toggles", async () => {
    const user = createBlankUser("system-retain");
    user.name = "daemon";
    user.homedir = "/var/lib/daemon";
    seedProject([user]);
    renderUserCard(user);

    await userEvent.click(screen.getByText("Advanced user options"));
    await userEvent.click(screen.getByLabelText("System user"));
    expect(mapBuilderUser(getStoreUser(user.id)!)?.system).toBe(true);
    expect(mapBuilderUser(getStoreUser(user.id)!)).not.toHaveProperty(
      "homedir",
    );
    expect(mapBuilderUser(getStoreUser(user.id)!)).not.toHaveProperty(
      "no_create_home",
    );

    await userEvent.click(screen.getByLabelText("System user"));
    expect(getStoreUser(user.id)?.homedir).toBe("/var/lib/daemon");
    expect(mapBuilderUser(getStoreUser(user.id)!)).toMatchObject({
      homedir: "/var/lib/daemon",
    });
  });

  it("updates primary group and homedir through the store", async () => {
    const user = createBlankUser("advanced-fields");
    user.name = "service";
    seedProject([user]);
    renderUserCard(user);

    await userEvent.click(screen.getByText("Advanced user options"));
    fireEvent.change(screen.getByLabelText("Primary group"), {
      target: { value: "service" },
    });
    fireEvent.change(screen.getByLabelText("Home directory"), {
      target: { value: "/srv/service" },
    });

    expect(getStoreUser(user.id)).toMatchObject({
      primary_group: "service",
      homedir: "/srv/service",
    });
  });
});

describe("AdvancedUserOptions golden fixture", () => {
  it("matches users-advanced.yaml byte-for-byte without builder ids", () => {
    const yaml = generateCloudInit({ users: ADVANCED_PROJECT }).yaml;
    expect(yaml).toBe(advancedFixture);
    expect(yaml).not.toContain("id:");
    expect(buildCloudInitUsers(ADVANCED_PROJECT)).toEqual([
      {
        name: "service",
        primary_group: "service",
        shell: "/bin/bash",
        homedir: "/srv/service",
        no_create_home: true,
      },
      {
        name: "daemon",
        primary_group: "daemon",
        shell: "/usr/sbin/nologin",
        system: true,
      },
    ]);
  });
});
