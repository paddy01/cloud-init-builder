import { useEffect } from "react";
import { useBeforeUnload } from "../hooks/useBeforeUnload.ts";
import { MainLayout } from "../layouts/MainLayout.tsx";
import { useProjectStore } from "../state/projectStore.ts";

export default function App() {
  useBeforeUnload();

  useEffect(() => {
    useProjectStore.getState().newProject("Untitled Project");
  }, []);

  return <MainLayout />;
}
