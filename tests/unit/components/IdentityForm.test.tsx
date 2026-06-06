import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityForm } from "../../../src/components/identity/IdentityForm.tsx";
import { useProjectStore } from "../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

describe("IdentityForm", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading "Identity" and description string verbatim', () => {
    render(<IdentityForm />);

    expect(screen.getByRole("heading", { name: "Identity" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Configure machine identity. These values become the first section of your cloud-init YAML.",
      ),
    ).toBeInTheDocument();
  });

  it("Hostname label has visible required marker", () => {
    render(<IdentityForm />);

    expect(screen.getByText("*")).toBeInTheDocument();
    expect(
      screen.getByLabelText((_, element) => element?.id === "identity-hostname"),
    ).toBeInTheDocument();
  });

  it('typing "web01" into hostname updates store', async () => {
    render(<IdentityForm />);
    const hostnameInput = screen.getByPlaceholderText("e.g. web01");

    await userEvent.type(hostnameInput, "web01");

    expect(useProjectStore.getState().project?.identity?.hostname).toBe("web01");
  });

  it('typing "-bad" shows HOSTNAME_INVALID error and border-red-300 class', async () => {
    render(<IdentityForm />);
    const hostnameInput = screen.getByPlaceholderText("e.g. web01");

    await userEvent.type(hostnameInput, "-bad");

    expect(
      screen.getByText(
        "Hostname must be 1–63 chars, alphanumeric or hyphen, not starting/ending with a hyphen.",
      ),
    ).toBeInTheDocument();
    expect(hostnameInput.className).toContain("border-red-300");
  });

  it("empty hostname shows HOSTNAME_REQUIRED error", () => {
    render(<IdentityForm />);

    expect(
      screen.getByText("Hostname is required to export YAML."),
    ).toBeInTheDocument();
  });

  it("valid FQDN produces no error; trailing dot shows FQDN_INVALID", async () => {
    render(<IdentityForm />);
    const hostnameInput = screen.getByPlaceholderText("e.g. web01");
    const fqdnInput = screen.getByPlaceholderText("e.g. web01.lan.example.com");

    await userEvent.type(hostnameInput, "web01");
    await userEvent.type(fqdnInput, "web01.lan.example.com");

    expect(
      screen.queryByText(
        "FQDN must be a valid dotted name (≤253 chars, no trailing dot).",
      ),
    ).not.toBeInTheDocument();

    await userEvent.clear(fqdnInput);
    await userEvent.type(fqdnInput, "web01.");

    expect(
      screen.getByText(
        "FQDN must be a valid dotted name (≤253 chars, no trailing dot).",
      ),
    ).toBeInTheDocument();
  });

  it("renders IdentityAdvanced disclosure header in collapsed default state", () => {
    render(<IdentityForm />);

    expect(
      screen.getByText("Advanced identity (4 more fields)"),
    ).toBeInTheDocument();
    const details = screen.getByText("Advanced identity (4 more fields)")
      .closest("details");
    expect(details).not.toHaveAttribute("open");
  });
});
