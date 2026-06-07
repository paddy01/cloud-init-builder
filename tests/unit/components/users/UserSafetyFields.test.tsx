import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "../../../../src/components/users/UserCard.tsx";
import { buildCloudInitUsers } from "../../../../src/generators/generateUsers.ts";
import {
  createBlankUser,
  isUsersConfig,
  type BuilderUser,
} from "../../../../src/models/users.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const BCRYPT_HASH =
  "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const SSH_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
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

function seedProject(users: BuilderUser[]) {
  const project = useProjectStore.getState().project;
  if (!project) {
    throw new Error("expected project");
  }

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

function getStoreUser(userId: string): BuilderUser | undefined {
  const users = useProjectStore.getState().project?.users;
  if (!isUsersConfig(users)) {
    return undefined;
  }
  return users.entries.find((candidate) => candidate.id === userId);
}

function getGeneratedYamlForUser(): string {
  const project = useProjectStore.getState().project;
  if (!project?.users || !isUsersConfig(project.users)) {
    throw new Error("expected users config");
  }

  return JSON.stringify(buildCloudInitUsers(project.users));
}

describe("UserSafetyFields authentication controls", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("renders authentication placement, labels, help, and masked password input", () => {
    const user = createBlankUser("safety-user");
    user.name = "deploy";
    seedProject([user]);
    render(<StoreBackedUserCard userId={user.id} />);

    expect(screen.getByRole("heading", { name: "Authentication" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Regular login users need a supported password hash or at least one valid SSH key.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Hashed password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByText("Password login locked")).toBeInTheDocument();
    expect(
      screen.getByText(
        "New users start locked. Add a supported password hash to enable password login.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show hash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add SSH key" })).toBeInTheDocument();
    expect(screen.getByText("No SSH keys added.")).toBeInTheDocument();
  });

  it("commits only supported password hashes and omits unsupported drafts from canonical state", async () => {
    const user = createBlankUser("password-user");
    user.name = "deploy";
    seedProject([user]);
    render(<StoreBackedUserCard userId={user.id} />);

    const passwordInput = screen.getByLabelText("Hashed password");
    await userEvent.type(passwordInput, "hunter2");
    fireEvent.blur(passwordInput);

    expect(getStoreUser(user.id)?.passwd).toBeUndefined();
    expect(getStoreUser(user.id)?.lock_passwd).toBe(true);
    expect(getGeneratedYamlForUser()).not.toContain("hunter2");

    fireEvent.change(passwordInput, { target: { value: BCRYPT_HASH } });
    fireEvent.blur(passwordInput);

    expect(getStoreUser(user.id)?.passwd).toBe(BCRYPT_HASH);
    expect(getStoreUser(user.id)?.lock_passwd).toBe(false);
    expect(getGeneratedYamlForUser()).toContain(BCRYPT_HASH);
    expect(getGeneratedYamlForUser()).toContain('"lock_passwd":false');
  });

  it("relocks the user and removes passwd from YAML when the hash is cleared", async () => {
    const user = createBlankUser("clear-password");
    user.name = "deploy";
    user.passwd = BCRYPT_HASH;
    user.lock_passwd = false;
    seedProject([user]);
    render(<StoreBackedUserCard userId={user.id} />);

    const passwordInput = screen.getByLabelText("Hashed password");
    fireEvent.change(passwordInput, { target: { value: "" } });
    fireEvent.blur(passwordInput);

    expect(getStoreUser(user.id)?.passwd).toBeUndefined();
    expect(getStoreUser(user.id)?.lock_passwd).toBe(true);
    expect(getGeneratedYamlForUser()).not.toContain('"passwd"');
    expect(getGeneratedYamlForUser()).toContain('"lock_passwd":true');
  });

  it("adds stable SSH rows and emits entered keys in YAML without builder IDs", async () => {
    const user = createBlankUser("ssh-user");
    user.name = "deploy";
    seedProject([user]);
    render(<StoreBackedUserCard userId={user.id} />);

    await userEvent.click(screen.getByRole("button", { name: "Add SSH key" }));

    const storeUser = getStoreUser(user.id);
    expect(storeUser?.ssh_authorized_keys).toHaveLength(1);
    const rowId = storeUser?.ssh_authorized_keys?.[0]?.id;
    expect(rowId).toBeTruthy();

    const sshInput = screen.getByPlaceholderText("ssh-ed25519 AAAA... user@host");
    await userEvent.type(sshInput, SSH_KEY);

    expect(getStoreUser(user.id)?.ssh_authorized_keys?.[0]?.value).toBe(SSH_KEY);
    const yaml = getGeneratedYamlForUser();
    expect(yaml).toContain(SSH_KEY);
    expect(yaml).not.toContain(rowId!);
  });

  it("toggles password visibility with Show hash and Hide hash", async () => {
    const user = createBlankUser("toggle-password");
    user.name = "deploy";
    seedProject([user]);
    render(<StoreBackedUserCard userId={user.id} />);

    const passwordInput = screen.getByLabelText("Hashed password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Show hash" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Hide hash" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
