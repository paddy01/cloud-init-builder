import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RoutesPanel } from "../../../../src/components/networking/RoutesPanel.tsx";
import { createDefaultProject } from "../../../../src/models/project.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const interfaceId = "interface-a";

function RoutesHarness() {
  const entry = useProjectStore((state) =>
    state.project?.networking.interfaces.find(
      (candidate) => candidate.id === interfaceId,
    ),
  );
  if (!entry) throw new Error("expected interface fixture");
  return <RoutesPanel entry={entry} />;
}

function currentInterface() {
  const entry = useProjectStore
    .getState()
    .project?.networking.interfaces.find(
      (candidate) => candidate.id === interfaceId,
    );
  if (!entry) throw new Error("expected interface fixture");
  return entry;
}

function resetInterface() {
  useProjectStore.setState({
    project: createDefaultProject("Routes panel contract"),
    lastSavedProject: null,
    isDirty: false,
    importWarnings: [],
  });
  useProjectStore.getState().addNetworkInterface(interfaceId);
  useProjectStore.getState().updateNetworkInterface(interfaceId, {
    name: "ens18",
  });
}

describe("RoutesPanel", () => {
  beforeEach(resetInterface);

  it("exposes separate empty family groups with adjacent intent-specific actions", () => {
    render(<RoutesHarness />);

    const ipv4 = screen.getByRole("group", { name: "IPv4 routes" });
    const ipv6 = screen.getByRole("group", { name: "IPv6 routes" });

    expect(within(ipv4).getByText("No IPv4 routes added.")).toBeInTheDocument();
    expect(within(ipv6).getByText("No IPv6 routes added.")).toBeInTheDocument();
    for (const family of [ipv4, ipv6]) {
      expect(
        within(family).getByRole("button", { name: "Add default route" }),
      ).toBeInTheDocument();
      expect(
        within(family).getByRole("button", { name: "Add specific route" }),
      ).toBeInTheDocument();
    }
  });

  it("creates exact default and specific row shapes and preserves partial drafts", () => {
    render(<RoutesHarness />);
    const ipv4 = screen.getByRole("group", { name: "IPv4 routes" });
    const ipv6 = screen.getByRole("group", { name: "IPv6 routes" });

    fireEvent.click(
      within(ipv4).getByRole("button", { name: "Add default route" }),
    );
    const defaultRow = within(ipv4).getByRole("group", {
      name: "Default route 1 for ens18",
    });
    const defaultGateway = within(defaultRow).getByRole("textbox", {
      name: "Gateway for IPv4 default route 1 for ens18",
    });
    expect(defaultGateway).toHaveFocus();
    expect(defaultGateway).toHaveAttribute("placeholder", "192.0.2.1");
    expect(within(defaultRow).queryByText("Destination")).toBeNull();
    fireEvent.change(defaultGateway, { target: { value: " 192.0.2. " } });

    fireEvent.click(
      within(ipv4).getByRole("button", { name: "Add specific route" }),
    );
    const specificRow = within(ipv4).getByRole("group", {
      name: "Specific route 2 for ens18",
    });
    const destination = within(specificRow).getByRole("textbox", {
      name: "Destination for IPv4 specific route 2 for ens18",
    });
    const optionalGateway = within(specificRow).getByRole("textbox", {
      name: "Gateway (optional) for IPv4 specific route 2 for ens18",
    });
    expect(destination).toHaveFocus();
    expect(destination).toHaveAttribute("placeholder", "198.51.100.0/24");
    expect(optionalGateway).toHaveAttribute("placeholder", "192.0.2.1");
    fireEvent.change(destination, { target: { value: "198.51.100" } });
    fireEvent.change(optionalGateway, { target: { value: "" } });

    fireEvent.click(
      within(ipv6).getByRole("button", { name: "Add specific route" }),
    );
    const ipv6Destination = within(ipv6).getByRole("textbox", {
      name: "Destination for IPv6 specific route 1 for ens18",
    });
    expect(ipv6Destination).toHaveAttribute(
      "placeholder",
      "2001:db8:1::/64",
    );
    expect(
      within(ipv6).getByRole("textbox", {
        name: "Gateway (optional) for IPv6 specific route 1 for ens18",
      }),
    ).toHaveAttribute("placeholder", "2001:db8::1");

    expect(currentInterface().ipv4Routes).toEqual([
      expect.objectContaining({ kind: "default", gateway: " 192.0.2. " }),
      expect.objectContaining({
        kind: "specific",
        destination: "198.51.100",
        gateway: "",
      }),
    ]);
    expect(currentInterface().ipv6Routes).toHaveLength(1);
  });

  it("keeps zero, one, and many routes family-owned in persisted order", () => {
    render(<RoutesHarness />);
    const ipv4 = screen.getByRole("group", { name: "IPv4 routes" });
    const ipv6 = screen.getByRole("group", { name: "IPv6 routes" });

    fireEvent.click(
      within(ipv4).getByRole("button", { name: "Add specific route" }),
    );
    fireEvent.click(
      within(ipv4).getByRole("button", { name: "Add default route" }),
    );
    fireEvent.click(
      within(ipv6).getByRole("button", { name: "Add default route" }),
    );

    expect(currentInterface().ipv4Routes.map((route) => route.kind)).toEqual([
      "specific",
      "default",
    ]);
    expect(currentInterface().ipv6Routes.map((route) => route.kind)).toEqual([
      "default",
    ]);
    expect(
      within(ipv4).getByRole("group", { name: "Specific route 1 for ens18" }),
    ).toBeInTheDocument();
    expect(
      within(ipv4).getByRole("group", { name: "Default route 2 for ens18" }),
    ).toBeInTheDocument();
  });

  it("removes by stable ID and focuses next, previous, then same-family default action", () => {
    render(<RoutesHarness />);
    const ipv4 = screen.getByRole("group", { name: "IPv4 routes" });
    const addDefault = within(ipv4).getByRole("button", {
      name: "Add default route",
    });

    fireEvent.click(addDefault);
    fireEvent.click(
      within(ipv4).getByRole("button", { name: "Add specific route" }),
    );
    fireEvent.click(addDefault);

    fireEvent.click(
      within(ipv4).getByRole("button", {
        name: "Remove specific route 2 for ens18",
      }),
    );
    expect(
      within(ipv4).getByRole("textbox", {
        name: "Gateway for IPv4 default route 2 for ens18",
      }),
    ).toHaveFocus();

    fireEvent.click(
      within(ipv4).getByRole("button", {
        name: "Remove default route 2 for ens18",
      }),
    );
    expect(
      within(ipv4).getByRole("textbox", {
        name: "Gateway for IPv4 default route 1 for ens18",
      }),
    ).toHaveFocus();

    fireEvent.click(
      within(ipv4).getByRole("button", {
        name: "Remove default route 1 for ens18",
      }),
    );
    expect(addDefault).toHaveFocus();
  });

  it("keeps Advanced collapsed, keyboard operable, route-associated, and transient", () => {
    render(<RoutesHarness />);
    const ipv4 = screen.getByRole("group", { name: "IPv4 routes" });
    const addDefault = within(ipv4).getByRole("button", {
      name: "Add default route",
    });
    const addSpecific = within(ipv4).getByRole("button", {
      name: "Add specific route",
    });

    fireEvent.click(addDefault);
    fireEvent.click(addSpecific);
    useProjectStore.setState({ isDirty: false });
    const projectBefore = useProjectStore.getState().project;

    const firstAdvanced = within(ipv4).getByRole("button", {
      name: "Advanced for IPv4 default route 1 for ens18",
    });
    const secondAdvanced = within(ipv4).getByRole("button", {
      name: "Advanced for IPv4 specific route 2 for ens18",
    });
    expect(firstAdvanced).toHaveAttribute("aria-expanded", "false");
    expect(secondAdvanced).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: /Metric/ })).toBeNull();

    firstAdvanced.focus();
    fireEvent.keyDown(firstAdvanced, { key: "Enter" });
    expect(firstAdvanced).toHaveAttribute("aria-expanded", "true");
    expect(
      within(ipv4).getByRole("textbox", {
        name: "Metric (optional) for IPv4 default route 1 for ens18",
      }),
    ).toBeInTheDocument();
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.getState().project).toBe(projectBefore);

    fireEvent.click(
      within(ipv4).getByRole("button", {
        name: "Remove default route 1 for ens18",
      }),
    );
    expect(secondAdvanced).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: /Metric/ })).toBeNull();
  });

  it("preserves raw metric drafts without semantic validation", () => {
    render(<RoutesHarness />);
    const ipv6 = screen.getByRole("group", { name: "IPv6 routes" });
    fireEvent.click(
      within(ipv6).getByRole("button", { name: "Add specific route" }),
    );
    const advanced = within(ipv6).getByRole("button", {
      name: "Advanced for IPv6 specific route 1 for ens18",
    });
    fireEvent.click(advanced);

    const metric = within(ipv6).getByRole("textbox", {
      name: "Metric (optional) for IPv6 specific route 1 for ens18",
    });
    expect(metric).toHaveAttribute("inputmode", "numeric");
    expect(metric).toHaveAttribute("placeholder", "100");
    fireEvent.change(metric, { target: { value: " -1x " } });

    expect(currentInterface().ipv6Routes[0]).toMatchObject({
      metric: " -1x ",
    });
    expect(metric).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("links field-local example markers and clears only the changed metric marker", () => {
    useProjectStore.getState().addNetworkRoute(
      interfaceId,
      "ipv4",
      "default",
      "route-example",
    );
    useProjectStore.setState((state) => {
      const project = state.project;
      if (!project) return state;
      return {
        project: {
          ...project,
          networking: {
            interfaces: project.networking.interfaces.map((entry) =>
              entry.id === interfaceId
                ? {
                    ...entry,
                    ipv4Routes: entry.ipv4Routes.map((route) =>
                      route.id === "route-example"
                        ? {
                            ...route,
                            gateway: "192.0.2.1",
                            metric: "100",
                            exampleFields: ["gateway", "metric"],
                          }
                        : route,
                    ),
                  }
                : entry,
            ),
          },
        },
      };
    });

    render(<RoutesHarness />);
    const ipv4 = screen.getByRole("group", { name: "IPv4 routes" });
    const gateway = within(ipv4).getByRole("textbox", {
      name: "Gateway for IPv4 default route 1 for ens18",
    });
    const gatewayDescription = gateway.getAttribute("aria-describedby");
    expect(gatewayDescription).toBeTruthy();
    expect(document.getElementById(gatewayDescription!)).toHaveTextContent(
      "Example value—replace for your network",
    );

    fireEvent.click(
      within(ipv4).getByRole("button", {
        name: "Advanced for IPv4 default route 1 for ens18",
      }),
    );
    const metric = within(ipv4).getByRole("textbox", {
      name: "Metric (optional) for IPv4 default route 1 for ens18",
    });
    const metricDescription = metric.getAttribute("aria-describedby");
    expect(metricDescription).toBeTruthy();
    expect(metricDescription).not.toBe(gatewayDescription);

    fireEvent.change(metric, { target: { value: "100" } });
    expect(metric).toHaveAttribute("aria-describedby", metricDescription!);
    fireEvent.change(metric, { target: { value: "101" } });
    expect(metric).not.toHaveAttribute("aria-describedby");
    expect(gateway).toHaveAttribute("aria-describedby", gatewayDescription!);
    expect(metric).toHaveFocus();
  });
});
