import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Sidebar } from "../../src/layouts/Sidebar.tsx";

describe("Sidebar section styling", () => {
  const onSectionChange = vi.fn();

  it("renders all four section labels from SECTIONS array", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Commands")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("renders Identity row with active styling", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    const identityRow = screen.getByRole("button", { name: "Identity" });
    expect(identityRow.className).toContain("bg-blue-50");
    expect(identityRow.className).toContain("border-l-2");
    expect(identityRow.className).toContain("border-blue-600");
    expect(identityRow.className).toContain("text-blue-700");
  });

  it("marks Identity row with aria-current page", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    expect(screen.getByRole("button", { name: "Identity" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders Users as an interactive button and Commands/Export as disabled stubs", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    const usersButton = screen.getByRole("button", { name: "Users" });
    expect(usersButton).not.toHaveAttribute("aria-current");

    for (const label of ["Commands", "Export"] as const) {
      const row = screen.getByText(label).closest("span");
      expect(row?.className).toContain("text-gray-400");
      expect(row?.className).toContain("cursor-not-allowed");
      expect(row).not.toHaveAttribute("aria-current");
    }
  });

  it("renders interactive buttons only for Identity and Users", () => {
    const { container } = render(
      <Sidebar activeSection="identity" onSectionChange={onSectionChange} />,
    );
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(within(nav as HTMLElement).getAllByRole("button")).toHaveLength(2);
  });
});
