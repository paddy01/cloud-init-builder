import { useEffect } from "react";
import { useProjectStore } from "../state/projectStore.ts";

export function useBeforeUnload(): void {
  const isDirty = useProjectStore((state) => state.isDirty);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
