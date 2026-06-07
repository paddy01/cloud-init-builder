import { createContext, useContext, type ReactNode } from "react";
import type { EditorSection } from "./MainLayout.tsx";

interface EditorNavigationContextValue {
  activeSection: EditorSection;
  setActiveSection: (section: EditorSection) => void;
}

const EditorNavigationContext =
  createContext<EditorNavigationContextValue | null>(null);

export function EditorNavigationProvider({
  activeSection,
  setActiveSection,
  children,
}: EditorNavigationContextValue & { children: ReactNode }) {
  return (
    <EditorNavigationContext.Provider
      value={{ activeSection, setActiveSection }}
    >
      {children}
    </EditorNavigationContext.Provider>
  );
}

const noopNavigation: EditorNavigationContextValue = {
  activeSection: "identity",
  setActiveSection: () => undefined,
};

export function useEditorNavigation(): EditorNavigationContextValue {
  const context = useContext(EditorNavigationContext);
  return context ?? noopNavigation;
}
