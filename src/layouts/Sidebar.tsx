const SECTIONS = ["Identity", "Users", "Commands", "Export"] as const;

export function Sidebar() {
  return (
    <nav className="flex h-full w-56 flex-col border-r border-gray-200 bg-gray-50">
      <h2 className="px-4 py-3 text-sm font-semibold text-gray-700">Sections</h2>
      <ul className="space-y-1 px-2">
        {SECTIONS.map((section) => (
          <li key={section}>
            <span className="block cursor-not-allowed rounded px-3 py-2 text-sm text-gray-400">
              {section}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
