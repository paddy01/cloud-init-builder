import { useLayoutEffect, useMemo, useRef } from "react";
import type { BuilderSshAuthorizedKey } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { FieldMessage } from "./FieldMessage.tsx";
import { useUserValidation } from "./UserValidationContext.ts";

const inputDefaultClassName =
  "min-w-0 flex-1 rounded border border-ui-border bg-ui-raised px-3 py-2 text-xs font-mono text-ui-text " +
  "focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-focus-offset-raised focus:border-ui-focus";
const inputErrorClassName =
  "min-w-0 flex-1 rounded border border-ui-error-border bg-ui-raised px-3 py-2 text-xs font-mono text-ui-text " +
  "focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-focus-offset-raised focus:border-ui-focus";

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
          className="min-h-10 shrink-0 rounded border border-ui-error-border bg-ui-raised px-3 py-2 text-xs text-ui-error-text hover:bg-ui-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-raised"
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
        <p className="text-sm font-semibold text-ui-text">SSH authorized keys</p>
        <p className="text-xs text-ui-muted-text">
          Add one public key per row. A trailing comment is optional.
        </p>
        <p className="text-xs text-ui-muted-text">
          Supported types include Ed25519, RSA, ECDSA, and OpenSSH security-key
          formats.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-ui-muted-text">No SSH keys added.</p>
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
        className="min-h-10 rounded border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text hover:bg-ui-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-raised"
        onClick={handleAdd}
      >
        Add SSH key
      </button>
    </div>
  );
}
