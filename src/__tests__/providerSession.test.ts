import { describe, expect, it } from "vitest";
import {
  isAllowlistedProviderOrigin,
  isProviderId,
  loadProviderSurface,
  providerRouteOptions,
  providerSurfaceStatusText
} from "../services/providerSession";
import type { ProviderSessionDescriptor } from "../types/provider";

const chatgptDescriptor: ProviderSessionDescriptor = {
  providerId: "chatgpt",
  displayName: "ChatGPT",
  origin: "https://chatgpt.com",
  providerOwnedLabel: "Provider-owned content.",
  fallbackAllowed: true,
  blockedMessage: "If this provider refuses to load inside Cyro, use the explicit fallback link."
};

describe("providerSession service", () => {
  it("exposes local and allowlisted provider route options", () => {
    expect(providerRouteOptions.map((route) => route.id)).toEqual(["local", "chatgpt", "claude", "gemini"]);
  });

  it("treats only provider routes as provider ids", () => {
    expect(isProviderId("chatgpt")).toBe(true);
    expect(isProviderId("claude")).toBe(true);
    expect(isProviderId("gemini")).toBe(true);
    expect(isProviderId("local")).toBe(false);
  });

  it("allowlists only hardcoded provider origins", () => {
    expect(isAllowlistedProviderOrigin("https://chatgpt.com")).toBe(true);
    expect(isAllowlistedProviderOrigin("https://claude.ai")).toBe(true);
    expect(isAllowlistedProviderOrigin("https://gemini.google.com")).toBe(true);
    expect(isAllowlistedProviderOrigin("https://example.com")).toBe(false);
    expect(isAllowlistedProviderOrigin("https://chatgpt.com.evil.example")).toBe(false);
  });

  it("loads an allowlisted provider descriptor", async () => {
    const descriptor = await loadProviderSurface("chatgpt", async () => chatgptDescriptor);

    expect(descriptor).toMatchObject({
      providerId: "chatgpt",
      origin: "https://chatgpt.com"
    });
  });

  it("rejects a descriptor if the native origin is not allowlisted", async () => {
    await expect(
      loadProviderSurface("chatgpt", async () => ({
        ...chatgptDescriptor,
        origin: "https://example.com"
      }))
    ).rejects.toThrow("Provider origin is not allowlisted.");
  });

  it("labels normal and blocked provider-owned surfaces", () => {
    expect(providerSurfaceStatusText(chatgptDescriptor, false)).toContain("provider-owned content");
    expect(providerSurfaceStatusText(chatgptDescriptor, true)).toContain("blocking embedded display");
  });
});
