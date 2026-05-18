import { getProviderSession } from "./tauriClient";
import type { ProviderId, ProviderRouteId, ProviderSessionDescriptor } from "../types/provider";

export const providerRouteOptions: Array<{ id: ProviderRouteId; label: string }> = [
  { id: "local", label: "Local" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" }
];

export function isProviderId(routeId: ProviderRouteId): routeId is ProviderId {
  return routeId === "chatgpt" || routeId === "claude" || routeId === "gemini";
}

export function isAllowlistedProviderOrigin(origin: string) {
  return origin === "https://chatgpt.com" || origin === "https://claude.ai" || origin === "https://gemini.google.com";
}

export function hasBlockedOrBlankProviderResult(descriptor: ProviderSessionDescriptor | null) {
  return descriptor?.feasibilityStatus === "blocked_blank";
}

export async function loadProviderSurface(
  providerId: ProviderId,
  getSession: (providerId: ProviderId) => Promise<ProviderSessionDescriptor> = getProviderSession
) {
  const descriptor = await getSession(providerId);

  if (!isAllowlistedProviderOrigin(descriptor.origin)) {
    throw new Error("Provider origin is not allowlisted.");
  }

  return descriptor;
}

export function providerSurfaceStatusText(descriptor: ProviderSessionDescriptor | null, blocked: boolean) {
  if (!descriptor) {
    return "Select a provider to test embedded session feasibility.";
  }

  if (blocked || hasBlockedOrBlankProviderResult(descriptor)) {
    return `${descriptor.displayName} iframe embedding is blocked or blank in this feasibility result. Use the explicit fallback only; do not bypass provider protections.`;
  }

  if (descriptor.feasibilityStatus === "not_tested") {
    return `${descriptor.displayName} iframe embedding is not manually validated. This is a feasibility surface, not confirmed provider-session UX.`;
  }

  return `${descriptor.displayName} iframe feasibility is unresolved. Manual login and typing remain user-controlled if the provider surface is visible.`;
}
