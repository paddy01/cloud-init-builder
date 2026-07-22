import type { RefObject } from "react";
import type { NetworkExampleKind } from "../../state/projectStore.ts";
import { useProjectStore } from "../../state/projectStore.ts";

interface NetworkingExamplesProps {
  addButtonRef: RefObject<HTMLButtonElement | null>;
  onInterfaceCreated: (id: string) => void;
}

const examples: ReadonlyArray<{
  kind: NetworkExampleKind;
  label: string;
}> = [
  { kind: "ipv4-dhcp", label: "Use IPv4 DHCP" },
  { kind: "static-ipv4", label: "Use static IPv4" },
  { kind: "dual-stack-dhcp", label: "Use dual-stack DHCP" },
];

export function NetworkingExamples({
  addButtonRef,
  onInterfaceCreated,
}: NetworkingExamplesProps) {
  const addNetworkInterface = useProjectStore((state) => state.addNetworkInterface);
  const applyNetworkExample = useProjectStore((state) => state.applyNetworkExample);

  const createBlank = () => {
    const id = addNetworkInterface();
    if (id) onInterfaceCreated(id);
  };

  const applyExample = (kind: NetworkExampleKind) => {
    const id = applyNetworkExample(kind);
    if (id) onInterfaceCreated(id);
  };

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-left sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Start your network configuration
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Add a blank physical interface or start from a portable Proxmox-oriented
        example. You can replace every sample value.
      </p>
      <button
        ref={addButtonRef}
        type="button"
        className="mt-4 min-h-10 w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
        onClick={createBlank}
      >
        Add blank interface
      </button>

      <div className="mt-6 border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-900">
          Start from an example
        </h4>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {examples.map((example) => (
            <button
              key={example.kind}
              type="button"
              className="min-h-10 min-w-0 whitespace-normal rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => applyExample(example.kind)}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
