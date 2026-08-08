import { useLayoutEffect, useRef } from "react";
import type { BuilderNetworkInterface } from "../../models/networking.ts";
import { networkFieldPath } from "../../validators/validateNetworking.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";

interface LinkSettingsPanelProps {
  entry: BuilderNetworkInterface;
}

export function LinkSettingsPanel({ entry }: LinkSettingsPanelProps) {
  const setNetworkMtuEnabled = useProjectStore(
    (state) => state.setNetworkMtuEnabled,
  );
  const updateNetworkMtu = useProjectStore((state) => state.updateNetworkMtu);
  const {
    getVisibleIssuesForPath,
    getFieldMessageId,
    markTouched,
  } = useValidation();
  const mtuInputRef = useRef<HTMLInputElement>(null);
  const focusMtuAfterRender = useRef(false);
  const headingId = `network-${entry.id}-link-settings`;
  const markerId = `network-${entry.id}-mtu-example`;
  const isExample = entry.exampleFields.includes("mtu");
  const mtuPath = networkFieldPath(entry.id, "mtu");
  const mtuIssues = getVisibleIssuesForPath(mtuPath);
  const mtuMessageIds = mtuIssues.map((issue) =>
    getFieldMessageId(mtuPath, issue.code),
  );
  const mtuDescribedBy = [isExample ? markerId : null, ...mtuMessageIds]
    .filter((value): value is string => value !== null)
    .join(" ");

  useLayoutEffect(() => {
    if (!entry.mtuEnabled || !focusMtuAfterRender.current) return;
    mtuInputRef.current?.focus({ preventScroll: true });
    focusMtuAfterRender.current = false;
  }, [entry.mtuEnabled]);

  return (
    <section
      className="min-w-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
      aria-labelledby={headingId}
    >
      <h4 id={headingId} className="text-lg font-semibold text-gray-900">
        Link settings
      </h4>
      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          className="size-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          checked={entry.mtuEnabled}
          onChange={(event) => {
            focusMtuAfterRender.current = event.target.checked;
            setNetworkMtuEnabled(entry.id, event.target.checked);
          }}
        />
        <span>Set custom MTU</span>
      </label>

      {entry.mtuEnabled ? (
        <div className="min-w-0 space-y-1">
          <label
            htmlFor={`network-${entry.id}-mtu`}
            className="flex flex-wrap items-baseline gap-1 text-sm font-semibold text-gray-700"
          >
            <span>MTU</span>
            {isExample ? (
              <span id={markerId} className="text-xs font-normal text-amber-700">
                Example value—replace for your network
              </span>
            ) : null}
          </label>
          <input
            ref={mtuInputRef}
            id={`network-${entry.id}-mtu`}
            type="text"
            inputMode="numeric"
            className="min-h-10 min-w-0 w-full rounded border border-gray-300 bg-white px-4 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="MTU"
            aria-describedby={mtuDescribedBy || undefined}
            placeholder="1500"
            value={entry.mtu}
            onChange={(event) => updateNetworkMtu(entry.id, event.target.value)}
            onBlur={() => markTouched(mtuPath)}
          />
          {mtuIssues.map((issue) => (
            <FieldMessage
              key={issue.code}
              id={getFieldMessageId(mtuPath, issue.code)}
              message={issue.message}
              severity={issue.severity}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
