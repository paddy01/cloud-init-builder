import { useEffect, useMemo, useState } from "react";
import { isSupportedPasswordHash } from "../../validators/passwordHash.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { FieldMessage } from "./FieldMessage.tsx";
import { useUserValidation } from "./UserValidationContext.tsx";

const inputDefaultClassName =
  "border border-gray-300 rounded px-3 py-2 text-xs font-mono bg-white w-full " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const inputErrorClassName =
  "border border-red-300 rounded px-3 py-2 text-xs font-mono bg-white w-full " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

interface PasswordHashFieldProps {
  userId: string;
  passwd?: string;
  lockPasswd?: boolean;
}

export function PasswordHashField({
  userId,
  passwd,
  lockPasswd = true,
}: PasswordHashFieldProps) {
  const updateUser = useProjectStore((state) => state.updateUser);
  const {
    setPasswordDraft,
    getPasswordDraft,
    markTouched,
    markAuthTouched,
    getVisibleIssuesForPath,
    hasVisibleErrorForPath,
    getFieldMessageId,
  } = useUserValidation();
  const [revealed, setRevealed] = useState(false);
  const path = `users.entries.${userId}.passwd`;
  const draft = getPasswordDraft(userId);
  const visibleIssues = getVisibleIssuesForPath(path);
  const hasError = hasVisibleErrorForPath(path);

  useEffect(() => {
    setPasswordDraft(userId, passwd ?? "");
  }, [passwd, setPasswordDraft, userId]);

  const isLocked = lockPasswd !== false;
  const hasCommittedHash =
    passwd !== undefined && passwd !== "" && isSupportedPasswordHash(passwd);

  const describedByIds = useMemo(() => {
    const ids = [
      `user-password-help-${userId}`,
      `user-password-formats-${userId}`,
    ];
    for (const issue of visibleIssues) {
      ids.push(getFieldMessageId(path, issue.code));
    }
    return ids.join(" ");
  }, [getFieldMessageId, path, userId, visibleIssues]);

  const commitDraft = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      updateUser(userId, { passwd: undefined, lock_passwd: true });
      setPasswordDraft(userId, "");
      return;
    }

    if (isSupportedPasswordHash(trimmed)) {
      updateUser(userId, { passwd: trimmed, lock_passwd: false });
      setPasswordDraft(userId, trimmed);
    }
  };

  const handleChange = (value: string) => {
    setPasswordDraft(userId, value);
    markAuthTouched(userId);
    if (value.trim() === "") {
      updateUser(userId, { passwd: undefined, lock_passwd: true });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        {isLocked && !hasCommittedHash
          ? "Password login locked"
          : "Password login enabled"}
      </p>
      <p
        id={`user-password-help-${userId}`}
        className="text-xs text-gray-500"
      >
        {isLocked && !hasCommittedHash
          ? "New users start locked. Add a supported password hash to enable password login."
          : "Paste a supported Linux password hash. Plaintext passwords are never accepted or exported."}
      </p>

      <div className="space-y-1">
        <label
          htmlFor={`user-password-${userId}`}
          className="text-sm font-semibold text-gray-700"
        >
          Hashed password
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`user-password-${userId}`}
            type={revealed ? "text" : "password"}
            placeholder="$6$..."
            value={draft}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={describedByIds}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={(event) => {
              markTouched(path);
              markAuthTouched(userId);
              commitDraft(event.target.value);
            }}
            className={hasError ? inputErrorClassName : inputDefaultClassName}
          />
          <button
            type="button"
            className="min-h-10 shrink-0 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? "Hide hash" : "Show hash"}
          </button>
        </div>
        <p
          id={`user-password-formats-${userId}`}
          className="text-xs text-gray-500"
        >
          Supported prefixes: $6$, $5$, and $2y$.
        </p>
        {visibleIssues.map((issue) => (
          <FieldMessage
            key={issue.code}
            id={getFieldMessageId(path, issue.code)}
            message={issue.message}
            severity={issue.severity}
          />
        ))}
      </div>
    </div>
  );
}
