import { useLayoutEffect, useRef, useState } from "react";
import type { BuilderUser } from "../../models/users.ts";
import { getUserHeaderMetadata } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { AdvancedUserOptions } from "./AdvancedUserOptions.tsx";
import { GroupsInput } from "./GroupsInput.tsx";
import { ShellSelector } from "./ShellSelector.tsx";
import { PasswordHashField } from "./PasswordHashField.tsx";
import { SshAuthorizedKeysInput } from "./SshAuthorizedKeysInput.tsx";
import { SudoRuleSelector } from "./SudoRuleSelector.tsx";

const inputClassName =
  "border border-gray-300 rounded px-3 py-2 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

interface UserCardProps {
  user: BuilderUser;
  shouldFocusUsername?: boolean;
  onFocused?: () => void;
  onRemove: (id: string) => void;
}

export function UserCard({
  user,
  shouldFocusUsername = false,
  onFocused,
  onRemove,
}: UserCardProps) {
  const updateUser = useProjectStore((state) => state.updateUser);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [pendingSshFocusId, setPendingSshFocusId] = useState<string | null>(
    null,
  );
  const { title, secondary, badges } = getUserHeaderMetadata(user);

  useLayoutEffect(() => {
    if (!shouldFocusUsername) return;
    usernameRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [shouldFocusUsername, onFocused]);

  const handleRemove = () => {
    if (
      !window.confirm(
        "Remove user? This removes the custom user card from the project.",
      )
    ) {
      return;
    }
    onRemove(user.id);
  };

  return (
    <article
      aria-labelledby={`user-card-title-${user.id}`}
      className="rounded-lg border border-gray-200 bg-white p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <p
              id={`user-card-title-${user.id}`}
              className="text-sm font-semibold text-gray-900"
            >
              {title}
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              {secondary.map((line) => (
                <span key={`${user.id}-${line}`}>{line}</span>
              ))}
            </div>
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const isAttention =
                  badge === "Custom shell" || badge === "Custom sudo";
                return (
                  <span
                    key={`${user.id}-${badge}`}
                    className={
                      isAttention
                        ? "inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800"
                        : "inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                    }
                  >
                    {badge}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="text-sm text-red-600 hover:text-red-700"
          onClick={handleRemove}
        >
          Remove user
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor={`user-username-${user.id}`}
            className="text-sm font-semibold text-gray-700"
          >
            Username
          </label>
          <input
            ref={usernameRef}
            id={`user-username-${user.id}`}
            type="text"
            placeholder="e.g. deploy"
            value={user.name ?? ""}
            onChange={(event) =>
              updateUser(user.id, { name: event.target.value })
            }
            className={inputClassName}
          />
          <p className="text-xs text-gray-500">
            Letters, numbers, underscores, and hyphens. Must start with a letter
            or underscore.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`user-gecos-${user.id}`}
            className="text-sm font-semibold text-gray-700"
          >
            Full name
          </label>
          <input
            id={`user-gecos-${user.id}`}
            type="text"
            placeholder="e.g. Deploy User"
            value={user.gecos ?? ""}
            onChange={(event) =>
              updateUser(user.id, { gecos: event.target.value })
            }
            className={inputClassName}
          />
          <p className="text-xs text-gray-500">
            Optional. Written to cloud-init as the user&apos;s GECOS value.
          </p>
        </div>

        <GroupsInput
          id={`user-groups-${user.id}`}
          groups={user.groups ?? []}
          onChange={(groups) =>
            updateUser(user.id, {
              groups: groups.length === 0 ? undefined : groups,
            })
          }
        />

        <ShellSelector
          shellId={`user-shell-${user.id}`}
          customShellId={`user-custom-shell-${user.id}`}
          shell={user.shell}
          onChange={(shell) =>
            updateUser(user.id, {
              shell: shell === "" ? undefined : shell,
            })
          }
        />

        <SudoRuleSelector
          id={`user-sudo-${user.id}`}
          sudo={user.sudo}
          onChange={(sudo) => updateUser(user.id, { sudo })}
        />

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Authentication
            </h4>
            <p className="mt-1 text-xs text-gray-500">
              Regular login users need a supported password hash or at least one
              valid SSH key.
            </p>
          </div>

          <PasswordHashField
            userId={user.id}
            passwd={user.passwd}
            lockPasswd={user.lock_passwd}
          />

          <SshAuthorizedKeysInput
            userId={user.id}
            rows={user.ssh_authorized_keys ?? []}
            focusRowId={pendingSshFocusId}
            onFocused={() => setPendingSshFocusId(null)}
            onRowAdded={(rowId) => setPendingSshFocusId(rowId)}
          />
        </div>

        <AdvancedUserOptions user={user} />
      </div>
    </article>
  );
}
