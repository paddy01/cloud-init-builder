import {
  isSemanticallyBlankNetworkInterface,
  type BuilderRoute,
  type NetworkingConfig,
} from "../models/networking.ts";

export interface CloudInitRouteV2 {
  to: string;
  via?: string;
  metric?: number;
}

export interface CloudInitNameserversV2 {
  addresses?: string[];
  search?: string[];
}

export interface CloudInitEthernetV2 {
  match?: { macaddress: string };
  dhcp4: boolean;
  dhcp6: boolean;
  addresses?: string[];
  routes?: CloudInitRouteV2[];
  nameservers?: CloudInitNameserversV2;
  mtu?: number;
}

export interface CloudInitNetworkV2 {
  version: 2;
  ethernets: Record<string, CloudInitEthernetV2>;
}

function nonEmptyRows(rows: { value: string }[]): string[] {
  return rows.map((row) => row.value.trim()).filter((value) => value !== "");
}

function buildRoute(route: BuilderRoute): CloudInitRouteV2 {
  const output: CloudInitRouteV2 = {
    to: route.kind === "default" ? "default" : route.destination.trim(),
  };
  const gateway = route.gateway.trim();
  if (gateway !== "") output.via = gateway;
  const metric = route.metric.trim();
  if (metric !== "") output.metric = Number(metric);
  return output;
}

export function buildCloudInitNetworkV2(
  networking: NetworkingConfig,
): CloudInitNetworkV2 | undefined {
  const relevant = networking.interfaces.filter(
    (entry) => !isSemanticallyBlankNetworkInterface(entry),
  );
  if (relevant.length === 0) return undefined;

  const exactNameKeys = new Set(
    relevant
      .filter((entry) => entry.identityMode === "name")
      .map((entry) => entry.name.trim())
      .filter((name) => name !== ""),
  );
  const ethernets: Record<string, CloudInitEthernetV2> = {};
  const emittedKeys = new Set<string>();
  let macOrdinal = 0;

  for (const entry of relevant) {
    const exactName = entry.identityMode === "name" ? entry.name.trim() : "";
    let key = exactName;
    if (key === "") {
      do {
        key = `interface${macOrdinal}`;
        macOrdinal += 1;
      } while (exactNameKeys.has(key) || emittedKeys.has(key));
    }
    emittedKeys.add(key);

    const ethernet: CloudInitEthernetV2 = {
      ...(entry.identityMode === "mac" && entry.macAddress.trim() !== ""
        ? { match: { macaddress: entry.macAddress.trim().toLowerCase() } }
        : {}),
      dhcp4: entry.dhcp4,
      dhcp6: entry.dhcp6,
    };

    const addresses = [
      ...nonEmptyRows(entry.ipv4Addresses),
      ...nonEmptyRows(entry.ipv6Addresses),
    ];
    if (addresses.length > 0) ethernet.addresses = addresses;

    const routes = [
      ...entry.ipv4Routes.map(buildRoute),
      ...entry.ipv6Routes.map(buildRoute),
    ];
    if (routes.length > 0) ethernet.routes = routes;

    const nameservers = nonEmptyRows(entry.nameservers);
    const search = nonEmptyRows(entry.searchDomains);
    if (nameservers.length > 0 || search.length > 0) {
      ethernet.nameservers = {
        ...(nameservers.length > 0 ? { addresses: nameservers } : {}),
        ...(search.length > 0 ? { search } : {}),
      };
    }

    if (entry.mtuEnabled) {
      const mtu = Number(entry.mtu.trim());
      if (Number.isFinite(mtu) && mtu > 0) ethernet.mtu = mtu;
    }
    ethernets[key] = ethernet;
  }

  return { version: 2, ethernets };
}
