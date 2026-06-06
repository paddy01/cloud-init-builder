import { useMemo } from "react";
import { useProjectStore } from "../../state/projectStore.ts";
import { validateIdentity } from "../../validators/validateConfig.ts";
import { FieldError } from "./FieldError.tsx";

const inputDefaultClass =
  "border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const inputErrorClass =
  "border border-red-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export function IdentityAdvanced() {
  const identity = useProjectStore((s) => s.project?.identity);
  const updateIdentity = useProjectStore((s) => s.updateIdentity);

  const issues = useMemo(() => validateIdentity(identity), [identity]);
  const errorByField = useMemo(
    () => Object.fromEntries(issues.map((i) => [i.path, i.message])),
    [issues],
  );

  return (
    <details className="border-t border-gray-200 group">
      <summary className="cursor-pointer py-3 text-sm font-semibold text-gray-700 list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Advanced identity (4 more fields)</span>
        <span className="hidden group-open:inline">Advanced identity</span>
      </summary>
      <div className="space-y-4 pt-2 pb-4">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={identity?.prefer_fqdn_over_hostname ?? false}
              onChange={(e) =>
                updateIdentity({
                  prefer_fqdn_over_hostname: e.target.checked || undefined,
                })
              }
            />
            Prefer FQDN over hostname
          </label>
          <p className="text-xs text-gray-500">
            When on, cloud-init uses the FQDN instead of the short hostname when
            both are set.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="manage-etc-hosts"
            className="text-sm font-semibold text-gray-700"
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
          <p className="text-xs text-gray-500">
            Choose how cloud-init updates /etc/hosts on boot.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="identity-timezone"
            className="text-sm font-semibold text-gray-700"
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
          <p className="text-xs text-gray-500">
            IANA timezone name. Validated against your browser's timezone
            database.
          </p>
          <FieldError message={errorByField["identity.timezone"]} />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="identity-locale"
            className="text-sm font-semibold text-gray-700"
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
          <p className="text-xs text-gray-500">
            POSIX locale: language[_TERRITORY][.codeset].
          </p>
          <FieldError message={errorByField["identity.locale"]} />
        </div>
      </div>
    </details>
  );
}
