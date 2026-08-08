import { useState } from "react";
import { IdentityForm } from "../components/identity/IdentityForm.tsx";
import {
  EditorPreviewTabs,
  type EditorPreviewView,
} from "../components/preview/EditorPreviewTabs.tsx";
import { PreviewPanel } from "../components/preview/PreviewPanel.tsx";
import { UserValidationProvider } from "../components/users/UserValidationProvider.tsx";
import { useUserValidation } from "../components/users/UserValidationContext.ts";
import { CommandsSection } from "../components/commands/CommandsSection.tsx";
import { NetworkingSection } from "../components/networking/NetworkingSection.tsx";
import { UsersSection } from "../components/users/UsersSection.tsx";
import { EditorNavigationProvider } from "./EditorNavigationProvider.tsx";
import type { EditorSection } from "./editorNavigation.ts";
import { Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

function BlockedExportAnnouncement() {
  const { blockedExportAnnouncement } = useUserValidation();

  return (
    <div aria-live="assertive" aria-atomic="true" className="sr-only">
      {blockedExportAnnouncement}
    </div>
  );
}

function EditorSectionContent({ activeSection }: { activeSection: EditorSection }) {
  switch (activeSection) {
    case "identity":
      return <IdentityForm />;
    case "users":
      return <UsersSection />;
    case "networking":
      return <NetworkingSection />;
    case "commands":
      return <CommandsSection />;
  }
}

function MainLayoutContent() {
  const [view, setView] = useState<EditorPreviewView>("editor");
  const [activeSection, setActiveSection] = useState<EditorSection>("identity");
  const { requestFocus } = useUserValidation();

  const showEditor = (path?: string) => {
    setView("editor");
    if (!path) return;
    setActiveSection(path.startsWith("networking.") ? "networking" : path.startsWith("users.") ? "users" : path.startsWith("commands.") ? "commands" : "identity");
    requestFocus(path);
  };

  return (
    <EditorNavigationProvider
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <BlockedExportAnnouncement />
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <EditorPreviewTabs view={view} onChange={setView} />
            <div className="flex-1 overflow-y-auto p-6">
              <div className={view === "editor" ? "block" : "hidden lg:block"}>
                <EditorSectionContent activeSection={activeSection} />
              </div>
              <div
                className={view === "preview" ? "block lg:hidden" : "hidden"}
              >
                <PreviewPanel onShowEditor={showEditor} />
              </div>
            </div>
          </main>
          <aside className="hidden w-80 border-l border-gray-200 bg-gray-50 lg:block">
            <PreviewPanel onShowEditor={showEditor} />
          </aside>
        </div>
      </div>
    </EditorNavigationProvider>
  );
}

export function MainLayout() {
  return (
    <UserValidationProvider>
      <MainLayoutContent />
    </UserValidationProvider>
  );
}
