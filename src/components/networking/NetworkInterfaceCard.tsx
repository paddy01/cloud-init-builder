import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  isSemanticallyBlankNetworkInterface,
  type BuilderNetworkInterface,
} from "../../models/networking.ts";
import { ConfirmRemoveInterfaceDialog } from "./ConfirmRemoveInterfaceDialog.tsx";
import { AddressingPanel } from "./AddressingPanel.tsx";
import { DnsPanel } from "./DnsPanel.tsx";
import { LinkSettingsPanel } from "./LinkSettingsPanel.tsx";
import { NetworkIdentitySelector } from "./NetworkIdentitySelector.tsx";
import { RoutesPanel } from "./RoutesPanel.tsx";
import { useValidation } from "../validation/validationContext.ts";
import { pathToFocusTargetId } from "./networkingValidationPaths.ts";

interface NetworkInterfaceCardProps {
  entry: BuilderNetworkInterface;
  position: number;
  total: number;
  shouldFocusInput: boolean;
  validationFocusPath: string | null;
  reorderFocusDirection: "up" | "down" | null;
  onFocused: () => void;
  onReorderFocused: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollCardIntoView(card: HTMLElement | null): void {
  card?.scrollIntoView?.({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center",
  });
}

export function NetworkInterfaceCard({
  entry,
  position,
  total,
  shouldFocusInput,
  validationFocusPath,
  reorderFocusDirection,
  onFocused,
  onReorderFocused,
  onRemove,
  onMove,
}: NetworkInterfaceCardProps) {
  const { consumeFocusRequest } = useValidation();
  const cardRef = useRef<HTMLElement>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);
  const moveUpRef = useRef<HTMLButtonElement>(null);
  const moveDownRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const activeDraft = entry.identityMode === "name" ? entry.name : entry.macAddress;
  const title = activeDraft.trim() || `Interface ${position}`;
  const isFirst = position === 1;
  const isLast = position === total;

  useLayoutEffect(() => {
    if (!shouldFocusInput) return;
    activeInputRef.current?.focus({ preventScroll: true });
    scrollCardIntoView(cardRef.current);
    onFocused();
  }, [entry.identityMode, onFocused, shouldFocusInput]);

  useLayoutEffect(() => {
    if (!reorderFocusDirection) return;
    const requested = reorderFocusDirection === "up" ? moveUpRef.current : moveDownRef.current;
    const opposite = reorderFocusDirection === "up" ? moveDownRef.current : moveUpRef.current;
    const target = requested && !requested.disabled ? requested : opposite;
    if (target && !target.disabled) {
      target.focus({ preventScroll: true });
      scrollCardIntoView(cardRef.current);
    }
    onReorderFocused();
  }, [isFirst, isLast, onReorderFocused, reorderFocusDirection]);

  useLayoutEffect(() => {
    if (!validationFocusPath) {
      return;
    }

    const targetId = pathToFocusTargetId(validationFocusPath);
    if (!targetId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tryFocus = () => {
      if (cancelled) {
        return;
      }

      const element = document.getElementById(targetId);
      if (!element) {
        attempts += 1;
        if (attempts < 10) {
          requestAnimationFrame(tryFocus);
        }
        return;
      }

      element.focus({ preventScroll: true });
      scrollCardIntoView(cardRef.current);
      consumeFocusRequest();
    };

    tryFocus();

    return () => {
      cancelled = true;
    };
  }, [consumeFocusRequest, validationFocusPath]);

  const cancelRemoval = () => {
    setShowRemoveDialog(false);
    removeRef.current?.focus({ preventScroll: true });
  };

  const requestRemoval = () => {
    if (isSemanticallyBlankNetworkInterface(entry)) {
      onRemove(entry.id);
      return;
    }
    setShowRemoveDialog(true);
  };

  const confirmRemoval = () => {
    setShowRemoveDialog(false);
    onRemove(entry.id);
  };

  const iconButton =
    "flex size-10 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <article
      ref={cardRef}
      aria-labelledby={`network-interface-title-${entry.id}`}
      className="min-w-0 rounded border border-gray-200 bg-white p-4 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h3
          id={`network-interface-title-${entry.id}`}
          className="min-w-0 break-words text-sm font-semibold text-gray-900"
        >
          {title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2" role="group" aria-label={`Reorder ${title}`}>
            <button
              ref={moveUpRef}
              type="button"
              className={iconButton}
              aria-label={`Move ${title} up`}
              title={`Move ${title} up`}
              disabled={isFirst}
              onClick={() => onMove(entry.id, "up")}
            >
              <ArrowUp aria-hidden="true" size={18} />
            </button>
            <button
              ref={moveDownRef}
              type="button"
              className={iconButton}
              aria-label={`Move ${title} down`}
              title={`Move ${title} down`}
              disabled={isLast}
              onClick={() => onMove(entry.id, "down")}
            >
              <ArrowDown aria-hidden="true" size={18} />
            </button>
          </div>
          <button
            ref={removeRef}
            type="button"
            className={`${iconButton} border-red-200 text-red-600 hover:bg-red-50`}
            aria-label={`Remove ${title}`}
            title={`Remove ${title}`}
            onClick={requestRemoval}
          >
            <Trash2 aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      <div className="min-w-0 space-y-8">
        <NetworkIdentitySelector entry={entry} inputRef={activeInputRef} />
        <AddressingPanel entry={entry} />
        <RoutesPanel entry={entry} />
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
          <DnsPanel entry={entry} />
          <LinkSettingsPanel entry={entry} />
        </div>
      </div>

      {showRemoveDialog ? (
        <ConfirmRemoveInterfaceDialog
          title={title}
          onCancel={cancelRemoval}
          onConfirm={confirmRemoval}
        />
      ) : null}
    </article>
  );
}
