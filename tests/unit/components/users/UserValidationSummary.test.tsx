import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect, type ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { UserCard } from "../../../../src/components/users/UserCard.tsx";
import { UserCardList } from "../../../../src/components/users/UserCardList.tsx";
import {
  UserValidationProvider,
  useUserValidation,
} from "../../../../src/components/users/UserValidationContext.tsx";
import {
  USERS_VALIDATION_SUMMARY_HEADING_ID,
  UserValidationSummary,
} from "../../../../src/components/users/UserValidationSummary.tsx";
import {
  createBlankUser,
  isUsersConfig,
  type BuilderUser,
} from "../../../../src/models/users.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const SSH_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z deploy@host";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

function RevealAllHarness({ children }: { children: ReactNode }) {
  const { revealAllUserValidation } = useUserValidation();

  useLayoutEffect(() => {
    revealAllUserValidation();
  }, [revealAllUserValidation]);

  return (
    <>
      <UserValidationSummary />
      {children}
    </>
  );
}

function seedUsers(entries: BuilderUser[]) {
  const project = useProjectStore.getState().project;
  if (!project?.users || !isUsersConfig(project.users)) {
    throw new Error("expected users config");
  }

  useProjectStore.setState({
    project: {
      ...project,
      users: {
        preserveDefault: true,
        entries,
      },
    },
    isDirty: true,
  });
}

describe("UserValidationSummary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when there are no visible issues", () => {
    const blank = createBlankUser("quiet-user");
    seedUsers([blank]);

    render(
      <UserValidationProvider>
        <UserValidationSummary />
      </UserValidationProvider>,
    );

    expect(screen.queryByText("Users need attention")).toBeNull();
    expect(screen.queryByText("User safety warnings")).toBeNull();
  });

  it("renders errors-only heading, counts, and classes after reveal-all", async () => {
    const blank = createBlankUser("missing-name");
    const user = { ...blank, gecos: "Configured without username" };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <div />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Users need attention")).toBeInTheDocument();
    });
    expect(screen.getByText("1 export-blocking error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select an issue to move to the affected user field.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /New user 1: Export blocked: enter a username/i,
      }),
    ).toBeInTheDocument();

    const section = screen.getByRole("region", { name: "Users need attention" });
    expect(section.className).toContain("border-red-200");
    expect(section.className).toContain("bg-red-50");
  });

  it("renders warnings-only heading and amber classes", async () => {
    const blank = createBlankUser("upper-user");
    const user = {
      ...blank,
      name: "Deploy",
      ssh_authorized_keys: [{ id: "key-1", value: SSH_KEY }],
    };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <div />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("User safety warnings")).toBeInTheDocument();
    });
    expect(screen.getByText("1 warning")).toBeInTheDocument();
    const section = screen.getByRole("region", { name: "User safety warnings" });
    expect(section.className).toContain("border-amber-200");
    expect(section.className).toContain("bg-amber-50");
  });

  it("renders mixed severity with error-first heading and both counts", async () => {
    const blank = createBlankUser("mixed-user");
    const user = { ...blank, name: "Deploy" };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <div />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Users need attention")).toBeInTheDocument();
    });
    expect(screen.getByText("1 export-blocking error")).toBeInTheDocument();
    expect(screen.getByText("1 warning")).toBeInTheDocument();
  });

  it("renders one summary item per duplicate username card", async () => {
    const first = createBlankUser("dup-a");
    const second = createBlankUser("dup-b");
    const users = [
      { ...first, name: "shared", gecos: "First" },
      { ...second, name: "SHARED", gecos: "Second" },
    ];
    seedUsers(users);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <div />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole("button", {
        name: /shared: Export blocked: username conflicts/i,
      });
      expect(buttons).toHaveLength(2);
    });
  });

  it("preserves validator order with username warning before authentication error", async () => {
    const blank = createBlankUser("auth-user");
    const user = { ...blank, name: "Deploy" };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <UserCard user={user} onRemove={() => undefined} />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole("button", {
        name: /Deploy:/i,
      });
      expect(buttons[0]?.textContent).toMatch(
        /Lowercase usernames are recommended/i,
      );
      expect(buttons[1]?.textContent).toMatch(/add a supported password hash/i);
    });
  });

  it("focuses the exact username control from a summary link", async () => {
    const first = createBlankUser("dup-a");
    const second = createBlankUser("dup-b");
    const users = [
      {
        ...first,
        name: "shared",
        ssh_authorized_keys: [{ id: "k1", value: SSH_KEY }],
      },
      {
        ...second,
        name: "shared",
        gecos: "Second card",
        ssh_authorized_keys: [{ id: "k2", value: SSH_KEY }],
      },
    ];
    seedUsers(users);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <UserCardList entries={users} />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const summaryButtons = await screen.findAllByRole("button", {
      name: /shared: Export blocked: username conflicts/i,
    });
    fireEvent.click(summaryButtons[1]!);

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        `user-username-${second.id}`,
      );
    });
  });

  it("shows card badges with errors preferred over warnings", async () => {
    const blank = createBlankUser("badge-user");
    const user = { ...blank, name: "Deploy" };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <UserCard user={user} onRemove={() => undefined} />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const card = await screen.findByRole("article");
    expect(within(card).getByText("1 error")).toBeInTheDocument();
    expect(within(card).queryByText("1 warning")).toBeNull();
  });

  it("removes summary items after the issue is corrected", async () => {
    const blank = createBlankUser("fix-user");
    const user = {
      ...blank,
      name: "Deploy",
      ssh_authorized_keys: [{ id: "key-1", value: SSH_KEY }],
    };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <UserCard user={user} onRemove={() => undefined} />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("User safety warnings")).toBeInTheDocument();
    });

    const username = screen.getByLabelText("Username");
    fireEvent.change(username, { target: { value: "deploy" } });
    fireEvent.blur(username);

    await waitFor(() => {
      expect(screen.queryByText("User safety warnings")).toBeNull();
    });
  });

  it("exposes a programmatically focusable summary heading", async () => {
    const blank = createBlankUser("heading-user");
    const user = { ...blank, gecos: "Heading test" };
    seedUsers([user]);

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <div />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const heading = await screen.findByText("Users need attention");
    expect(heading).toHaveAttribute("id", USERS_VALIDATION_SUMMARY_HEADING_ID);
    expect(heading).toHaveAttribute("tabindex", "-1");
  });
});

describe("Blocked export announcement surface", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  it("announces the exact blocked-export copy assertively", async () => {
    useProjectStore.getState().updateIdentity({ hostname: "web01" });
    const blank = createBlankUser("announce-user");
    seedUsers([{ ...blank, gecos: "Configured without username" }]);

    render(
      <UserValidationProvider>
        <AssertiveLiveRegion />
      </UserValidationProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger reveal" }));

    await waitFor(() => {
      const announcement = screen.getByText(
        "Export is blocked. Review the highlighted user errors.",
      );
      expect(announcement.closest('[aria-live="assertive"]')).not.toBeNull();
    });
  });
});

function AssertiveLiveRegion() {
  const { blockedExportAnnouncement, revealAllUserValidation } =
    useUserValidation();

  return (
    <>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {blockedExportAnnouncement}
      </div>
      <button type="button" onClick={() => revealAllUserValidation()}>
        Trigger reveal
      </button>
    </>
  );
}
