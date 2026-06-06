import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
      screen.getByText("hostname: Hostname is required to export YAML."),
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

  it("truncates to first 3 items and shows overflow line", () => {
    const issues: ValidationIssue[] = [
      { path: "identity.hostname", code: "A", message: "m1", severity: "error" },
      { path: "identity.fqdn", code: "B", message: "m2", severity: "error" },
      { path: "identity.timezone", code: "C", message: "m3", severity: "error" },
      { path: "identity.locale", code: "D", message: "m4", severity: "error" },
    ];

    render(<PreviewBanner issues={issues} />);

    expect(screen.getByText("4 validation errors")).toBeInTheDocument();
    expect(screen.getByText("hostname: m1")).toBeInTheDocument();
    expect(screen.getByText("fqdn: m2")).toBeInTheDocument();
    expect(screen.getByText("timezone: m3")).toBeInTheDocument();
    expect(screen.getByText("…and 1 more")).toBeInTheDocument();
    expect(screen.queryByText("locale: m4")).toBeNull();
  });

  it("renders no Dismiss button", () => {
    render(<PreviewBanner issues={[hostnameRequired]} />);

    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
  });
});
