import { useMemo } from "react";
import { useProjectStore } from "../../state/projectStore.ts";
import { validateIdentity } from "../../validators/validateConfig.ts";
import { FieldError } from "./FieldError.tsx";
import { IdentityAdvanced } from "./IdentityAdvanced.tsx";

const inputDefaultClass =
  "border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const inputErrorClass =
  "border border-red-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export function IdentityForm() {
  const identity = useProjectStore((s) => s.project?.identity);
  const updateIdentity = useProjectStore((s) => s.updateIdentity);

  const issues = useMemo(() => validateIdentity(identity), [identity]);
  const errorByField = useMemo(
    () => Object.fromEntries(issues.map((i) => [i.path, i.message])),
    [issues],
  );

  return (
    <section className="space-y-4 p-6">
      <h2 className="text-sm font-semibold text-gray-700">Identity</h2>
      <p className="text-xs text-gray-500">
        Configure machine identity. These values become the first section of your
        cloud-init YAML.
      </p>

      <div className="space-y-1">
        <label
          htmlFor="identity-hostname"
          className="text-sm font-semibold text-gray-700"
        >
          Hostname
          <span aria-label="required" className="text-red-600">
            *
          </span>
        </label>
        <input
          id="identity-hostname"
          type="text"
          placeholder="e.g. web01"
          value={identity?.hostname ?? ""}
          onChange={(e) => updateIdentity({ hostname: e.target.value })}
          className={
            errorByField["identity.hostname"] ? inputErrorClass : inputDefaultClass
          }
        />
        <p className="text-xs text-gray-500">
          Lowercase letters, digits, and hyphens. Max 63 characters. No leading
          or trailing hyphen.
        </p>
        <FieldError message={errorByField["identity.hostname"]} />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="identity-fqdn"
          className="text-sm font-semibold text-gray-700"
        >
          Fully-qualified domain name (FQDN)
        </label>
        <input
          id="identity-fqdn"
          type="text"
          placeholder="e.g. web01.lan.example.com"
          value={identity?.fqdn ?? ""}
          onChange={(e) => updateIdentity({ fqdn: e.target.value })}
          className={
            errorByField["identity.fqdn"] ? inputErrorClass : inputDefaultClass
          }
        />
        <p className="text-xs text-gray-500">
          Optional. If set, must be a valid dotted name up to 253 characters.
        </p>
        <FieldError message={errorByField["identity.fqdn"]} />
      </div>

      <IdentityAdvanced />
    </section>
  );
}
