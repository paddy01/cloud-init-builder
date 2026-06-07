import { useState } from "react";
import { IdentityForm } from "../components/identity/IdentityForm.tsx";
import {
  EditorPreviewTabs,
  type EditorPreviewView,
} from "../components/preview/EditorPreviewTabs.tsx";
import { PreviewPanel } from "../components/preview/PreviewPanel.tsx";
import { UserValidationProvider } from "../components/users/UserValidationContext.tsx";
import { UsersSection } from "../components/users/UsersSection.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

export type EditorSection = "identity" | "users";

export function MainLayout() {
  const [view, setView] = useState<EditorPreviewView>("editor");
  const [activeSection, setActiveSection] = useState<EditorSection>("identity");

  return (
    <UserValidationProvider>
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <EditorPreviewTabs view={view} onChange={setView} />
            <div className="flex-1 overflow-y-auto p-6">
              <div className={view === "editor" ? "block" : "hidden lg:block"}>
                {activeSection === "identity" ? (
                  <IdentityForm />
                ) : (
                  <UsersSection />
                )}
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
    </UserValidationProvider>
  );
}
