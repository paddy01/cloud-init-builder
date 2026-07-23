import {
  isSemanticallyBlankNetworkInterface,
  type BuilderNetworkInterface,
  type NetworkingConfig,
} from "../models/networking.ts";
import type { ValidationIssue } from "./validateConfig.ts";

export const NETWORKING_VALIDATION_MESSAGES = {
  NET_MTU_INVALID: "Enter a positive whole number, e.g. 1500.",
} as const;

export function networkFieldPath(interfaceId: string, field: string): string {
  return `networking.interfaces.${interfaceId}.${field}`;
}

function isPositiveIntegerMtu(value: string): boolean {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0;
}

function validateInterfaceMtu(entry: BuilderNetworkInterface): ValidationIssue[] {
  if (!entry.mtuEnabled) {
    return [];
  }

  if (isPositiveIntegerMtu(entry.mtu)) {
    return [];
  }

  return [
    {
      path: networkFieldPath(entry.id, "mtu"),
      code: "NET_MTU_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID,
      severity: "error",
    },
  ];
}

function validateSingleInterface(
  entry: BuilderNetworkInterface,
): ValidationIssue[] {
  if (isSemanticallyBlankNetworkInterface(entry)) {
    return [];
  }

  return [...validateInterfaceMtu(entry)];
}

export function validateNetworking(
  networking: NetworkingConfig | undefined,
): ValidationIssue[] {
  if (!networking) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  for (const entry of networking.interfaces) {
    issues.push(...validateSingleInterface(entry));
  }
  return issues;
}
