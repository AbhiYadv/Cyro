export type ModelPathState =
  | "not_configured"
  | "path_missing"
  | "not_file"
  | "not_readable"
  | "unsupported_extension"
  | "valid_gguf"
  | "error";

export type ModelPathValidationResult = {
  valid: boolean;
  state: ModelPathState;
  path: string | null;
  fileName: string | null;
  extension: string | null;
  fileSizeMb: number | null;
  readable: boolean;
  isFile: boolean;
  message: string;
  recoverable: boolean;
  userAction: string;
};

export type ModelRegistryEntry = {
  modelId: string;
  displayName: string;
  family: string;
  parameterClass: string;
  quantization: string;
  filePath: string | null;
  fileName: string | null;
  contextWindow: number;
  installed: boolean;
  validated: boolean;
  fileSizeMb: number | null;
  minRamMb: number;
  recommendedRamMb: number;
  lastValidatedAt: string | null;
};
