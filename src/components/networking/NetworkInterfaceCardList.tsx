import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { BuilderNetworkInterface } from "../../models/networking.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import {
  getInterfaceIdFromIssuePath,
  isNetworkingIssuePath,
} from "./networkingValidationPaths.ts";
import { NetworkInterfaceCard } from "./NetworkInterfaceCard.tsx";
import { NetworkingExamples } from "./NetworkingExamples.tsx";

interface NetworkInterfaceCardListProps {
  interfaces: BuilderNetworkInterface[];
}

export function NetworkInterfaceCardList({
  interfaces,
}: NetworkInterfaceCardListProps) {
  const addNetworkInterface = useProjectStore((state) => state.addNetworkInterface);
  const removeNetworkInterface = useProjectStore((state) => state.removeNetworkInterface);
  const moveNetworkInterface = useProjectStore((state) => state.moveNetworkInterface);
  const { focusRequestPath } = useValidation();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [pendingReorderFocus, setPendingReorderFocus] = useState<{
    id: string;
    direction: "up" | "down";
  } | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const shouldFocusAddRef = useRef(false);
  const clearPendingFocus = useCallback(() => setPendingFocusId(null), []);
  const clearReorderFocus = useCallback(() => setPendingReorderFocus(null), []);

  const focusCreatedInterface = (id: string) => setPendingFocusId(id);

  useLayoutEffect(() => {
    if (!shouldFocusAddRef.current || interfaces.length !== 0) return;
    addButtonRef.current?.focus({ preventScroll: true });
    shouldFocusAddRef.current = false;
  }, [interfaces.length]);

  const handleAdd = () => {
    const id = addNetworkInterface();
    if (id) focusCreatedInterface(id);
  };

  const handleRemove = (id: string) => {
    const index = interfaces.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    const remaining = interfaces.filter((entry) => entry.id !== id);
    const next = remaining[index];
    const previous = remaining[index - 1];
    if (!next && !previous) shouldFocusAddRef.current = true;
    removeNetworkInterface(id);

    if (next) {
      setPendingFocusId(next.id);
    } else if (previous) {
      setPendingFocusId(previous.id);
    }
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const currentIndex = interfaces.findIndex((entry) => entry.id === id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= interfaces.length) {
      return;
    }

    moveNetworkInterface(id, direction);
    const movedInterface = interfaces[currentIndex];
    const activeDraft =
      movedInterface?.identityMode === "mac"
        ? movedInterface.macAddress
        : movedInterface?.name;
    const title = activeDraft?.trim() || `Interface ${currentIndex + 1}`;
    setMoveAnnouncement(
      `${title} moved to position ${targetIndex + 1} of ${interfaces.length}.`,
    );
    setPendingReorderFocus({ id, direction });
  };

  return (
    <div className="space-y-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {moveAnnouncement}
      </div>

      {interfaces.length === 0 ? (
        <NetworkingExamples
          addButtonRef={addButtonRef}
          onInterfaceCreated={focusCreatedInterface}
        />
      ) : null}

      {interfaces.map((entry, index) => (
        <NetworkInterfaceCard
          key={entry.id}
          entry={entry}
          position={index + 1}
          total={interfaces.length}
          shouldFocusInput={pendingFocusId === entry.id}
          validationFocusPath={
            focusRequestPath &&
            isNetworkingIssuePath(focusRequestPath) &&
            getInterfaceIdFromIssuePath(focusRequestPath) === entry.id
              ? focusRequestPath
              : null
          }
          reorderFocusDirection={
            pendingReorderFocus?.id === entry.id
              ? pendingReorderFocus.direction
              : null
          }
          onFocused={clearPendingFocus}
          onReorderFocused={clearReorderFocus}
          onRemove={handleRemove}
          onMove={handleMove}
        />
      ))}

      {interfaces.length > 0 ? (
        <button
          ref={addButtonRef}
          type="button"
          className="mt-6 min-h-10 w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          onClick={handleAdd}
        >
          Add blank interface
        </button>
      ) : null}
    </div>
  );
}
