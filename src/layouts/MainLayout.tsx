import { useState } from "react";
import { IdentityForm } from "../components/identity/IdentityForm.tsx";
import {
  EditorPreviewTabs,
  type EditorPreviewView,
} from "../components/preview/EditorPreviewTabs.tsx";
import { PreviewPanel } from "../components/preview/PreviewPanel.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

export function MainLayout() {
  const [view, setView] = useState<EditorPreviewView>("editor");

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <EditorPreviewTabs view={view} onChange={setView} />
          <div className="flex-1 overflow-y-auto p-6">
            <div className={view === "editor" ? "block" : "hidden lg:block"}>
              <IdentityForm />
            </div>
            <div className={view === "preview" ? "block lg:hidden" : "hidden"}>
              <PreviewPanel />
            </div>
          </div>
        </main>
        <aside className="hidden w-80 border-l border-gray-200 bg-gray-50 lg:block">
          <PreviewPanel />
        </aside>
      </div>
    </div>
  );
}
