export type ProviderId = "chatgpt" | "claude" | "gemini";
export type ProviderRouteId = "local" | ProviderId;
export type ProviderSurfaceMechanism = "iframe";
export type ProviderFeasibilityStatus = "blocked_blank" | "not_tested";

export type ProviderSessionDescriptor = {
  providerId: ProviderId;
  displayName: string;
  origin: string;
  surfaceMechanism: ProviderSurfaceMechanism;
  feasibilityStatus: ProviderFeasibilityStatus;
  feasibilityResult: string;
  providerOwnedLabel: string;
  fallbackAllowed: boolean;
  blockedMessage: string;
};
