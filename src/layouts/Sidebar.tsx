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
    <nav className="flex h-auto w-full shrink-0 flex-col border-b border-gray-200 bg-gray-50 sm:h-full sm:w-56 sm:flex-col sm:border-r sm:border-b-0">
      <h2 className="px-4 py-3 text-sm font-semibold text-gray-700">Sections</h2>
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
                    ? "block w-full whitespace-nowrap border-l-2 border-blue-600 bg-blue-50 px-4 py-2 text-left text-sm text-blue-700"
                    : "block w-full whitespace-nowrap rounded px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                }
              >
                {section.label}
              </button>
            ) : (
              <span className="block cursor-not-allowed whitespace-nowrap rounded px-4 py-2 text-sm text-gray-400">
                {section.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
