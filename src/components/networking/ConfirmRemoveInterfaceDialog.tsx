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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded border border-gray-200 bg-white p-6 shadow-xl">
        <h3 id={headingId} className="text-base font-semibold text-gray-900">
          Remove interface &quot;{title}&quot;? This removes it from the project and
          changes interface order.
        </h3>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={keepButtonRef}
            type="button"
            className="min-h-10 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onCancel}
          >
            Keep interface
          </button>
          <button
            ref={removeButtonRef}
            type="button"
            className="min-h-10 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={onConfirm}
          >
            Remove interface
          </button>
        </div>
      </div>
    </div>
  );
}
