import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AddressingPanel } from "../../../../src/components/networking/AddressingPanel.tsx";
import { DnsPanel } from "../../../../src/components/networking/DnsPanel.tsx";
import { LinkSettingsPanel } from "../../../../src/components/networking/LinkSettingsPanel.tsx";
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

function DnsHarness() {
  const entry = useProjectStore((state) =>
    state.project?.networking.interfaces.find(
      (candidate) => candidate.id === interfaceId,
    ),
  );
  if (!entry) throw new Error("expected interface fixture");
  return <DnsPanel entry={entry} />;
}

function LinkHarness() {
  const entry = useProjectStore((state) =>
    state.project?.networking.interfaces.find(
      (candidate) => candidate.id === interfaceId,
    ),
  );
  if (!entry) throw new Error("expected interface fixture");
  return <LinkSettingsPanel entry={entry} />;
}

function resetInterface() {
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
}

describe("AddressingPanel", () => {
  beforeEach(() => {
    resetInterface();
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

    fireEvent.click(
      screen.getByRole("button", { name: "Remove IPv6 address 1 for ens18" }),
    );
    expect(
      screen.getByRole("button", { name: "Add IPv6 address" }),
    ).toHaveFocus();
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

describe("DnsPanel", () => {
  beforeEach(resetInterface);

  it("keeps mixed-family nameservers and search domains as raw ordered drafts", () => {
    render(<DnsHarness />);

    expect(
      screen.getByText("No nameserver addresses added."),
    ).toBeInTheDocument();
    expect(screen.getByText("No search domains added.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add nameserver" }));
    const ipv4 = screen.getByRole("textbox", {
      name: "Nameserver 1 for ens18",
    });
    expect(ipv4).toHaveFocus();
    expect(ipv4).toHaveAttribute(
      "placeholder",
      "192.0.2.53 or 2001:db8::53",
    );
    fireEvent.change(ipv4, { target: { value: " 192.0.2. " } });

    fireEvent.click(screen.getByRole("button", { name: "Add nameserver" }));
    const ipv6 = screen.getByRole("textbox", {
      name: "Nameserver 2 for ens18",
    });
    fireEvent.change(ipv6, { target: { value: " 2001:db8::53 " } });

    fireEvent.click(screen.getByRole("button", { name: "Add search domain" }));
    const domain = screen.getByRole("textbox", {
      name: "Search domain 1 for ens18",
    });
    expect(domain).toHaveFocus();
    fireEvent.change(domain, { target: { value: " lab.example. " } });

    expect(currentInterface().nameservers.map((row) => row.value)).toEqual([
      " 192.0.2. ",
      " 2001:db8::53 ",
    ]);
    expect(currentInterface().searchDomains.map((row) => row.value)).toEqual([
      " lab.example. ",
    ]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses independent stable next-previous-add focus for both DNS lists", () => {
    render(<DnsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Add nameserver" }));
    fireEvent.click(screen.getByRole("button", { name: "Add nameserver" }));
    fireEvent.click(screen.getByRole("button", { name: "Add nameserver" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove nameserver 2 for ens18" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Nameserver 2 for ens18" }),
    ).toHaveFocus();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove nameserver 2 for ens18" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Nameserver 1 for ens18" }),
    ).toHaveFocus();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove nameserver 1 for ens18" }),
    );
    expect(
      screen.getByRole("button", { name: "Add nameserver" }),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Add search domain" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove search domain 1 for ens18" }),
    );
    expect(
      screen.getByRole("button", { name: "Add search domain" }),
    ).toHaveFocus();
  });

  it("links example markers uniquely and clears only the edited field", () => {
    useProjectStore.getState().removeNetworkInterface(interfaceId);
    useProjectStore.getState().applyNetworkExample("static-ipv4");

    function ExampleDnsHarness() {
      const entry = useProjectStore(
        (state) => state.project?.networking.interfaces[0],
      );
      if (!entry) throw new Error("expected example interface fixture");
      return <DnsPanel entry={entry} />;
    }

    render(<ExampleDnsHarness />);
    const nameserver = screen.getByRole("textbox", {
      name: "Nameserver 1 for ens18",
    });
    const domain = screen.getByRole("textbox", {
      name: "Search domain 1 for ens18",
    });
    expect(nameserver.getAttribute("aria-describedby")).toBeTruthy();
    expect(domain.getAttribute("aria-describedby")).toBeTruthy();
    expect(nameserver.getAttribute("aria-describedby")).not.toBe(
      domain.getAttribute("aria-describedby"),
    );

    nameserver.focus();
    fireEvent.change(nameserver, { target: { value: "192.0.2.54" } });
    expect(nameserver).not.toHaveAttribute("aria-describedby");
    expect(domain).toHaveAttribute("aria-describedby");
    expect(nameserver).toHaveFocus();
  });
});

describe("LinkSettingsPanel", () => {
  beforeEach(resetInterface);

  it("represents off, enabled-blank, typed, and destructive-disable MTU states", () => {
    render(<LinkHarness />);
    const toggle = screen.getByRole("checkbox", { name: "Set custom MTU" });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole("textbox", { name: "MTU" })).toBeNull();

    fireEvent.click(toggle);
    const input = screen.getByRole("textbox", { name: "MTU" });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("placeholder", "1500");
    expect(currentInterface()).toMatchObject({ mtuEnabled: true, mtu: "" });

    fireEvent.change(input, { target: { value: " 14x0 " } });
    expect(currentInterface().mtu).toBe(" 14x0 ");
    fireEvent.click(toggle);
    expect(currentInterface()).toMatchObject({ mtuEnabled: false, mtu: "" });
    expect(screen.queryByRole("textbox", { name: "MTU" })).toBeNull();
  });

  it("describes an example MTU uniquely until that exact draft is edited", () => {
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
                    mtuEnabled: true,
                    mtu: "1500",
                    exampleFields: ["mtu"],
                  }
                : entry,
            ),
          },
        },
      };
    });

    render(<LinkHarness />);
    const input = screen.getByRole("textbox", { name: "MTU" });
    const markerId = input.getAttribute("aria-describedby");
    expect(markerId).toBeTruthy();
    expect(document.getElementById(markerId!)).toHaveTextContent(
      "Example value—replace for your network",
    );

    input.focus();
    fireEvent.change(input, { target: { value: "1501" } });
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).toHaveFocus();
  });
});
