import { isUsersConfig } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { UserCardList } from "./UserCardList.tsx";
import { UserValidationSummary } from "./UserValidationSummary.tsx";

const DISABLE_DEFAULT_CONFIRM =
  "Turn off default user? Cloud-init will omit `- default` unless you add your own users.";

export function UsersSection() {
  const users = useProjectStore((s) => s.project?.users);
  const setPreserveDefault = useProjectStore((s) => s.setPreserveDefault);

  if (!users || !isUsersConfig(users)) return null;

  const hasEmittableCustomUsers = users.entries.some(
    (user) => (user.name?.trim() ?? "") !== "",
  );
  const showNoUserWarning = !users.preserveDefault && !hasEmittableCustomUsers;

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      setPreserveDefault(true);
      return;
    }

    if (!window.confirm(DISABLE_DEFAULT_CONFIRM)) {
      return;
    }

    setPreserveDefault(false);
  };

  return (
    <section className="space-y-8 p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500">
          Preserve the distro default account or add custom users for common
          server-template access.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={users.preserveDefault}
              onChange={(event) => handleToggleChange(event.target.checked)}
              aria-label="Preserve default user"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-700">
                Preserve default user
              </span>
              <span className="block text-xs text-gray-500">
                Keeps cloud-init&apos;s default distro user as `- default` in
                generated YAML.
              </span>
            </span>
          </label>
        </div>

        {users.preserveDefault ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Default cloud-init user
                </p>
                <p className="text-xs text-gray-500">
                  This entry preserves the distro-provided default account and is
                  emitted as `- default`.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                Default
              </span>
            </div>
          </div>
        ) : null}

        {showNoUserWarning ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="text-sm font-semibold">No login users configured</p>
            <p className="text-xs">
              You turned off the default user and haven&apos;t added a custom
              user yet. Add a user below if this machine needs a provisioned
              account.
            </p>
          </div>
        ) : null}
      </div>

      {users.entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-left">
          <p className="text-sm font-semibold text-gray-900">
            No custom users yet
          </p>
          <p className="text-sm text-gray-500">
            Keep the default user above or add a custom user to provision named
            accounts in cloud-init.
          </p>
        </div>
      ) : null}

      <UserValidationSummary />
      <UserCardList entries={users.entries} />
    </section>
  );
}
