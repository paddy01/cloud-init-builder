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
        className="grid grid-cols-2 border-b border-ui-border bg-ui-inset"
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
                  ? "min-h-10 border-b-2 border-ui-selected-border bg-ui-selected py-2 text-sm font-semibold text-ui-selected-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-inset)] focus-visible:outline-none"
                  : "min-h-10 border-b-2 border-transparent py-2 text-sm text-ui-muted-text hover:bg-ui-raised hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-inset)] focus-visible:outline-none"
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
