import { useLayoutEffect, useRef } from "react";
import type { BuilderSshAuthorizedKey } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";

const inputClassName =
  "min-w-0 flex-1 border border-gray-300 rounded px-3 py-2 text-xs font-mono bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

interface SshAuthorizedKeysInputProps {
  userId: string;
  rows: BuilderSshAuthorizedKey[];
  focusRowId?: string | null;
  onFocused?: () => void;
  onRowAdded?: (rowId: string) => void;
}

export function SshAuthorizedKeysInput({
  userId,
  rows,
  focusRowId,
  onFocused,
  onRowAdded,
}: SshAuthorizedKeysInputProps) {
  const addSshAuthorizedKey = useProjectStore(
    (state) => state.addSshAuthorizedKey,
  );
  const updateSshAuthorizedKey = useProjectStore(
    (state) => state.updateSshAuthorizedKey,
  );
  const removeSshAuthorizedKey = useProjectStore(
    (state) => state.removeSshAuthorizedKey,
  );
  const focusRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!focusRowId) {
      return;
    }
    focusRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [focusRowId, onFocused]);

  const handleAdd = () => {
    const rowId = addSshAuthorizedKey(userId);
    if (rowId) {
      onRowAdded?.(rowId);
    }
  };

  const handleRemove = (rowId: string) => {
    removeSshAuthorizedKey(userId, rowId);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-700">SSH authorized keys</p>
        <p className="text-xs text-gray-500">
          Add one public key per row. A trailing comment is optional.
        </p>
        <p className="text-xs text-gray-500">
          Supported types include Ed25519, RSA, ECDSA, and OpenSSH security-key
          formats.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-500">No SSH keys added.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-2">
              <input
                ref={row.id === focusRowId ? focusRef : undefined}
                id={`user-ssh-key-${userId}-${row.id}`}
                type="text"
                placeholder="ssh-ed25519 AAAA... user@host"
                value={row.value}
                onChange={(event) =>
                  updateSshAuthorizedKey(userId, row.id, event.target.value)
                }
                className={inputClassName}
              />
              <button
                type="button"
                className="min-h-10 shrink-0 rounded border border-gray-300 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                onClick={() => handleRemove(row.id)}
              >
                Remove key
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="min-h-10 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        onClick={handleAdd}
      >
        Add SSH key
      </button>
    </div>
  );
}
