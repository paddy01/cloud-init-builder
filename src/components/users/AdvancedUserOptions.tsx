import type { BuilderUser } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";

const inputClassName =
  "border border-gray-300 rounded px-3 py-2 text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

interface AdvancedUserOptionsProps {
  user: BuilderUser;
}

export function AdvancedUserOptions({ user }: AdvancedUserOptionsProps) {
  const updateUser = useProjectStore((state) => state.updateUser);
  const isSystemUser = user.system === true;

  return (
    <details className="border-t border-gray-200 pt-4 group">
      <summary className="cursor-pointer py-3 text-sm font-semibold text-gray-700 list-none [&::-webkit-details-marker]:hidden">
        Advanced user options
      </summary>
      <div className="space-y-4 pt-2 pb-4">
        <div className="space-y-1">
          <label
            htmlFor={`user-primary-group-${user.id}`}
            className="text-sm font-semibold text-gray-700"
          >
            Primary group
          </label>
          <input
            id={`user-primary-group-${user.id}`}
            type="text"
            placeholder="e.g. deploy"
            value={user.primary_group ?? ""}
            onChange={(event) =>
              updateUser(user.id, { primary_group: event.target.value })
            }
            className={inputClassName}
          />
          <p className="text-xs text-gray-500">
            Optional. Sets `primary_group` for this user.
          </p>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={isSystemUser ? false : user.no_create_home !== true}
              disabled={isSystemUser}
              onChange={(event) =>
                updateUser(user.id, {
                  no_create_home: event.target.checked ? undefined : true,
                })
              }
            />
            Create home directory
          </label>
          <p className="text-xs text-gray-500">
            Turn this off to emit `no_create_home: true`.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`user-homedir-${user.id}`}
            className="text-sm font-semibold text-gray-700"
          >
            Home directory
          </label>
          <input
            id={`user-homedir-${user.id}`}
            type="text"
            placeholder="e.g. /srv/deploy"
            value={user.homedir ?? ""}
            onChange={(event) =>
              updateUser(user.id, { homedir: event.target.value })
            }
            className={inputClassName}
          />
          <p className="text-xs text-gray-500">
            Optional override for the generated home directory path.
          </p>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={isSystemUser}
              onChange={(event) =>
                updateUser(user.id, {
                  system: event.target.checked || undefined,
                })
              }
            />
            System user
          </label>
          <p className="text-xs text-gray-500">
            Marks the account as a system user in cloud-init.
          </p>
        </div>
      </div>
    </details>
  );
}
