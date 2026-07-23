import type { BuilderNetworkInterface } from "../../models/networking.ts";
import { networkFieldPath } from "../../validators/validateNetworking.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";

const segmentBase =
  "relative flex min-h-10 items-center justify-center rounded px-4 py-2 text-center text-sm focus-within:ring-2 focus-within:ring-blue-500";

interface NetworkIdentitySelectorProps {
  entry: BuilderNetworkInterface;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function NetworkIdentitySelector({
  entry,
  inputRef,
}: NetworkIdentitySelectorProps) {
  const updateNetworkInterface = useProjectStore(
    (state) => state.updateNetworkInterface,
  );
  const {
    getVisibleIssuesForPath,
    getFieldMessageId,
    markTouched,
  } = useValidation();
  const nameInputId = `network-interface-${entry.id}-name`;
  const macInputId = `network-interface-${entry.id}-mac`;
  const nameMarkerId = `${nameInputId}-example-marker`;
  const macMarkerId = `${macInputId}-example-marker`;
  const radioName = `network-interface-${entry.id}-identity-mode`;
  const namePath = networkFieldPath(entry.id, "name");
  const macPath = networkFieldPath(entry.id, "macAddress");
  const nameIssues = getVisibleIssuesForPath(namePath);
  const macIssues = getVisibleIssuesForPath(macPath);
  const nameMessageIds = nameIssues.map((issue) =>
    getFieldMessageId(namePath, issue.code),
  );
  const macMessageIds = macIssues.map((issue) =>
    getFieldMessageId(macPath, issue.code),
  );
  const nameDescribedBy = [
    entry.exampleFields.includes("name") ? nameMarkerId : null,
    ...nameMessageIds,
  ]
    .filter((value): value is string => value !== null)
    .join(" ");
  const macDescribedBy = [
    entry.exampleFields.includes("macAddress") ? macMarkerId : null,
    ...macMessageIds,
  ]
    .filter((value): value is string => value !== null)
    .join(" ");

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-700">
        Interface identity
      </legend>
      <div className="grid grid-cols-2 rounded border border-gray-300 bg-gray-50 p-1">
        <label
          className={`${segmentBase} ${
            entry.identityMode === "name"
              ? "bg-white text-blue-700 ring-1 ring-blue-500"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <input
            type="radio"
            className="sr-only"
            name={radioName}
            value="name"
            checked={entry.identityMode === "name"}
            onChange={() =>
              updateNetworkInterface(entry.id, { identityMode: "name" })
            }
          />
          Device name
        </label>
        <label
          className={`${segmentBase} ${
            entry.identityMode === "mac"
              ? "bg-white text-blue-700 ring-1 ring-blue-500"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <input
            type="radio"
            className="sr-only"
            name={radioName}
            value="mac"
            checked={entry.identityMode === "mac"}
            onChange={() =>
              updateNetworkInterface(entry.id, { identityMode: "mac" })
            }
          />
          MAC address
        </label>
      </div>

      {entry.identityMode === "name" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <label htmlFor={nameInputId} className="text-sm font-medium text-gray-700">
              Device name
            </label>
            {entry.exampleFields.includes("name") ? (
              <span id={nameMarkerId} className="text-xs text-amber-700">
                Example value—replace for your network
              </span>
            ) : null}
          </div>
          <input
            ref={inputRef}
            id={nameInputId}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            className="min-h-10 w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. ens18"
            value={entry.name}
            aria-describedby={nameDescribedBy || undefined}
            onChange={(event) =>
              updateNetworkInterface(entry.id, { name: event.target.value })
            }
            onBlur={() => markTouched(namePath)}
          />
          {nameIssues.map((issue) => (
            <FieldMessage
              key={issue.code}
              id={getFieldMessageId(namePath, issue.code)}
              message={issue.message}
              severity={issue.severity}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <label htmlFor={macInputId} className="text-sm font-medium text-gray-700">
              MAC address
            </label>
            {entry.exampleFields.includes("macAddress") ? (
              <span id={macMarkerId} className="text-xs text-amber-700">
                Example value—replace for your network
              </span>
            ) : null}
          </div>
          <input
            ref={inputRef}
            id={macInputId}
            type="text"
            inputMode="text"
            spellCheck={false}
            className="min-h-10 w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="52:54:00:12:34:56"
            value={entry.macAddress}
            aria-describedby={macDescribedBy || undefined}
            onChange={(event) =>
              updateNetworkInterface(entry.id, {
                macAddress: event.target.value,
              })
            }
            onBlur={() => markTouched(macPath)}
          />
          {macIssues.map((issue) => (
            <FieldMessage
              key={issue.code}
              id={getFieldMessageId(macPath, issue.code)}
              message={issue.message}
              severity={issue.severity}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
