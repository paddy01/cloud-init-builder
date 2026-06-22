import { createContext, useContext } from "react";

export type EditorSection = "identity" | "users" | "commands";

export interface EditorNavigationContextValue {
  activeSection: EditorSection;
  setActiveSection: (section: EditorSection) => void;
}

export const EditorNavigationContext =
  createContext<EditorNavigationContextValue | null>(null);

const noopNavigation: EditorNavigationContextValue = {
  activeSection: "identity",
  setActiveSection: () => undefined,
};

export function useEditorNavigation(): EditorNavigationContextValue {
  const context = useContext(EditorNavigationContext);
  return context ?? noopNavigation;
}
