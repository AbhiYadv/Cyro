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

  if (blocked) {
    return `${descriptor.displayName} may be blocking embedded display. Use the explicit fallback only if needed.`;
  }

  return `${descriptor.displayName} is loaded as provider-owned content inside the Cyro shell. Manual login and typing remain under user control.`;
}
