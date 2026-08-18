import type { BuilderUser } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";

const inputClassName =
  "rounded border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text " +
  "focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-focus-offset-raised focus:border-ui-focus";

interface AdvancedUserOptionsProps {
  user: BuilderUser;
}

export function AdvancedUserOptions({ user }: AdvancedUserOptionsProps) {
  const updateUser = useProjectStore((state) => state.updateUser);
  const isSystemUser = user.system === true;

  return (
    <details className="group border-t border-ui-border pt-4">
      <summary className="cursor-pointer list-none py-3 text-sm font-semibold text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-raised [&::-webkit-details-marker]:hidden">
        Advanced user options
      </summary>
      <div className="space-y-4 pt-2 pb-4">
        <div className="space-y-1">
          <label
            htmlFor={`user-primary-group-${user.id}`}
            className="text-sm font-semibold text-ui-text"
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
          <p className="text-xs text-ui-muted-text">
            Optional. Sets `primary_group` for this user.
          </p>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-ui-text">
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
          <p className="text-xs text-ui-muted-text">
            Turn this off to emit `no_create_home: true`.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`user-homedir-${user.id}`}
            className="text-sm font-semibold text-ui-text"
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
          <p className="text-xs text-ui-muted-text">
            Optional override for the generated home directory path.
          </p>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-ui-text">
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
          <p className="text-xs text-ui-muted-text">
            Marks the account as a system user in cloud-init.
          </p>
        </div>
      </div>
    </details>
  );
}
