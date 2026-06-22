import type { EditorSection } from "./editorNavigation.ts";

const SECTIONS = [
  { id: "identity" as const, label: "Identity" },
  { id: "users" as const, label: "Users" },
  { id: "commands" as const, label: "Commands" },
  { id: null, label: "Export" },
] as const;

interface SidebarProps {
  activeSection: EditorSection;
  onSectionChange: (section: EditorSection) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <nav className="flex h-full w-56 flex-col border-r border-gray-200 bg-gray-50">
      <h2 className="px-4 py-3 text-sm font-semibold text-gray-700">Sections</h2>
      <ul className="space-y-1 px-2">
        {SECTIONS.map((section) => (
          <li key={section.label}>
            {section.id ? (
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-current={
                  activeSection === section.id ? "page" : undefined
                }
                className={
                  activeSection === section.id
                    ? "block w-full border-l-2 border-blue-600 bg-blue-50 px-3 py-2 text-left text-sm text-blue-700"
                    : "block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                }
              >
                {section.label}
              </button>
            ) : (
              <span className="block cursor-not-allowed rounded px-3 py-2 text-sm text-gray-400">
                {section.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
