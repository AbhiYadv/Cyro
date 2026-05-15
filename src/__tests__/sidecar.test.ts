import { describe, expect, it } from "vitest";
import { getSidecarStatus, mockedSidecarStatus, type SidecarInvoker } from "../services/sidecar";

describe("sidecar discovery contract", () => {
  it("returns a mocked not-configured status without binary execution", async () => {
    await expect(getSidecarStatus()).resolves.toEqual(mockedSidecarStatus);
  });

  it("uses only the status command contract", async () => {
    const invocations: string[] = [];
    const invoker: SidecarInvoker = async <T>(command: string) => {
      invocations.push(command);
      return mockedSidecarStatus as T;
    };

    const status = await getSidecarStatus(invoker);

    expect(status.state).toBe("not_configured");
    expect(status.binaryKind).toBeNull();
    expect(status.path).toBeNull();
    expect(invocations).toEqual(["get_sidecar_status"]);
  });
});
