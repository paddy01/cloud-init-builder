import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Sidebar } from "../../src/layouts/Sidebar.tsx";

describe("Sidebar section styling", () => {
  it("renders all four section labels from SECTIONS array", () => {
    render(<Sidebar />);

    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Commands")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("renders Identity row with active styling", () => {
    render(<Sidebar />);

    const identityRow = screen.getByText("Identity").closest("span");
    expect(identityRow).not.toBeNull();
    expect(identityRow?.className).toContain("bg-blue-50");
    expect(identityRow?.className).toContain("border-l-2");
    expect(identityRow?.className).toContain("border-blue-600");
    expect(identityRow?.className).toContain("text-blue-700");
  });

  it("marks Identity row with aria-current page", () => {
    render(<Sidebar />);

    const identityRow = screen.getByText("Identity").closest("span");
    expect(identityRow).toHaveAttribute("aria-current", "page");
  });

  it("renders Users, Commands, and Export as disabled stubs", () => {
    render(<Sidebar />);

    for (const label of ["Users", "Commands", "Export"] as const) {
      const row = screen.getByText(label).closest("span");
      expect(row?.className).toContain("text-gray-400");
      expect(row?.className).toContain("cursor-not-allowed");
      expect(row).not.toHaveAttribute("aria-current");
    }
  });

  it("renders no button elements inside the sidebar", () => {
    const { container } = render(<Sidebar />);
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(within(nav as HTMLElement).queryAllByRole("button")).toHaveLength(0);
  });
});
