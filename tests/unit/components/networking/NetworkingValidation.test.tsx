import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect, type ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NetworkingSection } from "../../../../src/components/networking/NetworkingSection.tsx";
import { UserValidationProvider } from "../../../../src/components/users/UserValidationProvider.tsx";
import { useUserValidation } from "../../../../src/components/users/UserValidationContext.ts";
import { EditorNavigationProvider } from "../../../../src/layouts/EditorNavigationProvider.tsx";
import { TopBar } from "../../../../src/layouts/TopBar.tsx";
import {
  createBlankNetworkInterface,
} from "../../../../src/models/networking.ts";
import { RISK_CODES } from "../../../../src/models/networkingCodes.ts";
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

  it("keeps structural blockers and risk warnings on their distinct semantic surfaces", async () => {
    seedInterface("semantic-error", { name: "ens18" });
    seedInterface("semantic-error-peer", { name: "ens18" });
    useProjectStore.getState().setNetworkDhcp("semantic-error", "ipv4", true);
    const addressId = useProjectStore
      .getState()
      .addNetworkAddress("semantic-error", "ipv4", "semantic-risk-address");
    useProjectStore
      .getState()
      .updateNetworkAddress(
        "semantic-error",
        "ipv4",
        addressId!,
        "192.0.2.10/24",
      );

    renderNetworkingSection();

    const errorSummary = await screen.findByRole("heading", {
      name: "Networking needs attention",
    });
    expect(errorSummary.closest("section")).toHaveClass(
      "border-ui-error-border",
      "bg-ui-error",
      "text-ui-error-text",
    );
    const warningSummary = screen.getByRole("heading", {
      name: "Networking safety warnings",
    });
    expect(warningSummary.closest("section")).toHaveClass(
      "border-ui-warning-border",
      "bg-ui-warning",
      "text-ui-warning-text",
    );
    expect(screen.getByText("2 validation errors")).toBeInTheDocument();
    expect(screen.getByText("1 warning")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dismiss warning/i })).toBeNull();
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
    expect(summaryButton).toHaveClass(
      "focus:ring-ui-focus",
      "focus:ring-offset-ui-error",
    );
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        "network-iface-focus-mtu",
      );
    });
  });

  it("includes networking-only MTU errors in blockingErrors and export gating", async () => {
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
      expect(blockingCount).toBe(1);
    });

    const exportBtn = screen.getByRole("button", { name: /export yaml/i });
    expect(exportBtn).toHaveAttribute("aria-disabled", "true");
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

  it("renders cross-interface alerts on both duplicate-named interfaces without blur", async () => {
    seedInterface("dup-a", { name: "eth0" });
    seedInterface("dup-b", { name: "eth0" });
    renderNetworkingSection();

    await waitFor(() => {
      expect(
        screen.getAllByText(
          "Conflicts with another interface — see the networking summary above.",
        ),
      ).toHaveLength(2);
    });
    expect(screen.getByText("Networking needs attention")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /eth0:/ })).toHaveLength(2);
  });

  it("does not render cross-interface alert for same-interface duplicate address only", async () => {
    seedInterface("local-dup");
    const rowA = "addr-a";
    const rowB = "addr-b";
    useProjectStore.getState().addNetworkAddress("local-dup", "ipv4", rowA);
    useProjectStore.getState().addNetworkAddress("local-dup", "ipv4", rowB);
    useProjectStore
      .getState()
      .updateNetworkAddress("local-dup", "ipv4", rowA, "192.0.2.10/24");
    useProjectStore
      .getState()
      .updateNetworkAddress("local-dup", "ipv4", rowB, "192.0.2.10/24");

    renderNetworkingSection();

    const article = screen.getByRole("article");
    await waitFor(() => {
      expect(
        within(article).getAllByText(
          /Duplicate address\. 192\.0\.2\.10\/24 is already used on this interface\./,
        ),
      ).toHaveLength(2);
    });
    expect(
      screen.queryByText(
        "Conflicts with another interface — see the networking summary above.",
      ),
    ).toBeNull();
  });

  it("shows structural blockers immediately while field-format errors stay touch-gated", async () => {
    seedInterface("mixed-visibility", { name: "eth0" });
    seedInterface("mixed-peer", { name: "eth0" });
    useProjectStore.getState().setNetworkMtuEnabled("mixed-visibility", true);
    useProjectStore.getState().updateNetworkMtu("mixed-visibility", "0");

    renderNetworkingSection();

    await waitFor(() => {
      expect(
        screen.getAllByText(
          "Conflicts with another interface — see the networking summary above.",
        ),
      ).toHaveLength(2);
    });
    expect(
      screen.queryByText(NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID),
    ).toBeNull();

    const mtuInput = screen.getAllByLabelText("MTU")[0]!;
    fireEvent.blur(mtuInput);

    await waitFor(() => {
      expect(
        screen.getByText(NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID),
      ).toBeInTheDocument();
    });
  });

  it("renders the card-owned semantic risk-warning container for a risky DHCP and static combo", async () => {
    seedInterface("risk-ui", { name: "ens18" });
    useProjectStore.getState().setNetworkDhcp("risk-ui", "ipv4", true);
    const addressId = useProjectStore
      .getState()
      .addNetworkAddress("risk-ui", "ipv4", "addr-risk");
    useProjectStore
      .getState()
      .updateNetworkAddress("risk-ui", "ipv4", addressId!, "192.0.2.10/24");

    renderNetworkingSection();

    const container = await waitFor(() => {
      const element = document.getElementById("network-risk-ui-risk-warnings");
      expect(element).not.toBeNull();
      return element!;
    });
    expect(container).toHaveAttribute("id", "network-risk-ui-risk-warnings");
    expect(container).toHaveAttribute("tabindex", "-1");
    expect(container).toHaveClass("border-ui-warning-border", "bg-ui-warning");
    expect(
      screen.getByText(NETWORKING_VALIDATION_MESSAGES.NET_RISK_DHCP4_STATIC_IPV4),
    ).toBeInTheDocument();
    const dismissButton = screen.getByRole("button", {
        name: `Dismiss ${NETWORKING_VALIDATION_MESSAGES.NET_RISK_DHCP4_STATIC_IPV4} for ens18`,
      });
    expect(dismissButton).toHaveClass(
      "border-ui-warning-border",
      "focus:ring-offset-ui-warning",
    );
  });

  it("focuses the risk-warning container from the networking summary", async () => {
    seedInterface("risk-focus", { name: "ens18" });
    useProjectStore.getState().setNetworkDhcp("risk-focus", "ipv4", true);
    const addressId = useProjectStore
      .getState()
      .addNetworkAddress("risk-focus", "ipv4", "addr-focus");
    useProjectStore
      .getState()
      .updateNetworkAddress("risk-focus", "ipv4", addressId!, "192.0.2.10/24");

    useProjectStore.getState().markSaved();
    const projectBefore = useProjectStore.getState().project;
    const updatedAtBefore = projectBefore?.metadata.updatedAt;
    renderNetworkingSection();

    const summaryButton = await screen.findByRole("button", {
      name: new RegExp(
        `ens18: ${NETWORKING_VALIDATION_MESSAGES.NET_RISK_DHCP4_STATIC_IPV4}`,
      ),
    });
    expect(summaryButton).toHaveClass(
      "focus:ring-ui-focus",
      "focus:ring-offset-ui-warning",
    );
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "id",
        "network-risk-focus-risk-warnings",
      );
    });
    expect(useProjectStore.getState().project).toBe(projectBefore);
    expect(useProjectStore.getState().project?.metadata.updatedAt).toBe(
      updatedAtBefore,
    );
    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it("dismisses a risk warning from the card and summary without confirmation", async () => {
    seedInterface("risk-dismiss", { name: "ens18" });
    useProjectStore.getState().setNetworkDhcp("risk-dismiss", "ipv4", true);
    const addressId = useProjectStore
      .getState()
      .addNetworkAddress("risk-dismiss", "ipv4", "addr-dismiss");
    useProjectStore
      .getState()
      .updateNetworkAddress("risk-dismiss", "ipv4", addressId!, "192.0.2.10/24");

    renderNetworkingSection();

    const dismissButton = await screen.findByRole("button", {
      name: `Dismiss ${NETWORKING_VALIDATION_MESSAGES.NET_RISK_DHCP4_STATIC_IPV4} for ens18`,
    });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByText(
          NETWORKING_VALIDATION_MESSAGES.NET_RISK_DHCP4_STATIC_IPV4,
        ),
      ).toBeNull();
    });
    expect(document.getElementById("network-risk-dismiss-risk-warnings")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: new RegExp(NETWORKING_VALIDATION_MESSAGES.NET_RISK_DHCP4_STATIC_IPV4),
      }),
    ).toBeNull();
  });

  it("keeps the IPv6 risk warning visible after dismissing the IPv4 warning", async () => {
    seedInterface("dual-risk", { name: "ens18" });
    useProjectStore.getState().setNetworkDhcp("dual-risk", "ipv4", true);
    useProjectStore.getState().setNetworkDhcp("dual-risk", "ipv6", true);
    const v4RouteId = useProjectStore
      .getState()
      .addNetworkRoute("dual-risk", "ipv4", "default", "route-v4");
    const v6RouteId = useProjectStore
      .getState()
      .addNetworkRoute("dual-risk", "ipv6", "default", "route-v6");
    useProjectStore
      .getState()
      .updateNetworkRouteField("dual-risk", "ipv4", v4RouteId!, "gateway", "192.0.2.1");
    useProjectStore
      .getState()
      .updateNetworkRouteField("dual-risk", "ipv6", v6RouteId!, "gateway", "2001:db8::1");

    renderNetworkingSection();

    const container = await waitFor(() => {
      const element = document.getElementById("network-dual-risk-risk-warnings");
      expect(element).not.toBeNull();
      return element!;
    });
    const dismissButtons = within(container).getAllByRole("button", {
      name: /Dismiss DHCP is on with an explicit default route/,
    });
    expect(dismissButtons).toHaveLength(2);
    fireEvent.click(dismissButtons[0]!);

    await waitFor(() => {
      expect(
        useProjectStore.getState().project?.networking.interfaces[0]
          ?.acknowledgedRiskWarnings,
      ).toEqual([RISK_CODES.NET_RISK_DHCP4_DEFAULT_ROUTE]);
      expect(within(container).getAllByRole("button", { name: /Dismiss/ })).toHaveLength(
        1,
      );
    });
    expect(screen.getByText("1 warning")).toBeInTheDocument();
  });
});
