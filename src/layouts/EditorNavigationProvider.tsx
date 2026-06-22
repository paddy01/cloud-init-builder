import type { ReactNode } from "react";
import {
  EditorNavigationContext,
  type EditorNavigationContextValue,
} from "./editorNavigation.ts";

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
