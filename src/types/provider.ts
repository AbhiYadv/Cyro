export type ProviderId = "chatgpt" | "claude" | "gemini";
export type ProviderRouteId = "local" | ProviderId;
export type ProviderSurfaceMechanism = "iframe" | "native_webview_window" | "native_child_webview";
export type ProviderFeasibilityStatus = "blocked_blank" | "not_tested";
export type ProviderNativeContainerStatus =
  | "untested"
  | "opening"
  | "in_layout"
  | "separate_window_fallback"
  | "visible"
  | "blocked"
  | "failed"
  | "fallback";

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

export type ProviderNativeContainerResult = {
  providerId: ProviderId;
  displayName: string;
  origin: string;
  windowLabel: string;
  surfaceMechanism: "native_webview_window" | "native_child_webview";
  status: ProviderNativeContainerStatus;
  message: string;
};
