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
import * as yamlService from "../../src/services/yamlService.ts";
import validProjectUsersFull from "../fixtures/valid-project-users-full.cib.json?raw";
import {
  createBlankUser,
  isUsersConfig,
  SUDO_PASSWORDLESS,
} from "../../src/models/users.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";
import { validateConfig } from "../../src/validators/validateConfig.ts";
import usersDefaultOnly from "../fixtures/users-default-only.yaml?raw";
import usersNone from "../fixtures/users-none.yaml?raw";
import usersCommon from "../fixtures/users-common.yaml?raw";
import usersAdvanced from "../fixtures/users-advanced.yaml?raw";
import identityUsersFull from "../fixtures/identity-users-full.yaml?raw";
import identityUsersSafetyValid from "../fixtures/identity-users-safety-valid.yaml?raw";
import { isCommandsConfig } from "../../src/models/commands.ts";
import { CURRENT_FORMAT_VERSION } from "../../src/models/project.ts";
import { copyCloudInitYaml } from "../../src/services/yamlService.ts";

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

describe("MainLayout commands workflow", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to Commands with Run-first tabs and stage-scoped editing", () => {
    render(<MainLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Commands" }));

    expect(screen.getByRole("heading", { name: "Commands" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Identity" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Run commands/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("First-boot runtime commands")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "echo hello" },
    });

    fireEvent.click(screen.getByRole("tab", { name: /Boot commands/i }));
    expect(
      screen.getByText("Boot commands run early on every boot"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add boot command" }));

    const project = useProjectStore.getState().project;
    expect(project?.commands?.runcmd).toHaveLength(1);
    expect(project?.commands?.bootcmd).toHaveLength(1);
  });

  it("projects commands into preview YAML through the shared generator input", async () => {
    vi.useFakeTimers();
    const { container } = render(<MainLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Commands" }));
    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "apt-get update" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Boot commands/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add boot command" }));
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "mkdir -p /run/cloud-init-builder" },
    });

    const project = useProjectStore.getState().project!;
    const expectedYaml = generateCloudInit({
      identity: project.identity,
      users: isUsersConfig(project.users) ? project.users : undefined,
      commands: isCommandsConfig(project.commands) ? project.commands : undefined,
    }).yaml;

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).toContain("bootcmd:");
    expect(previewCode?.textContent).toContain("runcmd:");
    expect(previewCode?.textContent).toContain("apt-get update");
    expect(previewCode?.textContent).toContain("mkdir -p /run/cloud-init-builder");
    expect(previewCode?.textContent).toBe(expectedYaml);
    vi.useRealTimers();
  });

  it("marks only the active sidebar section with aria-current when Commands is selected", () => {
    render(<MainLayout />);

    const nav = screen.getByRole("navigation");
    const identityButton = within(nav).getByRole("button", { name: "Identity" });
    const usersButton = within(nav).getByRole("button", { name: "Users" });
    const commandsButton = within(nav).getByRole("button", { name: "Commands" });

    fireEvent.click(commandsButton);

    expect(commandsButton).toHaveAttribute("aria-current", "page");
    expect(identityButton).not.toHaveAttribute("aria-current");
    expect(usersButton).not.toHaveAttribute("aria-current");
  });
});

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

    const commandsButton = within(nav).getByRole("button", { name: "Commands" });
    expect(commandsButton).not.toHaveAttribute("aria-current");

    const exportRow = within(nav).getByText("Export").closest("span");
    expect(exportRow?.className).toContain("text-gray-400");
    expect(exportRow?.className).toContain("cursor-not-allowed");

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
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");
  });
});

describe("MainLayout export gating", () => {
  const VALID_SSH_KEY =
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";

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

  it("blocks export for duplicate usernames and reveals the Users summary on activation", async () => {
    vi.useRealTimers();
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
            {
              ...first,
              name: "shared",
              ssh_authorized_keys: [{ id: "k1", value: VALID_SSH_KEY }],
            },
            {
              ...second,
              name: "shared",
              ssh_authorized_keys: [{ id: "k2", value: VALID_SSH_KEY }],
            },
          ],
        },
      },
    });

    const exportSpy = vi.spyOn(yamlService, "exportCloudInitYaml");

    render(<MainLayout />);
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(exportBtn);

    expect(exportSpy).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    });
    expect(screen.getByText("Users need attention")).toBeInTheDocument();
    expect(
      document.getElementById("users-validation-summary-heading"),
    ).toHaveFocus();
    expect(
      screen.getAllByText(
        "Export is blocked. Review the highlighted user errors.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("blocks export for unsupported password draft when SSH auth is otherwise valid", () => {
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
            {
              id: "ssh-user",
              name: "deploy",
              shell: "/bin/bash",
              ssh_authorized_keys: [{ id: "key-1", value: VALID_SSH_KEY }],
            },
          ],
        },
      },
    });

    const { container } = render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    const passwordInput = screen.getByLabelText("Hashed password");
    fireEvent.change(passwordInput, { target: { value: "hunter2" } });
    fireEvent.blur(passwordInput);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();
    expect(within(aside!).getByText(/validation error/i)).toBeInTheDocument();
    expect(
      within(aside!).getByText(
        /Export blocked: enter a supported password hash/i,
      ),
    ).toBeInTheDocument();

    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).not.toContain("hunter2");

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(exportBtn);

    expect(screen.getByText("Users need attention")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Export blocked: enter a supported password hash/i)
        .length,
    ).toBeGreaterThan(0);
    expect(
      document.getElementById("users-validation-summary-heading"),
    ).toHaveFocus();
  });

  it("recovers export without moving focus when errors clear", async () => {
    const blank = createBlankUser("fix-name");
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
            {
              ...blank,
              gecos: "Configured without username",
              ssh_authorized_keys: [{ id: "k1", value: VALID_SSH_KEY }],
            },
          ],
        },
      },
    });

    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    fireEvent.click(exportBtn);

    const summaryHeading = document.getElementById(
      "users-validation-summary-heading",
    );
    expect(summaryHeading).toHaveFocus();

    act(() => {
      useProjectStore.getState().updateUser("fix-name", { name: "deploy" });
    });

    expect(
      validateConfig(useProjectStore.getState().project).filter(
        (issue) => issue.severity === "error",
      ),
    ).toEqual([]);

    await vi.waitFor(() => {
      expect(
        screen.getByRole("button", { name: /export yaml/i }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });
    expect(screen.queryByText("Users need attention")).toBeNull();
    expect(document.activeElement).not.toBe(exportBtn);
  });
});

describe("MainLayout Phase 4 regression hardening", () => {
  const BCRYPT_HASH =
    "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const SSH_KEY_A =
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
  const SSH_KEY_B = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB deploy@host";
  const writeTextMock = vi.fn();

  function seedSafetyProject() {
    const projectBefore = useProjectStore.getState().project;
    if (!projectBefore?.users || !isUsersConfig(projectBefore.users)) {
      throw new Error("expected users config");
    }

    useProjectStore.setState({
      project: {
        ...projectBefore,
        formatVersion: CURRENT_FORMAT_VERSION,
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
              id: "user-unlocked",
              name: "deploy",
              shell: "/bin/bash",
              lock_passwd: false,
              passwd: BCRYPT_HASH,
              ssh_authorized_keys: [
                { id: "key-a", value: SSH_KEY_A },
                { id: "key-b", value: SSH_KEY_B },
              ],
            },
            {
              id: "user-locked",
              name: "ops",
              shell: "/bin/bash",
              lock_passwd: true,
              ssh_authorized_keys: [{ id: "key-c", value: SSH_KEY_A }],
            },
          ],
        },
      },
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    seedSafetyProject();
    vi.spyOn(window, "confirm");
    writeTextMock.mockReset();
    vi.stubGlobal("navigator", { clipboard: { writeText: writeTextMock } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("matches preview and copy output to direct generation for safety fixtures", async () => {
    const project = useProjectStore.getState().project!;
    const expectedYaml = generateCloudInit({
      identity: project.identity,
      users: isUsersConfig(project.users) ? project.users : undefined,
    }).yaml;
    expect(expectedYaml).toBe(identityUsersSafetyValid);

    const { container } = render(<MainLayout />);
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const previewCode = container.querySelector("aside pre code");
    expect(previewCode?.textContent).toBe(expectedYaml);

    writeTextMock.mockResolvedValue(undefined);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy yaml/i }));
    });
    const [copiedYaml] = writeTextMock.mock.calls[0] ?? [];
    expect(copiedYaml).toBe(expectedYaml);

    const copiedViaService = await copyCloudInitYaml(project);
    expect(copiedViaService).toBe(true);
    const lastCopyCall =
      writeTextMock.mock.calls[writeTextMock.mock.calls.length - 1];
    expect(lastCopyCall?.[0]).toBe(expectedYaml);
  });

  it("blocks reserved usernames and reveals the summary with focus on activation", async () => {
    vi.useRealTimers();
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
            {
              id: "root-user",
              name: "root",
              shell: "/bin/bash",
              ssh_authorized_keys: [{ id: "k1", value: SSH_KEY_A }],
            },
          ],
        },
      },
    });

    const exportSpy = vi.spyOn(yamlService, "exportCloudInitYaml");
    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exportBtn);
    expect(exportSpy).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(screen.getByText("Users need attention")).toBeInTheDocument();
    });
    expect(
      document.getElementById("users-validation-summary-heading"),
    ).toHaveFocus();
    expect(screen.queryByText(/export succeeded/i)).toBeNull();
  });

  it("allows system and nologin users to export without authentication methods", async () => {
    vi.useRealTimers();
    const projectBefore = useProjectStore.getState().project;
    if (!projectBefore?.users || !isUsersConfig(projectBefore.users)) {
      throw new Error("expected users config");
    }

    useProjectStore.setState({
      project: {
        ...projectBefore,
        users: {
          preserveDefault: false,
          entries: [
            {
              id: "system-user",
              name: "svc",
              system: true,
              shell: "/usr/sbin/nologin",
              homedir: "/var/lib/svc",
              lock_passwd: true,
            },
          ],
        },
      },
    });

    const exportSpy = vi
      .spyOn(yamlService, "exportCloudInitYaml")
      .mockReturnValue(true);

    render(<MainLayout />);
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exportBtn);
    expect(exportSpy).toHaveBeenCalledOnce();
  });

  it("reveals configured-nameless and auth-required errors without aria-invalid on warnings", async () => {
    vi.useRealTimers();
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
            {
              id: "no-auth",
              name: "deploy",
              shell: "/bin/bash",
              lock_passwd: true,
            },
            {
              id: "nameless",
              gecos: "Configured without username",
              shell: "/bin/bash",
              ssh_authorized_keys: [{ id: "k1", value: SSH_KEY_A }],
            },
          ],
        },
      },
    });

    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByRole("button", { name: /export yaml/i }));

    await vi.waitFor(() => {
      expect(screen.getByText("Users need attention")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Export blocked: add a supported password hash or at least one valid SSH key for this login user.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Export blocked: enter a username or clear the other fields to omit this card.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps aria-invalid off warning-only uppercase usernames", () => {
    vi.useRealTimers();
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
            {
              id: "upper-warning",
              name: "Deploy",
              shell: "/bin/bash",
              passwd: BCRYPT_HASH,
              lock_passwd: false,
            },
          ],
        },
      },
    });

    render(<MainLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    const usernameInput = screen.getByLabelText("Username");
    fireEvent.blur(usernameInput);
    expect(usernameInput).not.toHaveAttribute("aria-invalid");
    expect(
      screen.getByText(/Warning: Lowercase usernames are recommended/i),
    ).toBeInTheDocument();
  });
});
