import { useLayoutEffect, useRef, type KeyboardEvent } from "react";

interface ConfirmRemoveInterfaceDialogProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmRemoveInterfaceDialog({
  title,
  onCancel,
  onConfirm,
}: ConfirmRemoveInterfaceDialogProps) {
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const headingId = `remove-network-interface-${title.replace(/[^A-Za-z0-9_-]/g, "-")}`;

  useLayoutEffect(() => {
    keepButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === keepButtonRef.current) {
      event.preventDefault();
      removeButtonRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === removeButtonRef.current) {
      event.preventDefault();
      keepButtonRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ui-overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded border border-ui-border bg-ui-raised p-6 text-ui-text shadow-xl">
        <h3 id={headingId} className="text-xl font-semibold">
          Remove interface &quot;{title}&quot;? This removes its addressing, routes,
          DNS, and link settings from the project.
        </h3>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={keepButtonRef}
            type="button"
            className="min-h-10 rounded border border-ui-border bg-ui-raised px-4 py-2 text-sm text-ui-text hover:bg-ui-inset focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-raised"
            onClick={onCancel}
          >
            Keep interface
          </button>
          <button
            ref={removeButtonRef}
            type="button"
            className="min-h-10 rounded border border-ui-error-border bg-ui-raised px-4 py-2 text-sm text-ui-error-text hover:bg-ui-error focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-raised"
            onClick={onConfirm}
          >
            Remove interface
          </button>
        </div>
      </div>
    </div>
  );
}
