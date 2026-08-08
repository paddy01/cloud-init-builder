export const NETWORK_CONFIG_GUIDANCE_URL =
  "https://docs.cloud-init.io/en/latest/topics/network-config.html";

export interface NetworkingOutputDisclosureProps {
  variant: "editor" | "preview";
}

export function NetworkingOutputDisclosure({
  variant,
}: NetworkingOutputDisclosureProps) {
  const editor = variant === "editor";
  return (
    <aside className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
      {editor ? (
        <>
          <h3 className="text-sm font-semibold">Networking output needs platform delivery</h3>
          <p className="mt-1 text-sm break-words">
            This builder includes networking as authoring output. Ordinary cloud-init user-data generally does not apply network configuration; deliver it through the network-config mechanism supported by your target platform.
          </p>
          <a className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-500" href={NETWORK_CONFIG_GUIDANCE_URL} target="_blank" rel="noreferrer">
            Read cloud-init network configuration guidance
          </a>
        </>
      ) : (
        <p className="text-sm break-words">
          Networking is authoring output; ordinary cloud-init user-data generally does not apply it. {" "}
          <a className="inline-flex min-h-10 items-center font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-500" href={NETWORK_CONFIG_GUIDANCE_URL} target="_blank" rel="noreferrer">Learn why</a>
        </p>
      )}
    </aside>
  );
}
