export type SidecarBinaryState =
  | "not_configured"
  | "path_missing"
  | "not_executable"
  | "unsupported_binary"
  | "version_unknown"
  | "available"
  | "error";

export type SidecarBinaryKind = "llama-cli" | "llama-server";

export type SidecarDiscoverySource = "developer_override" | "standard_dev_path" | "bundled_resource_future" | "not_configured";

export type SidecarBinaryConfig = {
  binaryId: string;
  binaryKind: SidecarBinaryKind;
  configuredPath: string;
  discoverySource: SidecarDiscoverySource;
  validated: boolean;
  version: string | null;
  lastCheckedAt: string | null;
};

export type SidecarBinaryStatus = {
  state: SidecarBinaryState;
  binaryKind: SidecarBinaryKind | null;
  path: string | null;
  version: string | null;
  message: string;
  recoverable: boolean;
  userAction: string;
  lastCheckedAt: string | null;
};
