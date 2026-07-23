import { describe, expect, it } from "vitest";
import {
  createBlankNetworkInterface,
  type NetworkingConfig,
} from "../../../src/models/networking.ts";
import { createDefaultProject } from "../../../src/models/project.ts";
import {
  NETWORKING_VALIDATION_MESSAGES,
  validateNetworking,
} from "../../../src/validators/validateNetworking.ts";
import { validateConfig } from "../../../src/validators/validateConfig.ts";

function networkingConfig(
  interfaces: NetworkingConfig["interfaces"],
): NetworkingConfig {
  return { interfaces };
}

function configuredInterface(
  id: string,
  patch: Partial<NetworkingConfig["interfaces"][number]> = {},
) {
  return {
    ...createBlankNetworkInterface(id),
    name: "ens18",
    ...patch,
  };
}

describe("validateNetworking", () => {
  it("returns no issues for undefined networking", () => {
    expect(validateNetworking(undefined)).toEqual([]);
  });

  it("returns no issues for a semantically blank interface", () => {
    const entry = createBlankNetworkInterface("blank-interface");
    expect(validateNetworking(networkingConfig([entry]))).toEqual([]);
  });

  it("returns no issues for a valid positive MTU", () => {
    const entry = configuredInterface("valid-mtu", {
      mtuEnabled: true,
      mtu: "1500",
    });
    expect(validateNetworking(networkingConfig([entry]))).toEqual([]);
  });

  it.each(["0", "-1", "abc", ""])(
    "returns NET_MTU_INVALID for invalid enabled MTU %j",
    (mtu) => {
      const entry = configuredInterface(`invalid-mtu-${mtu}`, {
        mtuEnabled: true,
        mtu,
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(issues).toEqual([
        {
          path: `networking.interfaces.invalid-mtu-${mtu}.mtu`,
          code: "NET_MTU_INVALID",
          message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID,
          severity: "error",
        },
      ]);
    },
  );

  it("merges networking MTU issues through validateConfig", () => {
    const project = createDefaultProject("Networking validation");
    project.identity = { hostname: "web01" };
    project.networking = networkingConfig([
      configuredInterface("iface-1", {
        mtuEnabled: true,
        mtu: "0",
      }),
    ]);

    const issues = validateConfig(project);
    expect(issues).toContainEqual({
      path: "networking.interfaces.iface-1.mtu",
      code: "NET_MTU_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID,
      severity: "error",
    });
  });
});
