export type ProviderId = "chatgpt" | "claude" | "gemini";
export type ProviderRouteId = "local" | ProviderId;

export type ProviderSessionDescriptor = {
  providerId: ProviderId;
  displayName: string;
  origin: string;
  providerOwnedLabel: string;
  fallbackAllowed: boolean;
  blockedMessage: string;
};
