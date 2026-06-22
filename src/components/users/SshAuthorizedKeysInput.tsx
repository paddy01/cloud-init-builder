import { useLayoutEffect, useMemo, useRef } from "react";
import type { BuilderSshAuthorizedKey } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { FieldMessage } from "./FieldMessage.tsx";
import { useUserValidation } from "./UserValidationContext.ts";

const inputDefaultClassName =
  "min-w-0 flex-1 border border-gray-300 rounded px-3 py-2 text-xs font-mono bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const inputErrorClassName =
  "min-w-0 flex-1 border border-red-300 rounded px-3 py-2 text-xs font-mono bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

interface SshKeyRowProps {
  userId: string;
  row: BuilderSshAuthorizedKey;
  shouldFocus: boolean;
  onFocused?: () => void;
  onRemove: (rowId: string) => void;
}

function SshKeyRow({
  userId,
  row,
  shouldFocus,
  onFocused,
  onRemove,
}: SshKeyRowProps) {
  const updateSshAuthorizedKey = useProjectStore(
    (state) => state.updateSshAuthorizedKey,
  );
  const {
    markTouched,
    markAuthTouched,
    getVisibleIssuesForPath,
    hasVisibleErrorForPath,
    getFieldMessageId,
  } = useUserValidation();
  const focusRef = useRef<HTMLInputElement>(null);
  const path = `users.entries.${userId}.ssh_authorized_keys.${row.id}`;
  const visibleIssues = getVisibleIssuesForPath(path);
  const hasError = hasVisibleErrorForPath(path);

  useLayoutEffect(() => {
    if (!shouldFocus) {
      return;
    }
    focusRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [onFocused, shouldFocus]);

  const describedByIds = useMemo(() => {
    const ids: string[] = [];
    for (const issue of visibleIssues) {
      ids.push(getFieldMessageId(path, issue.code));
    }
    return ids.length > 0 ? ids.join(" ") : undefined;
  }, [getFieldMessageId, path, visibleIssues]);

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <input
          ref={focusRef}
          id={`user-ssh-key-${userId}-${row.id}`}
          type="text"
          placeholder="ssh-ed25519 AAAA... user@host"
          value={row.value}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedByIds}
          onChange={(event) => {
            updateSshAuthorizedKey(userId, row.id, event.target.value);
            markAuthTouched(userId);
          }}
          onBlur={() => {
            markTouched(path);
            markAuthTouched(userId);
          }}
          className={hasError ? inputErrorClassName : inputDefaultClassName}
        />
        <button
          type="button"
          className="min-h-10 shrink-0 rounded border border-gray-300 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
          onClick={() => onRemove(row.id)}
        >
          Remove key
        </button>
      </div>
      {visibleIssues.map((issue) => (
        <FieldMessage
          key={issue.code}
          id={getFieldMessageId(path, issue.code)}
          message={issue.message}
          severity={issue.severity}
        />
      ))}
    </div>
  );
}

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
  const removeSshAuthorizedKey = useProjectStore(
    (state) => state.removeSshAuthorizedKey,
  );
  const { markAuthTouched } = useUserValidation();

  const handleAdd = () => {
    const rowId = addSshAuthorizedKey(userId);
    if (rowId) {
      onRowAdded?.(rowId);
    }
  };

  const handleRemove = (rowId: string) => {
    removeSshAuthorizedKey(userId, rowId);
    markAuthTouched(userId);
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
            <SshKeyRow
              key={row.id}
              userId={userId}
              row={row}
              shouldFocus={row.id === focusRowId}
              onFocused={onFocused}
              onRemove={handleRemove}
            />
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
