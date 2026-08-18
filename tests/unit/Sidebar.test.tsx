import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Sidebar } from "../../src/layouts/Sidebar.tsx";

describe("Sidebar section styling", () => {
  const onSectionChange = vi.fn();

  it("renders all five section labels in editor order", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    const items = within(screen.getByRole("navigation"))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(items).toEqual(["Identity", "Users", "Networking", "Commands", "Export"]);
  });

  it("renders Identity row with active styling", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    const identityRow = screen.getByRole("button", { name: "Identity" });
    expect(identityRow.className).toContain("bg-ui-selected");
    expect(identityRow.className).toContain("border-l-2");
    expect(identityRow.className).toContain("border-ui-selected-border");
    expect(identityRow.className).toContain("text-ui-selected-text");
  });

  it("marks Identity row with aria-current page", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    expect(screen.getByRole("button", { name: "Identity" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders Commands as an interactive button and Export as a disabled stub", () => {
    render(<Sidebar activeSection="identity" onSectionChange={onSectionChange} />);

    const usersButton = screen.getByRole("button", { name: "Users" });
    const commandsButton = screen.getByRole("button", { name: "Commands" });
    expect(usersButton).not.toHaveAttribute("aria-current");
    expect(commandsButton).not.toHaveAttribute("aria-current");

    const exportRow = screen.getByText("Export").closest("span");
    expect(exportRow?.className).toContain("text-ui-disabled-text");
    expect(exportRow?.className).toContain("cursor-not-allowed");
    expect(exportRow).not.toHaveAttribute("aria-current");
  });

  it("renders interactive buttons for Identity, Users, Networking, and Commands", () => {
    const { container } = render(
      <Sidebar activeSection="identity" onSectionChange={onSectionChange} />,
    );
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(within(nav as HTMLElement).getAllByRole("button")).toHaveLength(4);
  });

  it("uses a horizontal mobile rail and the desktop vertical sidebar contract", () => {
    const { container } = render(
      <Sidebar activeSection="networking" onSectionChange={onSectionChange} />,
    );

    const nav = container.querySelector("nav");
    const list = screen.getByRole("list");
    expect(nav?.className).toContain("w-full");
    expect(nav?.className).toContain("sm:w-56");
    expect(nav?.className).toContain("sm:flex-col");
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).toContain("sm:overflow-visible");
    expect(screen.getByRole("button", { name: "Networking" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks Commands row with active styling and aria-current", () => {
    render(
      <Sidebar activeSection="commands" onSectionChange={onSectionChange} />,
    );

    const commandsButton = screen.getByRole("button", { name: "Commands" });
    expect(commandsButton.className).toContain("bg-ui-selected");
    expect(commandsButton.className).toContain("border-l-2");
    expect(commandsButton).toHaveAttribute("aria-current", "page");
  });
});
