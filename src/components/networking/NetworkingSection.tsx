import { isNetworkingConfig, isSemanticallyBlankNetworkInterface } from "../../models/networking.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { NetworkInterfaceCardList } from "./NetworkInterfaceCardList.tsx";
import { NetworkingValidationSummary } from "./NetworkingValidationSummary.tsx";
import { NetworkingOutputDisclosure } from "./NetworkingOutputDisclosure.tsx";

export function NetworkingSection() {
  const project = useProjectStore((state) => state.project);

  if (!project) {
    return (
      <section className="space-y-2 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">No project loaded</h2>
        <p className="text-sm text-gray-500">
          Create or open a project to configure networking.
        </p>
      </section>
    );
  }

  if (!isNetworkingConfig(project.networking)) {
    return (
      <section className="p-4 sm:p-6">
        <p role="alert" className="text-sm text-red-700">
          Networking settings couldn&apos;t be displayed. Reopen the project and
          review any import warnings.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8 p-4 sm:p-6" aria-labelledby="networking-heading">
      <div>
        <h2 id="networking-heading" className="text-lg font-semibold text-gray-900">
          Networking
        </h2>
        <p className="text-sm text-gray-500">
          Configure addressing, routes, DNS, and link settings for each physical
          interface.
        </p>
      </div>

      {project.networking.interfaces.some((entry) => !isSemanticallyBlankNetworkInterface(entry)) && <NetworkingOutputDisclosure variant="editor" />}
      <NetworkingValidationSummary />
      <NetworkInterfaceCardList interfaces={project.networking.interfaces} />
    </section>
  );
}
