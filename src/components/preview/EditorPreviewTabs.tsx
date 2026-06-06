export type EditorPreviewView = "editor" | "preview";

const TABS: { id: EditorPreviewView; label: string }[] = [
  { id: "editor", label: "Editor" },
  { id: "preview", label: "Preview" },
];

export function EditorPreviewTabs({
  view,
  onChange,
}: {
  view: EditorPreviewView;
  onChange: (view: EditorPreviewView) => void;
}) {
  return (
    <div className="lg:hidden">
      <div
        role="tablist"
        aria-label="Switch between editor and preview"
        className="grid grid-cols-2 border-b border-gray-200"
      >
        {TABS.map((tab) => {
          const isActive = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? "border-b-2 border-blue-600 py-2 text-sm font-semibold text-blue-700"
                  : "border-b-2 border-transparent py-2 text-sm text-gray-500 hover:text-gray-700"
              }
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
