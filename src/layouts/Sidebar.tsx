import type { EditorSection } from "./editorNavigation.ts";

const SECTIONS = [
  { id: "identity" as const, label: "Identity" },
  { id: "users" as const, label: "Users" },
  { id: "networking" as const, label: "Networking" },
  { id: "commands" as const, label: "Commands" },
  { id: null, label: "Export" },
] as const;

interface SidebarProps {
  activeSection: EditorSection;
  onSectionChange: (section: EditorSection) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <nav className="flex h-auto w-full shrink-0 flex-col border-b border-ui-border bg-ui-inset sm:h-full sm:w-56 sm:flex-col sm:border-r sm:border-b-0">
      <h2 className="px-4 py-3 text-sm font-semibold text-ui-text">Sections</h2>
      <ul className="flex gap-1 overflow-x-auto px-2 pb-2 sm:block sm:space-y-1 sm:overflow-visible sm:pb-0">
        {SECTIONS.map((section) => (
          <li key={section.label} className="shrink-0 sm:shrink">
            {section.id ? (
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-current={
                  activeSection === section.id ? "page" : undefined
                }
                className={
                  activeSection === section.id
                    ? "block w-full whitespace-nowrap border-l-2 border-ui-selected-border bg-ui-selected px-4 py-2 text-left text-sm font-semibold text-ui-selected-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-inset)] focus-visible:outline-none"
                    : "block w-full whitespace-nowrap rounded border border-transparent px-4 py-2 text-left text-sm text-ui-text hover:bg-ui-raised focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-inset)] focus-visible:outline-none"
                }
              >
                {section.label}
              </button>
            ) : (
              <span className="block cursor-not-allowed whitespace-nowrap rounded border border-ui-disabled-border bg-ui-disabled px-4 py-2 text-sm text-ui-disabled-text">
                {section.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
