import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect, type ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NetworkingSection } from "../../../../src/components/networking/NetworkingSection.tsx";
import { UserValidationProvider } from "../../../../src/components/users/UserValidationProvider.tsx";
import { useUserValidation } from "../../../../src/components/users/UserValidationContext.ts";
import { EditorNavigationProvider } from "../../../../src/layouts/EditorNavigationProvider.tsx";
import { TopBar } from "../../../../src/layouts/TopBar.tsx";
import {
  createBlankNetworkInterface,
} from "../../../../src/models/networking.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";
import { NETWORKING_VALIDATION_MESSAGES } from "../../../../src/validators/validateNetworking.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

function seedInterface(
  id: string,
  patch: {
    mtu?: string;
    mtuEnabled?: boolean;
    name?: string;
  } = {},
) {
  useProjectStore.getState().addNetworkInterface(id);
  useProjectStore.getState().updateNetworkInterface(id, {
    name: patch.name ?? "ens18",
  });
  if (patch.mtuEnabled) {
    useProjectStore.getState().setNetworkMtuEnabled(id, true);
  }
  if (patch.mtu !== undefined) {
    useProjectStore.getState().updateNetworkMtu(id, patch.mtu);
  }
}

function RevealAllHarness({ children }: { children: ReactNode }) {
  const { revealAllValidation } = useUserValidation();

  useLayoutEffect(() => {
    revealAllValidation();
  }, [revealAllValidation]);

  return <>{children}</>;
}

function BlockingErrorsProbe({
  onBlockingErrors,
}: {
  onBlockingErrors: (count: number) => void;
}) {
  const { blockingErrors } = useUserValidation();

  useLayoutEffect(() => {
    onBlockingErrors(blockingErrors.length);
  }, [blockingErrors.length, onBlockingErrors]);

  return null;
}

function renderNetworkingSection() {
  return render(
    <UserValidationProvider>
      <NetworkingSection />
    </UserValidationProvider>,
  );
}

describe("NetworkingValidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Networking Validation");
    useProjectStore.getState().updateIdentity({ hostname: "web01" });
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the inline MTU error until the field is blurred", async () => {
    seedInterface("iface-touch", {
      mtuEnabled: true,
      mtu: "0",
    });
    renderNetworkingSection();

    const mtuInput = screen.getByLabelText("MTU");
    expect(
      screen.queryByText(NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID),
    ).toBeNull();

    fireEvent.blur(mtuInput);

    await waitFor(() => {
      expect(
        screen.getByText(NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID),
      ).toBeInTheDocument();
    });
  });

  it("renders no summary when there are zero visible networking issues", () => {
    seedInterface("iface-clean", {
      mtuEnabled: true,
      mtu: "1500",
    });
    renderNetworkingSection();

    expect(screen.queryByText("Networking needs attention")).toBeNull();
  });

  it("renders the networking summary after reveal-all with singular count copy", async () => {
    seedInterface("iface-summary", {
      mtuEnabled: true,
      mtu: "0",
    });

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <NetworkingSection />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Networking needs attention")).toBeInTheDocument();
    });
    expect(screen.getByText("1 validation error")).toBeInTheDocument();
    expect(screen.queryByText(/export-blocking/i)).toBeNull();
  });

  it("focuses the MTU input when a summary issue is activated", async () => {
    seedInterface("iface-focus", {
      mtuEnabled: true,
      mtu: "0",
    });

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <NetworkingSection />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const summaryButton = await screen.findByRole("button", {
      name: new RegExp(
        `ens18: ${NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID}`,
      ),
    });
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        "network-iface-focus-mtu",
      );
    });
  });

  it("keeps networking-only MTU errors out of blockingErrors and export gating", async () => {
    seedInterface("iface-nonblocking", {
      mtuEnabled: true,
      mtu: "0",
    });

    let blockingCount = -1;
    render(
      <UserValidationProvider>
        <BlockingErrorsProbe
          onBlockingErrors={(count) => {
            blockingCount = count;
          }}
        />
        <EditorNavigationProvider activeSection="networking" setActiveSection={vi.fn()}>
          <TopBar />
        </EditorNavigationProvider>
      </UserValidationProvider>,
    );

    await waitFor(() => {
      expect(blockingCount).toBe(0);
    });

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).not.toHaveAttribute("aria-disabled", "true");
  });

  it("does not surface issues for semantically blank interfaces", () => {
    useProjectStore.setState({
      ...initialState,
      project: {
        ...useProjectStore.getState().project!,
        networking: {
          interfaces: [createBlankNetworkInterface("blank-only")],
        },
      },
      isDirty: true,
    });

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <NetworkingSection />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    expect(screen.queryByText("Networking needs attention")).toBeNull();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("focuses a route destination from the networking summary", async () => {
    seedInterface("iface-route");
    const routeId = "route-dest";
    useProjectStore.getState().addNetworkRoute(
      "iface-route",
      "ipv4",
      "specific",
      routeId,
    );
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "iface-route",
        "ipv4",
        routeId,
        "destination",
        "bad",
      );

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <NetworkingSection />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const summaryButton = await screen.findByRole("button", {
      name: new RegExp(
        `ens18: ${NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_DEST_INVALID("IPv4")}`,
      ),
    });
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        `network-iface-route-ipv4-route-${routeId}-destination`,
      );
    });
  });

  it("focuses nameserver and search-domain inputs from the summary", async () => {
    seedInterface("iface-dns");
    const nameserverId = "ns-1";
    const domainId = "domain-1";
    useProjectStore.getState().addNetworkNameserver("iface-dns", nameserverId);
    useProjectStore
      .getState()
      .updateNetworkNameserver("iface-dns", nameserverId, "nope");
    useProjectStore
      .getState()
      .addNetworkSearchDomain("iface-dns", domainId);
    useProjectStore
      .getState()
      .updateNetworkSearchDomain("iface-dns", domainId, "no dots");

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <NetworkingSection />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const nameserverButton = await screen.findByRole("button", {
      name: new RegExp(
        `ens18: ${NETWORKING_VALIDATION_MESSAGES.NET_NAMESERVER_INVALID}`,
      ),
    });
    fireEvent.click(nameserverButton);
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        `network-iface-dns-nameserver-${nameserverId}`,
      );
    });

    const domainButton = await screen.findByRole("button", {
      name: new RegExp(
        `ens18: ${NETWORKING_VALIDATION_MESSAGES.NET_DOMAIN_INVALID}`,
      ),
    });
    fireEvent.click(domainButton);
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        `network-iface-dns-search-domain-${domainId}`,
      );
    });
  });

  it("expands only the targeted route Advanced panel when focusing a metric issue", async () => {
    seedInterface("iface-metric");
    const defaultRouteId = "route-default";
    const specificRouteId = "route-specific";
    useProjectStore.getState().addNetworkRoute(
      "iface-metric",
      "ipv4",
      "default",
      defaultRouteId,
    );
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "iface-metric",
        "ipv4",
        defaultRouteId,
        "gateway",
        "192.0.2.1",
      );
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "iface-metric",
        "ipv4",
        defaultRouteId,
        "metric",
        "-1",
      );
    useProjectStore.getState().addNetworkRoute(
      "iface-metric",
      "ipv4",
      "specific",
      specificRouteId,
    );
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "iface-metric",
        "ipv4",
        specificRouteId,
        "destination",
        "198.51.100.0/24",
      );

    render(
      <UserValidationProvider>
        <RevealAllHarness>
          <NetworkingSection />
        </RevealAllHarness>
      </UserValidationProvider>,
    );

    const defaultAdvanced = await screen.findByRole("button", {
      name: "Advanced for IPv4 default route 1 for ens18",
    });
    const specificAdvanced = screen.getByRole("button", {
      name: "Advanced for IPv4 specific route 2 for ens18",
    });
    expect(defaultAdvanced).toHaveAttribute("aria-expanded", "false");
    expect(specificAdvanced).toHaveAttribute("aria-expanded", "false");

    const summaryButton = await screen.findByRole("button", {
      name: new RegExp(
        `ens18: ${NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_METRIC_INVALID}`,
      ),
    });
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(defaultAdvanced).toHaveAttribute("aria-expanded", "true");
      expect(specificAdvanced).toHaveAttribute("aria-expanded", "false");
      expect(document.activeElement).toHaveAttribute(
        "id",
        `network-iface-metric-ipv4-route-${defaultRouteId}-metric`,
      );
    });
  });
});
