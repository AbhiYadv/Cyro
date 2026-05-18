import { describe, expect, it } from "vitest";
import {
  hasBlockedOrBlankProviderResult,
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
  surfaceMechanism: "iframe",
  feasibilityStatus: "blocked_blank",
  feasibilityResult: "Manual review observed a blank or blocked ChatGPT iframe inside the Cyro layout.",
  providerOwnedLabel: "Provider-owned origin.",
  fallbackAllowed: true,
  blockedMessage: "If this provider refuses to load inside Cyro, use the explicit fallback link."
};

const claudeDescriptor: ProviderSessionDescriptor = {
  providerId: "claude",
  displayName: "Claude",
  origin: "https://claude.ai",
  surfaceMechanism: "iframe",
  feasibilityStatus: "not_tested",
  feasibilityResult: "Claude iframe behavior has not been manually validated in this review.",
  providerOwnedLabel: "Provider-owned origin.",
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
      origin: "https://chatgpt.com",
      surfaceMechanism: "iframe",
      feasibilityStatus: "blocked_blank"
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

  it("does not describe iframe provider surfaces as confirmed loaded sessions", () => {
    expect(hasBlockedOrBlankProviderResult(chatgptDescriptor)).toBe(true);
    expect(providerSurfaceStatusText(chatgptDescriptor, false)).toContain("blocked or blank");
    expect(providerSurfaceStatusText(chatgptDescriptor, true)).toContain("blocked or blank");
    expect(providerSurfaceStatusText(claudeDescriptor, false)).toContain("not manually validated");
    expect(providerSurfaceStatusText(claudeDescriptor, false)).not.toContain("loaded");
  });
});
