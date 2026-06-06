import { Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

export function MainLayout() {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-500">
            Select a section from the sidebar to begin configuring
          </p>
        </main>
        <aside className="hidden w-80 border-l border-gray-200 bg-gray-50 lg:block" />
      </div>
    </div>
  );
}
