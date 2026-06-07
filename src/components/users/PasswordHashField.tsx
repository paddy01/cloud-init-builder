import { useState } from "react";
import { isSupportedPasswordHash } from "../../validators/passwordHash.ts";
import { useProjectStore } from "../../state/projectStore.ts";

const inputClassName =
  "border border-gray-300 rounded px-3 py-2 text-xs font-mono bg-white w-full " +
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
  const [draft, setDraft] = useState(passwd ?? "");
  const [revealed, setRevealed] = useState(false);

  const isLocked = lockPasswd !== false;
  const hasCommittedHash =
    passwd !== undefined && passwd !== "" && isSupportedPasswordHash(passwd);

  const commitDraft = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      updateUser(userId, { passwd: undefined, lock_passwd: true });
      setDraft("");
      return;
    }

    if (isSupportedPasswordHash(trimmed)) {
      updateUser(userId, { passwd: trimmed, lock_passwd: false });
      setDraft(trimmed);
    }
  };

  const handleChange = (value: string) => {
    setDraft(value);
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
      <p className="text-xs text-gray-500">
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
            onChange={(event) => handleChange(event.target.value)}
            onBlur={(event) => commitDraft(event.target.value)}
            className={inputClassName}
          />
          <button
            type="button"
            className="min-h-10 shrink-0 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? "Hide hash" : "Show hash"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Paste a supported Linux password hash. Plaintext passwords are never
          accepted or exported.
        </p>
        <p className="text-xs text-gray-500">
          Supported prefixes: $6$, $5$, and $2y$.
        </p>
      </div>
    </div>
  );
}
