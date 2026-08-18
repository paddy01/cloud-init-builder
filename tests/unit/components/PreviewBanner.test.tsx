import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PreviewBanner } from "../../../src/components/preview/PreviewBanner.tsx";
import type { ValidationIssue } from "../../../src/validators/validateConfig.ts";

const hostnameRequired: ValidationIssue = {
  path: "identity.hostname",
  code: "HOSTNAME_REQUIRED",
  message: "Hostname is required to export YAML.",
  severity: "error",
};

describe("PreviewBanner", () => {
  it("renders nothing when issues is empty", () => {
    render(<PreviewBanner issues={[]} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/validation error/i)).toBeNull();
  });

  it('renders singular "1 validation error" heading and strips identity. prefix', () => {
    render(<PreviewBanner issues={[hostnameRequired]} />);

    expect(screen.getByText("1 validation error")).toBeInTheDocument();
    expect(screen.queryByText("1 validation errors")).toBeNull();
    expect(
      screen.getByText(/Hostname is required to export YAML/),
    ).toBeInTheDocument();
  });

  it('renders plural "2 validation errors" heading', () => {
    const issues: ValidationIssue[] = [
      hostnameRequired,
      {
        path: "identity.fqdn",
        code: "FQDN_INVALID",
        message: "FQDN must be a valid dotted name (≤253 chars, no trailing dot).",
        severity: "error",
      },
    ];

    render(<PreviewBanner issues={issues} />);

    expect(screen.getByText("2 validation errors")).toBeInTheDocument();
  });

  it("renders the complete issue list", () => {
    const issues: ValidationIssue[] = [
      { path: "identity.hostname", code: "A", message: "m1", severity: "error" },
      { path: "identity.fqdn", code: "B", message: "m2", severity: "error" },
      { path: "identity.timezone", code: "C", message: "m3", severity: "error" },
      { path: "identity.locale", code: "D", message: "m4", severity: "error" },
    ];

    render(<PreviewBanner issues={issues} />);

    expect(screen.getByText("4 validation errors")).toBeInTheDocument();
    expect(screen.getByText(/m1/)).toBeInTheDocument();
    expect(screen.getByText(/m2/)).toBeInTheDocument();
    expect(screen.getByText(/m3/)).toBeInTheDocument();
    expect(screen.getByText(/m4/)).toBeInTheDocument();
  });

  it("renders no Dismiss button", () => {
    render(<PreviewBanner issues={[hostnameRequired]} />);

    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
  });

  it("keeps error copy, live-region routing, and semantic error focus treatment", () => {
    const onShowEditor = vi.fn();
    render(<PreviewBanner issues={[hostnameRequired]} onShowEditor={onShowEditor} />);

    const section = screen.getByText("YAML preview is unavailable").closest("section");
    const fixButton = screen.getByRole("button", { name: /fix 1 error/i });
    const issueButton = screen.getByRole("button", { name: /hostname: hostname is required/i });

    expect(section).toHaveAttribute("aria-live", "polite");
    expect(section).toHaveClass("bg-ui-error", "border-ui-error-border", "text-ui-error-text");
    expect(fixButton).toHaveClass(
      "focus-visible:ring-ui-focus",
      "focus-visible:ring-offset-[var(--ui-focus-offset-error)]",
    );
    expect(issueButton).toHaveClass("focus-visible:ring-ui-focus");

    fireEvent.click(issueButton);
    expect(onShowEditor).toHaveBeenCalledWith("identity.hostname");
  });

  it("keeps warning heading and explanation on the semantic warning surface", () => {
    render(
      <PreviewBanner
        issues={[]}
        warnings={[
          {
            path: "networking.interfaces.eth0.mtu",
            code: "NET_MTU_OUT_OF_RANGE",
            message: "MTU is unusual.",
            severity: "warning",
          },
        ]}
      />,
    );

    const section = screen.getByText("Networking safety warnings").closest("section");
    expect(section).toHaveAttribute("aria-live", "polite");
    expect(section).toHaveClass("bg-ui-warning", "border-ui-warning-border", "text-ui-warning-text");
    expect(screen.getByText("Warnings do not block YAML output.")).toBeInTheDocument();
  });
});
