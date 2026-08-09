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
    <div className="rounded-lg border border-dashed border-ui-border bg-ui-inset p-4 text-left sm:p-6">
      <h3 className="text-lg font-semibold text-ui-text">
        Start your network configuration
      </h3>
      <p className="mt-2 text-sm text-ui-muted-text">
        Add a blank physical interface or start from a portable Proxmox-oriented
        example. You can replace every sample value.
      </p>
      <button
        ref={addButtonRef}
        type="button"
        className="mt-4 min-h-10 w-full rounded bg-ui-action px-4 py-2 text-sm text-ui-action-contrast hover:bg-ui-action-hover focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-inset sm:w-auto"
        onClick={createBlank}
      >
        Add blank interface
      </button>

      <div className="mt-6 border-t border-ui-border pt-6">
        <h4 className="text-sm font-semibold text-ui-text">
          Start from an example
        </h4>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {examples.map((example) => (
            <button
              key={example.kind}
              type="button"
              className="min-h-10 min-w-0 whitespace-normal rounded border border-ui-border bg-ui-raised px-4 py-2 text-sm text-ui-text hover:bg-ui-inset focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-inset"
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
