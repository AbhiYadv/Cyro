import { describe, expect, it } from "vitest";
import { getSidecarStatus, mockedSidecarStatus, setSidecarPath, validateSidecarPath, type SidecarInvoker } from "../services/sidecar";

describe("sidecar discovery contract", () => {
  it("returns a mocked not-configured status without binary execution", async () => {
    await expect(getSidecarStatus()).resolves.toEqual(mockedSidecarStatus);
  });

  it("uses the status command contract", async () => {
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

  it("passes sidecar path validation through the Rust command boundary", async () => {
    const invocations: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const expected = {
      ...mockedSidecarStatus,
      state: "available" as const,
      binaryKind: "llama-cli" as const,
      path: "/tmp/llama-cli",
      message: "llama-cli sidecar is available."
    };
    const invoker: SidecarInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      invocations.push({ command, args });
      return expected as T;
    };

    const status = await validateSidecarPath("/tmp/llama-cli", invoker);

    expect(status.state).toBe("available");
    expect(invocations).toEqual([{ command: "validate_sidecar_path", args: { path: "/tmp/llama-cli" } }]);
  });

  it("passes sidecar path setting through the Rust command boundary", async () => {
    const invocations: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const invoker: SidecarInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      invocations.push({ command, args });
      return mockedSidecarStatus as T;
    };

    await setSidecarPath("/tmp/llama-cli", invoker);

    expect(invocations).toEqual([{ command: "set_sidecar_path", args: { path: "/tmp/llama-cli" } }]);
  });
});
