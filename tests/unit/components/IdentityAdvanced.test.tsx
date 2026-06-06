import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityAdvanced } from "../../../src/components/identity/IdentityAdvanced.tsx";
import { useProjectStore } from "../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

describe("IdentityAdvanced", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders disclosure header in closed state without open attribute", () => {
    render(<IdentityAdvanced />);

    expect(
      screen.getByText("Advanced identity (4 more fields)"),
    ).toBeInTheDocument();
    const details = screen.getByText("Advanced identity (4 more fields)")
      .closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("all four field labels are accessible via getByLabelText", () => {
    render(<IdentityAdvanced />);

    expect(screen.getByLabelText(/Prefer FQDN over hostname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Manage \/etc\/hosts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Timezone$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Locale$/i)).toBeInTheDocument();
  });

  it("checkbox unchecked writes undefined not false (IDEN-03)", async () => {
    render(<IdentityAdvanced />);
    const checkbox = screen.getByLabelText(/Prefer FQDN over hostname/i);

    await userEvent.click(checkbox);
    expect(
      useProjectStore.getState().project?.identity?.prefer_fqdn_over_hostname,
    ).toBe(true);

    await userEvent.click(checkbox);
    expect(
      useProjectStore.getState().project?.identity?.prefer_fqdn_over_hostname,
    ).toBeUndefined();
  });

  it('selecting "Localhost-only" writes literal string "localhost"', async () => {
    render(<IdentityAdvanced />);
    const select = screen.getByLabelText(/Manage \/etc\/hosts/i);

    await userEvent.selectOptions(select, "localhost");

    expect(useProjectStore.getState().project?.identity?.manage_etc_hosts).toBe(
      "localhost",
    );
  });

  it('selecting "Rewrite from template" writes literal boolean true', async () => {
    render(<IdentityAdvanced />);
    const select = screen.getByLabelText(/Manage \/etc\/hosts/i);

    await userEvent.selectOptions(select, "true");

    expect(useProjectStore.getState().project?.identity?.manage_etc_hosts).toBe(
      true,
    );
  });

  it('selecting "— Not set —" writes undefined', async () => {
    render(<IdentityAdvanced />);
    const select = screen.getByLabelText(/Manage \/etc\/hosts/i);

    await userEvent.selectOptions(select, "true");
    await userEvent.selectOptions(select, "");

    expect(
      useProjectStore.getState().project?.identity?.manage_etc_hosts,
    ).toBeUndefined();
  });

  it("invalid timezone shows TIMEZONE_INVALID error and border-red-300", async () => {
    render(<IdentityAdvanced />);
    const timezoneInput = screen.getByPlaceholderText("e.g. Europe/Stockholm");

    await userEvent.type(timezoneInput, "Mars/Olympus");

    expect(
      screen.getByText(
        "Timezone must be a valid IANA name (e.g. Europe/Stockholm).",
      ),
    ).toBeInTheDocument();
    expect(timezoneInput.className).toContain("border-red-300");
  });

  it("invalid locale shows LOCALE_INVALID error", async () => {
    render(<IdentityAdvanced />);
    const localeInput = screen.getByPlaceholderText("e.g. en_US.UTF-8");

    await userEvent.type(localeInput, "invalid locale");

    expect(
      screen.getByText(
        "Locale must follow language[_TERRITORY][.codeset] (e.g. en_US.UTF-8).",
      ),
    ).toBeInTheDocument();
  });
});
