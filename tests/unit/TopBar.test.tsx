import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserValidationProvider } from "../../src/components/users/UserValidationProvider.tsx";
import { EditorNavigationProvider } from "../../src/layouts/EditorNavigationProvider.tsx";
import type { EditorSection } from "../../src/layouts/editorNavigation.ts";
import { TopBar } from "../../src/layouts/TopBar.tsx";
import { useProjectStore } from "../../src/state/projectStore.ts";
import { createDefaultProject } from "../../src/models/project.ts";
import * as projectService from "../../src/services/projectService.ts";
import * as yamlService from "../../src/services/yamlService.ts";
import { generateCloudInit } from "../../src/generators/generateCloudInit.ts";
import { isUsersConfig } from "../../src/models/users.ts";
import identityUsersSafetyValid from "../fixtures/identity-users-safety-valid.yaml?raw";

function renderTopBar(
  activeSection: EditorSection = "identity",
  setActiveSection = vi.fn(),
) {
  return render(
    <UserValidationProvider>
      <EditorNavigationProvider
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      >
        <TopBar />
      </EditorNavigationProvider>
    </UserValidationProvider>,
  );
}

describe("TopBar Open dirty guard (WR-01)", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm");
    vi.spyOn(window, "alert").mockImplementation(() => {});
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

    const { container } = renderTopBar();
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

    const { container } = renderTopBar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [new File(["{}"], "x.cib.json", { type: "application/json" })],
        },
      });
    });

    await vi.waitFor(() => {
      expect(useProjectStore.getState().project?.metadata.name).toBe("Imported");
    });
    expect(projectService.importProject).toHaveBeenCalledOnce();
    expect(window.alert).not.toHaveBeenCalled();
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

    renderTopBar();
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it("does NOT call markSaved when exportProject returns false", async () => {
    useProjectStore.setState({
      project: createDefaultProject("Test"),
      isDirty: true,
    });
    vi.spyOn(projectService, "exportProject").mockReturnValue(false);

    renderTopBar();
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

    renderTopBar();

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

    renderTopBar();

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

  it("is natively disabled with no project loaded", () => {
    renderTopBar();

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toBeDisabled();
    expect(exportBtn).not.toHaveAttribute("aria-disabled", "true");
  });

  it("uses aria-disabled on a fresh project missing hostname", () => {
    useProjectStore.getState().newProject("Test");
    renderTopBar();

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).not.toBeDisabled();
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");

    const wrapper = exportBtn.closest("span");
    expect(wrapper?.getAttribute("title")).toContain("Cannot export yet");
    expect(wrapper?.getAttribute("title")).toContain("1 validation error");
  });

  it("enables after updateIdentity sets hostname", () => {
    useProjectStore.getState().newProject("Test");
    const { rerender } = renderTopBar();

    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    rerender(
      <UserValidationProvider>
        <EditorNavigationProvider
          activeSection="identity"
          setActiveSection={vi.fn()}
        >
          <TopBar />
        </EditorNavigationProvider>
      </UserValidationProvider>,
    );

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).not.toHaveAttribute("aria-disabled", "true");
  });

  it("calls exportCloudInitYaml without markSaved when valid", async () => {
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    const exportSpy = vi
      .spyOn(yamlService, "exportCloudInitYaml")
      .mockReturnValue(true);

    renderTopBar();
    expect(useProjectStore.getState().isDirty).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /export yaml/i }));

    expect(exportSpy).toHaveBeenCalledWith(useProjectStore.getState().project);
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it("does not call exportCloudInitYaml on blocked activation", async () => {
    useProjectStore.getState().newProject("Test");
    const exportSpy = vi.spyOn(yamlService, "exportCloudInitYaml");

    renderTopBar();
    await userEvent.click(screen.getByRole("button", { name: /export yaml/i }));

    expect(exportSpy).not.toHaveBeenCalled();
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

  it("is natively disabled with no project loaded", () => {
    renderTopBar();

    const copyBtn = screen.getByRole("button", { name: /copy yaml/i });
    expect(copyBtn).toBeDisabled();
    expect(copyBtn).not.toHaveAttribute("aria-disabled", "true");
  });

  it("uses aria-disabled on a fresh project missing hostname", () => {
    useProjectStore.getState().newProject("Test");
    renderTopBar();

    const copyBtn = screen.getByRole("button", { name: /copy yaml/i });
    expect(copyBtn).not.toBeDisabled();
    expect(copyBtn).toHaveAttribute("aria-disabled", "true");

    const wrapper = copyBtn.closest("span");
    expect(wrapper?.getAttribute("title")).toContain("Cannot copy yet");
    expect(wrapper?.getAttribute("title")).toContain("1 validation error");
    expect(wrapper?.getAttribute("title")).toContain("prevents YAML output");
  });

  it("does not call copyCloudInitYaml on blocked activation", async () => {
    useProjectStore.getState().newProject("Test");
    const copySpy = vi.spyOn(yamlService, "copyCloudInitYaml");

    renderTopBar();
    await userEvent.click(screen.getByRole("button", { name: /copy yaml/i }));

    expect(copySpy).not.toHaveBeenCalled();
  });

  it("shows blocked-copy feedback then clears after 4000 ms", async () => {
    vi.useFakeTimers();
    useProjectStore.getState().newProject("Test");

    renderTopBar();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy yaml/i }));
    });

    expect(
      screen.getByText("Copy blocked. Fix validation errors before copying YAML."),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(
      screen.queryByText("Copy blocked. Fix validation errors before copying YAML."),
    ).not.toBeInTheDocument();
  });

  it("navigates to Users and blocks copy for reserved usernames", async () => {
    const validSsh =
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
    const setActiveSection = vi.fn();
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
          users: {
            preserveDefault: true,
            entries: [
              {
                id: "root-user",
                name: "root",
                shell: "/bin/bash",
                ssh_authorized_keys: [{ id: "k1", value: validSsh }],
              },
            ],
          },
        },
      });
    });

    const copySpy = vi.spyOn(yamlService, "copyCloudInitYaml");
    renderTopBar("identity", setActiveSection);
    const copyBtn = screen.getByRole("button", { name: /copy yaml/i });
    expect(copyBtn).toHaveAttribute("aria-disabled", "true");
    expect(copyBtn.closest("span")?.getAttribute("title")).toContain(
      "user validation error prevents YAML output",
    );

    await userEvent.click(copyBtn);
    expect(copySpy).not.toHaveBeenCalled();
    expect(setActiveSection).toHaveBeenCalledWith("users");
  });

  it("shows success feedback then clears after 2000 ms", async () => {
    vi.useFakeTimers();
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
    });
    writeTextMock.mockResolvedValue(undefined);

    renderTopBar();
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

    renderTopBar();
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
    renderTopBar();
    const heading = screen.getByRole("heading", {
      level: 1,
      name: /cloud-init builder/i,
    });
    expect(heading.className).toContain("font-semibold");
    expect(heading.className).not.toContain("font-bold");
  });
});

describe("TopBar export gating", () => {
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

  it("blocks export for duplicate usernames with count-aware user copy", () => {
    const validSsh =
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
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

    renderTopBar();
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");
    expect(exportBtn.closest("span")?.getAttribute("title")).toContain(
      "2 user validation errors",
    );
  });

  it("allows warning-only uppercase usernames to export", async () => {
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
          users: {
            preserveDefault: true,
            entries: [
              {
                id: "upper-a",
                name: "Deploy",
                shell: "/bin/bash",
                passwd: "$6$rounds=5000$somesalt$JE8633wNOuGQ0Nr6YpvNR5shWgI3A0T.UrBxMhUaNJW4n5FZn1eX2g09dZ3gB1lZg2y0NnQlD3za5FyCzrE7mA",
                lock_passwd: false,
              },
            ],
          },
        },
      });
    });
    const exportSpy = vi
      .spyOn(yamlService, "exportCloudInitYaml")
      .mockReturnValue(true);

    renderTopBar();
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).not.toHaveAttribute("aria-disabled", "true");

    await userEvent.click(exportBtn);
    expect(exportSpy).toHaveBeenCalledOnce();
  });

  it("navigates to Users and blocks export for reserved usernames", async () => {
    const validSsh =
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
    const setActiveSection = vi.fn();
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
          users: {
            preserveDefault: true,
            entries: [
              {
                id: "root-user",
                name: "root",
                shell: "/bin/bash",
                ssh_authorized_keys: [{ id: "k1", value: validSsh }],
              },
            ],
          },
        },
      });
    });

    const exportSpy = vi.spyOn(yamlService, "exportCloudInitYaml");
    renderTopBar("identity", setActiveSection);
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(exportBtn);
    expect(exportSpy).not.toHaveBeenCalled();
    expect(setActiveSection).toHaveBeenCalledWith("users");
  });

  it("navigates to Commands and blocks export for empty shell commands", async () => {
    const setActiveSection = vi.fn();
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
          commands: {
            bootcmd: [],
            runcmd: [{ id: "empty-shell", form: "shell", command: "" }],
          },
        },
      });
    });

    const exportSpy = vi.spyOn(yamlService, "exportCloudInitYaml");
    renderTopBar("identity", setActiveSection);
    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(exportBtn);
    expect(exportSpy).not.toHaveBeenCalled();
    expect(setActiveSection).toHaveBeenCalledWith("commands");
  });

  it("allows system users without authentication to export", async () => {
    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.getState().updateIdentity({ hostname: "web01" });
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
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
    });

    const exportSpy = vi
      .spyOn(yamlService, "exportCloudInitYaml")
      .mockReturnValue(true);
    renderTopBar();
    await userEvent.click(screen.getByRole("button", { name: /export yaml/i }));
    expect(exportSpy).toHaveBeenCalledOnce();
  });

  it("copies YAML that matches direct generation for the safety fixture", async () => {
    const BCRYPT_HASH =
      "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const SSH_KEY_A =
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";
    const SSH_KEY_B = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB deploy@host";

    useProjectStore.getState().newProject("Test");
    act(() => {
      useProjectStore.setState({
        project: {
          ...useProjectStore.getState().project!,
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
    });

    const project = useProjectStore.getState().project!;
    const expectedYaml = generateCloudInit({
      identity: project.identity,
      users: isUsersConfig(project.users) ? project.users : undefined,
    }).yaml;
    expect(expectedYaml).toBe(identityUsersSafetyValid);

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: writeTextMock } });

    renderTopBar();
    await userEvent.click(screen.getByRole("button", { name: /copy yaml/i }));
    expect(writeTextMock).toHaveBeenCalledWith(expectedYaml);
    expect(screen.queryByText(/export succeeded/i)).toBeNull();
  });
});

describe("TopBar project rename", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens inline editor from Rename project beside the readable title", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Project name" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));

    expect(screen.queryByText("Untitled Project")).not.toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Project name" });
    expect(input).toHaveValue("Untitled Project");
    expect(screen.getByRole("button", { name: "Save project name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel project rename" })).toBeInTheDocument();
  });

  it("commits trimmed name on Enter, dirties project, and updates updatedAt", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    const beforeUpdatedAt = useProjectStore.getState().project!.metadata.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 5));
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "  Demo Server  ");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText("Demo Server")).toBeInTheDocument();
    expect(useProjectStore.getState().project?.metadata.name).toBe("Demo Server");
    expect(useProjectStore.getState().isDirty).toBe(true);
    expect(useProjectStore.getState().project?.metadata.updatedAt).not.toBe(beforeUpdatedAt);
    expect(screen.getByTitle("Unsaved changes")).toBeInTheDocument();
  });

  it("commits via Save project name despite input blur during click", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "Demo Server");
    await userEvent.click(screen.getByRole("button", { name: "Save project name" }));

    expect(screen.getByText("Demo Server")).toBeInTheDocument();
    expect(useProjectStore.getState().project?.metadata.name).toBe("Demo Server");
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it("cancels on Escape without dirtying or changing updatedAt", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    const beforeUpdatedAt = useProjectStore.getState().project!.metadata.updatedAt;
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "Demo Server");
    await userEvent.keyboard("{Escape}");

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(useProjectStore.getState().project?.metadata.name).toBe("Untitled Project");
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.getState().project?.metadata.updatedAt).toBe(beforeUpdatedAt);
  });

  it("cancels via Cancel project rename without dirtying", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "Demo Server");
    await userEvent.click(screen.getByRole("button", { name: "Cancel project rename" }));

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it("cancels on blur without committing", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "Demo Server");
    fireEvent.blur(input);

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(useProjectStore.getState().project?.metadata.name).toBe("Untitled Project");
    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it("keeps previous name for whitespace-only rename attempts", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "   ");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(useProjectStore.getState().project?.metadata.name).toBe("Untitled Project");
    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it("no-ops unchanged trimmed commits", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    const beforeUpdatedAt = useProjectStore.getState().project!.metadata.updatedAt;
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "  Untitled Project  ");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.getState().project?.metadata.updatedAt).toBe(beforeUpdatedAt);
  });

  it("accepts punctuation-heavy names without validation errors", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "!!! @@@ ###");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText("!!! @@@ ###")).toBeInTheDocument();
    expect(useProjectStore.getState().project?.metadata.name).toBe("!!! @@@ ###");
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it("exposes full committed name via title and truncation classes for long names", () => {
    const longName =
      "Homelab Proxmox Template With A Very Long Descriptive Project Name";
    useProjectStore.getState().newProject(longName);
    renderTopBar();

    const title = screen.getByText(longName);
    expect(title).toHaveAttribute("title", longName);
    expect(title.className).toContain("truncate");
    expect(title.className).toContain("whitespace-nowrap");
    expect(title.className).toContain("overflow-hidden");
    expect(title.className).toContain("text-ellipsis");
  });

  it("does not show rename success toast or banner copy", async () => {
    useProjectStore.getState().newProject("Untitled Project");
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "Rename project" }));
    const input = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(input);
    await userEvent.type(input, "Demo Server");
    await userEvent.keyboard("{Enter}");

    expect(screen.queryByText(/renamed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });

  it("still creates Untitled Project immediately from New without a naming prompt", async () => {
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: /^new$/i }));

    expect(screen.getByText("Untitled Project")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Project name" })).not.toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
