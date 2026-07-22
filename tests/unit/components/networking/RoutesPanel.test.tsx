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
});
