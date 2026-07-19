import type { BuilderNetworkInterface } from "../../models/networking.ts";
import { useProjectStore } from "../../state/projectStore.ts";

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
  const nameInputId = `network-interface-${entry.id}-name`;
  const macInputId = `network-interface-${entry.id}-mac`;
  const radioName = `network-interface-${entry.id}-identity-mode`;

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
          <label htmlFor={nameInputId} className="block text-sm font-medium text-gray-700">
            Device name
          </label>
          <input
            ref={inputRef}
            id={nameInputId}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            className="min-h-10 w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. ens18"
            value={entry.name}
            onChange={(event) =>
              updateNetworkInterface(entry.id, { name: event.target.value })
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor={macInputId} className="block text-sm font-medium text-gray-700">
            MAC address
          </label>
          <input
            ref={inputRef}
            id={macInputId}
            type="text"
            inputMode="text"
            spellCheck={false}
            className="min-h-10 w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="52:54:00:12:34:56"
            value={entry.macAddress}
            onChange={(event) =>
              updateNetworkInterface(entry.id, {
                macAddress: event.target.value,
              })
            }
          />
        </div>
      )}
    </fieldset>
  );
}
