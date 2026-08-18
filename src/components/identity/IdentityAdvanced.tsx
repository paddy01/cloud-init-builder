import { useMemo } from "react";
import { useProjectStore } from "../../state/projectStore.ts";
import { validateIdentity } from "../../validators/validateConfig.ts";
import { FieldError } from "./FieldError.tsx";

const inputDefaultClass =
  "rounded border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-focus focus:border-ui-focus focus:ring-offset-2 focus:ring-offset-ui-raised";
const inputErrorClass =
  "rounded border border-ui-error-border bg-ui-raised px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-focus focus:border-ui-focus focus:ring-offset-2 focus:ring-offset-ui-raised";

export function IdentityAdvanced() {
  const identity = useProjectStore((s) => s.project?.identity);
  const updateIdentity = useProjectStore((s) => s.updateIdentity);

  const issues = useMemo(() => validateIdentity(identity), [identity]);
  const errorByField = useMemo(
    () => Object.fromEntries(issues.map((i) => [i.path, i.message])),
    [issues],
  );

  return (
    <details className="group border-t border-ui-border">
      <summary className="cursor-pointer list-none py-3 text-sm font-semibold text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-raised [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Advanced identity (4 more fields)</span>
        <span className="hidden group-open:inline">Advanced identity</span>
      </summary>
      <div className="space-y-4 pt-2 pb-4">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-ui-text">
            <input
              type="checkbox"
              checked={identity?.prefer_fqdn_over_hostname ?? false}
              onChange={(e) =>
                updateIdentity({
                  prefer_fqdn_over_hostname: e.target.checked || undefined,
                })
              }
              className="accent-ui-action focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-raised"
            />
            Prefer FQDN over hostname
          </label>
          <p className="text-xs text-ui-muted">
            When on, cloud-init uses the FQDN instead of the short hostname when
            both are set.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="manage-etc-hosts"
            className="text-sm font-semibold text-ui-text"
          >
            Manage /etc/hosts
          </label>
          <select
            id="manage-etc-hosts"
            value={
              identity?.manage_etc_hosts === undefined
                ? ""
                : String(identity.manage_etc_hosts)
            }
            onChange={(e) => {
              const v = e.target.value;
              updateIdentity({
                manage_etc_hosts:
                  v === ""
                    ? undefined
                    : v === "true"
                      ? true
                      : v === "false"
                        ? false
                        : "localhost",
              });
            }}
            className={inputDefaultClass}
          >
            <option value="">— Not set —</option>
            <option value="false">Don't manage</option>
            <option value="true">Rewrite from template</option>
            <option value="localhost">Localhost-only</option>
          </select>
          <p className="text-xs text-ui-muted">
            Choose how cloud-init updates /etc/hosts on boot.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="identity-timezone"
            className="text-sm font-semibold text-ui-text"
          >
            Timezone
          </label>
          <input
            id="identity-timezone"
            type="text"
            placeholder="e.g. Europe/Stockholm"
            value={identity?.timezone ?? ""}
            onChange={(e) => updateIdentity({ timezone: e.target.value })}
            className={
              errorByField["identity.timezone"] ? inputErrorClass : inputDefaultClass
            }
          />
          <p className="text-xs text-ui-muted">
            IANA timezone name. Validated against your browser's timezone
            database.
          </p>
          <FieldError message={errorByField["identity.timezone"]} />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="identity-locale"
            className="text-sm font-semibold text-ui-text"
          >
            Locale
          </label>
          <input
            id="identity-locale"
            type="text"
            placeholder="e.g. en_US.UTF-8"
            value={identity?.locale ?? ""}
            onChange={(e) => updateIdentity({ locale: e.target.value })}
            className={
              errorByField["identity.locale"] ? inputErrorClass : inputDefaultClass
            }
          />
          <p className="text-xs text-ui-muted">
            POSIX locale: language[_TERRITORY][.codeset].
          </p>
          <FieldError message={errorByField["identity.locale"]} />
        </div>
      </div>
    </details>
  );
}
