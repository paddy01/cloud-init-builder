import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MainLayout } from "../../src/layouts/MainLayout.tsx";
import { generateCloudInit } from "../../src/generators/generateCloudInit.ts";
import { importProject } from "../../src/services/projectService.ts";
import validProjectUsersFull from "../fixtures/valid-project-users-full.cib.json?raw";
import {
  createBlankUser,
  isUsersConfig,
  SUDO_PASSWORDLESS,
} from "../../src/models/users.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";
import usersDefaultOnly from "../fixtures/users-default-only.yaml?raw";
import usersNone from "../fixtures/users-none.yaml?raw";
import usersCommon from "../fixtures/users-common.yaml?raw";
import usersAdvanced from "../fixtures/users-advanced.yaml?raw";
import identityUsersFull from "../fixtures/identity-users-full.yaml?raw";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

const DISABLE_DEFAULT_CONFIRM =
  "Turn off default user? Cloud-init will omit `- default` unless you add your own users.";
const REMOVE_USER_CONFIRM =
  "Remove user? This removes the custom user card from the project.";

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

describe("MainLayout golden users fixtures", () => {
  it("matches default-only, none, common, advanced, and identity-users fixtures", () => {
    expect(
      generateCloudInit({
        users: { preserveDefault: true, entries: [] },
      }).yaml,
    ).toBe(usersDefaultOnly);

    expect(
      generateCloudInit({
        users: { preserveDefault: false, entries: [] },
      }).yaml,
    ).toBe(usersNone);

    expect(
      generateCloudInit({
        users: {
          preserveDefault: false,
          entries: [
            {
              id: "common-1",
              name: "deploy",
              gecos: "Deploy User",
              groups: ["docker", "admins"],
              shell: "/bin/bash",
              sudo: SUDO_PASSWORDLESS,
            },
          ],
        },
      }).yaml,
    ).toBe(usersCommon);

    expect(
      generateCloudInit({
        users: {
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
        },
      }).yaml,
    ).toBe(usersAdvanced);

    expect(
      generateCloudInit({
        identity: {
          hostname: "web01",
          fqdn: "web01.lan.example.com",
          prefer_fqdn_over_hostname: true,
          manage_etc_hosts: "localhost",
          timezone: "Europe/Stockholm",
          locale: "en_US.UTF-8",
        },
        users: {
          preserveDefault: true,
          entries: [
            {
              id: "full-1",
              name: "deploy",
              gecos: "Deploy User",
              groups: ["docker"],
              shell: "/bin/bash",
              sudo: SUDO_PASSWORDLESS,
              primary_group: "deploy",
              homedir: "/srv/deploy",
            },
          ],
        },
      }).yaml,
    ).toBe(identityUsersFull);
  });
});

describe("MainLayout full Phase 3 workflow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("covers defaults, cards, common/advanced controls, removal, preview tabs, and YAML", () => {
    const { container } = render(<MainLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    expect(
      screen.getByText(
        "Preserve the distro default account or add custom users for common server-template access.",
      ),
    ).toBeInTheDocument();

    const toggle = screen.getByLabelText("Preserve default user");
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.getByText("No login users configured")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    const firstUsername = screen.getAllByLabelText("Username")[0]!;
    expect(firstUsername).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    const usernameInputs = screen.getAllByLabelText("Username");
    expect(usernameInputs[1]).toHaveFocus();

    fireEvent.change(usernameInputs[0]!, { target: { value: "deploy" } });
    fireEvent.change(usernameInputs[1]!, { target: { value: "ops" } });
    fireEvent.change(screen.getAllByLabelText("Full name")[0]!, {
      target: { value: "Deploy User" },
    });
    fireEvent.change(screen.getAllByLabelText("Full name")[1]!, {
      target: { value: "Ops User" },
    });

    fireEvent.change(screen.getAllByLabelText("Additional groups")[0]!, {
      target: { value: "docker" },
    });
    fireEvent.keyDown(screen.getAllByLabelText("Additional groups")[0]!, {
      key: "Enter",
    });
    fireEvent.change(screen.getAllByLabelText("Shell")[0]!, {
      target: { value: "/bin/bash" },
    });
    fireEvent.change(screen.getAllByLabelText("Sudo rule")[0]!, {
      target: { value: "passwordless" },
    });

    fireEvent.click(screen.getAllByText("Advanced user options")[0]!);
    fireEvent.change(screen.getAllByLabelText("Primary group")[0]!, {
      target: { value: "deploy" },
    });
    fireEvent.change(screen.getAllByLabelText("Home directory")[0]!, {
      target: { value: "/srv/deploy" },
    });

    expect(screen.getAllByText("deploy").length).toBeGreaterThan(0);
    expect(screen.getByText("Deploy User")).toBeInTheDocument();
    expect(screen.getAllByText("docker").length).toBeGreaterThan(0);
    expect(screen.getByText("sudo")).toBeInTheDocument();

    const cards = screen.getAllByRole("article");
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(
      within(cards[0]!).getByRole("button", { name: "Remove user" }),
    );
    expect(window.confirm).toHaveBeenCalledWith(REMOVE_USER_CONFIRM);
    expect(screen.getAllByRole("article")).toHaveLength(2);

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(
      within(cards[1]!).getByRole("button", { name: "Remove user" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));
    fireEvent.click(screen.getByRole("tab", { name: /editor/i }));

    const previewCode = container.querySelector("aside pre code");
    const yaml = previewCode?.textContent ?? "";
    expect(yaml).toContain("users:");
    expect(yaml).toContain("- default");
    expect(yaml).toContain("name: deploy");
    expect(yaml).toContain("gecos: Deploy User");
    expect(yaml).toContain("primary_group: deploy");
    expect(yaml).toContain("homedir: /srv/deploy");
    expect(yaml).not.toContain("name: ops");
    expect(yaml).not.toContain("id:");
  });
});

describe("MainLayout reopened project workflow", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps reopened blank and duplicate names editable without new export blockers", async () => {
    const imported = await importProject(
      new File([validProjectUsersFull], "valid-project-users-full.cib.json", {
        type: "application/json",
      }),
    );
    useProjectStore.getState().loadProject(imported.project);
    useProjectStore.getState().updateIdentity({ hostname: "web01" });
    const project = useProjectStore.getState().project;
    if (!project?.users || !isUsersConfig(project.users)) {
      throw new Error("expected users config");
    }
    useProjectStore.setState({
      project: {
        ...project,
        users: {
          ...project.users,
          entries: [
            ...project.users.entries,
            createBlankUser("reopened-blank"),
            { ...createBlankUser("reopened-dup"), name: "deploy" },
          ],
        },
      },
    });

    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    const blankInput = document.getElementById(
      "user-username-reopened-blank",
    ) as HTMLInputElement;
    fireEvent.change(blankInput, { target: { value: "later" } });
    expect(blankInput).toHaveValue("later");
    expect(screen.getAllByDisplayValue("deploy").length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: /export yaml/i })).toBeEnabled();
  });
});

describe("MainLayout Phase 4 scope fence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps blank and duplicate usernames editable without new export blockers", () => {
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
            { ...second, name: "shared" },
            createBlankUser("blank-card"),
          ],
        },
      },
    });

    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    const blankInput = screen.getAllByLabelText("Username")[2]!;
    fireEvent.change(blankInput, { target: { value: "maybe-later" } });
    expect(blankInput).toHaveValue("maybe-later");

    expect(screen.getAllByLabelText("Username")).toHaveLength(3);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ssh/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/duplicate user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid username/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export yaml/i })).toBeEnabled();
  });

});
