import { NETWORKING_STRUCTURAL_CODES } from "../../models/networkingCodes.ts";
import type { BuilderNetworkInterface } from "../../models/networking.ts";

export function isNetworkingIssuePath(path: string): boolean {
  return path.startsWith("networking.interfaces.");
}

export function getInterfaceIdFromIssuePath(path: string): string | null {
  const match = path.match(/^networking\.interfaces\.([^.]+)\./);
  return match?.[1] ?? null;
}

export function pathToFocusTargetId(path: string): string | null {
  const interfaceId = getInterfaceIdFromIssuePath(path);
  if (!interfaceId) {
    return null;
  }

  if (path.endsWith(".mtu")) {
    return `network-${interfaceId}-mtu`;
  }

  return null;
}

export function isStructuralNetworkingCode(code: string): boolean {
  return NETWORKING_STRUCTURAL_CODES.has(code);
}

export function getNetworkInterfaceSummaryLabel(
  interfaceId: string,
  interfaces: BuilderNetworkInterface[],
): string {
  const index = interfaces.findIndex((entry) => entry.id === interfaceId);
  const entry = interfaces[index];
  if (!entry) {
    return "Interface";
  }

  const activeDraft =
    entry.identityMode === "name" ? entry.name : entry.macAddress;
  const trimmed = activeDraft.trim();
  return trimmed === "" ? `Interface ${index + 1}` : trimmed;
}

export function sortNetworkingSummaryIssues<
  T extends { severity: string; path: string },
>(issues: T[]): T[] {
  return [...issues].sort((left, right) => {
    if (left.severity === "error" && right.severity === "warning") {
      return -1;
    }
    if (left.severity === "warning" && right.severity === "error") {
      return 1;
    }
    return left.path.localeCompare(right.path);
  });
}
