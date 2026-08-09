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
    <section className="space-y-8 bg-ui-canvas p-6">
      <div>
        <h2 className="text-lg font-semibold text-ui-text">Users</h2>
        <p className="text-sm text-ui-muted-text">
          Preserve the distro default account or add custom users for common
          server-template access.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-start gap-3 text-ui-text">
            <input
              type="checkbox"
              className="mt-1 accent-ui-action focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-canvas"
              checked={users.preserveDefault}
              onChange={(event) => handleToggleChange(event.target.checked)}
              aria-label="Preserve default user"
            />
            <span>
              <span className="block text-sm font-semibold text-ui-text">
                Preserve default user
              </span>
              <span className="block text-xs text-ui-muted-text">
                Keeps cloud-init&apos;s default distro user as `- default` in
                generated YAML.
              </span>
            </span>
          </label>
        </div>

        {users.preserveDefault ? (
          <div className="rounded-lg border border-ui-border bg-ui-inset px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ui-text">
                  Default cloud-init user
                </p>
                <p className="text-xs text-ui-muted-text">
                  This entry preserves the distro-provided default account and is
                  emitted as `- default`.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-ui-selected-border bg-ui-selected px-2 py-1 text-xs font-semibold text-ui-selected-text">
                Default
              </span>
            </div>
          </div>
        ) : null}

        {showNoUserWarning ? (
          <div className="rounded border border-ui-warning-border bg-ui-warning px-4 py-3 text-ui-warning-text">
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
        <div className="rounded-lg border border-dashed border-ui-border bg-ui-raised p-6 text-left">
          <p className="text-sm font-semibold text-ui-text">
            No custom users yet
          </p>
          <p className="text-sm text-ui-muted-text">
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
