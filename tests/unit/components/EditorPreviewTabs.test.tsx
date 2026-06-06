import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorPreviewTabs } from "../../../src/components/preview/EditorPreviewTabs.tsx";

describe("EditorPreviewTabs", () => {
  it("renders Editor and Preview tabs", () => {
    render(<EditorPreviewTabs view="editor" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: /editor/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
  });

  it("applies active class to Editor tab when view is editor", () => {
    render(<EditorPreviewTabs view="editor" onChange={vi.fn()} />);

    const editorTab = screen.getByRole("tab", { name: /editor/i });
    expect(editorTab).toHaveClass("border-blue-600", "text-blue-700");
  });

  it('calls onChange("preview") when Preview tab is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<EditorPreviewTabs view="editor" onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: /preview/i }));

    expect(onChange).toHaveBeenCalledWith("preview");
  });

  it("wraps tabs in lg:hidden container", () => {
    const { container } = render(
      <EditorPreviewTabs view="editor" onChange={vi.fn()} />,
    );

    expect(container.firstChild).toHaveClass("lg:hidden");
  });

  it('exposes tablist with aria-label "Switch between editor and preview"', () => {
    render(<EditorPreviewTabs view="editor" onChange={vi.fn()} />);

    expect(
      screen.getByRole("tablist", {
        name: "Switch between editor and preview",
      }),
    ).toBeInTheDocument();
  });
});
