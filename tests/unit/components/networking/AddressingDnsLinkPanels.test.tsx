import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AddressingPanel } from "../../../../src/components/networking/AddressingPanel.tsx";
import { createDefaultProject } from "../../../../src/models/project.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const interfaceId = "interface-a";

function AddressingHarness() {
  const entry = useProjectStore((state) =>
    state.project?.networking.interfaces.find(
      (candidate) => candidate.id === interfaceId,
    ),
  );
  if (!entry) throw new Error("expected interface fixture");
  return <AddressingPanel entry={entry} />;
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

describe("AddressingPanel", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: createDefaultProject("Panel contract"),
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
    useProjectStore.getState().addNetworkInterface(interfaceId);
    useProjectStore.getState().updateNetworkInterface(interfaceId, {
      name: "ens18",
    });
  });

  it("exposes independently labeled native DHCP controls", () => {
    render(<AddressingHarness />);

    const ipv4 = screen.getByRole("group", { name: "IPv4" });
    const ipv6 = screen.getByRole("group", { name: "IPv6" });
    const dhcp4 = within(ipv4).getByRole("checkbox", {
      name: "Enable DHCP4",
    });
    const dhcp6 = within(ipv6).getByRole("checkbox", {
      name: "Enable DHCP6",
    });

    fireEvent.click(within(ipv4).getByText("Enable DHCP4"));
    expect(dhcp4).toBeChecked();
    expect(dhcp6).not.toBeChecked();

    fireEvent.click(within(ipv6).getByText("Enable DHCP6"));
    expect(dhcp4).toBeChecked();
    expect(dhcp6).toBeChecked();
  });

  it("preserves zero, one, and many raw CIDR drafts in family-owned order", () => {
    render(<AddressingHarness />);

    expect(
      screen.getByText("No static IPv4 addresses added."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No static IPv6 addresses added."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Add IPv4 address" }),
    );
    const first = screen.getByRole("textbox", {
      name: "IPv4 address 1 for ens18",
    });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("placeholder", "192.0.2.10/24");
    fireEvent.change(first, { target: { value: " 192.0.2.10/ " } });

    fireEvent.click(
      screen.getByRole("button", { name: "Add IPv4 address" }),
    );
    const second = screen.getByRole("textbox", {
      name: "IPv4 address 2 for ens18",
    });
    expect(second).toHaveFocus();
    fireEvent.change(second, { target: { value: "198.51.100" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Add IPv6 address" }),
    );
    const ipv6 = screen.getByRole("textbox", {
      name: "IPv6 address 1 for ens18",
    });
    expect(ipv6).toHaveFocus();
    expect(ipv6).toHaveAttribute("placeholder", "2001:db8::10/64");
    fireEvent.change(ipv6, { target: { value: " 2001:db8:: " } });

    expect(currentInterface().ipv4Addresses.map((row) => row.value)).toEqual([
      " 192.0.2.10/ ",
      "198.51.100",
    ]);
    expect(currentInterface().ipv6Addresses.map((row) => row.value)).toEqual([
      " 2001:db8:: ",
    ]);
  });

  it("links example markers and removes rows with stable next-previous-add focus", () => {
    useProjectStore.getState().removeNetworkInterface(interfaceId);
    const exampleId = useProjectStore
      .getState()
      .applyNetworkExample("static-ipv4");
    if (!exampleId) throw new Error("expected example interface");

    function ExampleHarness() {
      const entry = useProjectStore(
        (state) => state.project?.networking.interfaces[0],
      );
      if (!entry) throw new Error("expected example interface fixture");
      return <AddressingPanel entry={entry} />;
    }

    render(<ExampleHarness />);
    const exampleInput = screen.getByRole("textbox", {
      name: "IPv4 address 1 for ens18",
    });
    const descriptionId = exampleInput.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      "Example value—replace for your network",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add IPv4 address" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add IPv4 address" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove IPv4 address 2 for ens18" }),
    );
    expect(
      screen.getByRole("textbox", { name: "IPv4 address 2 for ens18" }),
    ).toHaveFocus();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove IPv4 address 2 for ens18" }),
    );
    expect(exampleInput).toHaveFocus();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove IPv4 address 1 for ens18" }),
    );
    expect(
      screen.getByRole("button", { name: "Add IPv4 address" }),
    ).toHaveFocus();
  });
});
