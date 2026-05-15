use serde::Serialize;
use std::{
    fs,
    path::Path,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

pub const PLACEHOLDER_MODEL_ID: &str = "qwen-0_8b-local";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelPathState {
    NotConfigured,
    PathMissing,
    NotFile,
    NotReadable,
    UnsupportedExtension,
    ValidGguf,
    Error,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPathValidationResult {
    pub valid: bool,
    pub state: ModelPathState,
    pub path: Option<String>,
    pub file_name: Option<String>,
    pub extension: Option<String>,
    pub file_size_mb: Option<f64>,
    pub readable: bool,
    pub is_file: bool,
    pub message: String,
    pub recoverable: bool,
    pub user_action: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRegistryEntry {
    pub model_id: String,
    pub display_name: String,
    pub family: String,
    pub parameter_class: String,
    pub quantization: String,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub context_window: u32,
    pub installed: bool,
    pub validated: bool,
    pub file_size_mb: Option<f64>,
    pub min_ram_mb: u32,
    pub recommended_ram_mb: u32,
    pub last_validated_at: Option<String>,
}

pub struct ModelRegistryState {
    entries: Mutex<Vec<ModelRegistryEntry>>,
}

impl Default for ModelRegistryState {
    fn default() -> Self {
        Self {
            entries: Mutex::new(initial_model_registry()),
        }
    }
}

impl ModelRegistryState {
    pub fn entries(&self) -> Result<Vec<ModelRegistryEntry>, String> {
        let entries = self
            .entries
            .lock()
            .map_err(|_| "Model registry state is unavailable.".to_string())?;

        Ok(entries.clone())
    }

    pub fn get_model_entry(
        &self,
        model_id: Option<&str>,
    ) -> Result<Option<ModelRegistryEntry>, String> {
        let target_model_id = model_id.unwrap_or(PLACEHOLDER_MODEL_ID);
        let entries = self
            .entries
            .lock()
            .map_err(|_| "Model registry state is unavailable.".to_string())?;

        Ok(entries
            .iter()
            .find(|entry| entry.model_id == target_model_id)
            .cloned())
    }
}

pub fn initial_model_registry() -> Vec<ModelRegistryEntry> {
    vec![ModelRegistryEntry {
        model_id: PLACEHOLDER_MODEL_ID.to_string(),
        display_name: "Qwen 0.8B Local".to_string(),
        family: "qwen".to_string(),
        parameter_class: "0.8B".to_string(),
        quantization: "unknown_until_path_validated".to_string(),
        file_path: None,
        file_name: None,
        context_window: 4096,
        installed: false,
        validated: false,
        file_size_mb: None,
        min_ram_mb: 2048,
        recommended_ram_mb: 4096,
        last_validated_at: None,
    }]
}

#[tauri::command]
pub fn validate_model_path(path: String) -> ModelPathValidationResult {
    validate_model_path_value(&path)
}

#[tauri::command]
pub fn get_model_registry(
    registry: tauri::State<'_, ModelRegistryState>,
) -> Result<Vec<ModelRegistryEntry>, String> {
    registry.entries()
}

#[tauri::command]
pub fn set_model_path(
    model_id: String,
    path: String,
    registry: tauri::State<'_, ModelRegistryState>,
) -> Result<ModelRegistryEntry, String> {
    let validation = validate_model_path_value(&path);
    if !validation.valid {
        return Err(validation.message);
    }

    let mut entries = registry
        .entries
        .lock()
        .map_err(|_| "Model registry state is unavailable.".to_string())?;

    apply_model_path_to_registry(&mut entries, &model_id, validation)
}

pub fn validate_model_path_value(path: &str) -> ModelPathValidationResult {
    let trimmed_path = path.trim();

    if trimmed_path.is_empty() {
        return validation_result(
            ModelPathState::NotConfigured,
            None,
            None,
            None,
            None,
            false,
            false,
            "No model path is configured.",
            "Choose a local .gguf model file in a future configuration flow.",
        );
    }

    if trimmed_path != path || contains_rejected_path_syntax(trimmed_path) {
        return validation_result(
            ModelPathState::Error,
            Some(trimmed_path.to_string()),
            None,
            None,
            None,
            false,
            false,
            "Model path must be a local file path, not a URL or shell command.",
            "Provide one direct local .gguf file path with no command arguments.",
        );
    }

    let candidate = Path::new(trimmed_path);
    let extension = candidate
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase());
    let file_name = candidate
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.to_string());

    let metadata = match fs::metadata(candidate) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return validation_result(
                ModelPathState::PathMissing,
                Some(trimmed_path.to_string()),
                file_name,
                extension,
                None,
                false,
                false,
                "Model path does not exist.",
                "Select an existing local .gguf file.",
            );
        }
        Err(error) if error.kind() == std::io::ErrorKind::PermissionDenied => {
            return validation_result(
                ModelPathState::NotReadable,
                Some(trimmed_path.to_string()),
                file_name,
                extension,
                None,
                false,
                false,
                "Model path is not readable.",
                "Check file permissions or choose a readable local .gguf file.",
            );
        }
        Err(_) => {
            return validation_result(
                ModelPathState::Error,
                Some(trimmed_path.to_string()),
                file_name,
                extension,
                None,
                false,
                false,
                "Model path could not be inspected safely.",
                "Choose a direct local .gguf file path.",
            );
        }
    };

    if !metadata.is_file() {
        return validation_result(
            ModelPathState::NotFile,
            Some(trimmed_path.to_string()),
            file_name,
            extension,
            None,
            false,
            false,
            "Model path is not a file.",
            "Choose a local .gguf model file, not a directory.",
        );
    }

    if extension.as_deref() != Some("gguf") {
        return validation_result(
            ModelPathState::UnsupportedExtension,
            Some(trimmed_path.to_string()),
            file_name,
            extension,
            Some(bytes_to_mb(metadata.len())),
            false,
            true,
            "Only .gguf model files are supported in this phase.",
            "Choose a local GGUF model file.",
        );
    }

    if fs::File::open(candidate).is_err() {
        return validation_result(
            ModelPathState::NotReadable,
            Some(trimmed_path.to_string()),
            file_name,
            extension,
            Some(bytes_to_mb(metadata.len())),
            false,
            true,
            "Model file is not readable.",
            "Check file permissions or choose a readable local .gguf file.",
        );
    }

    validation_result(
        ModelPathState::ValidGguf,
        Some(trimmed_path.to_string()),
        file_name,
        extension,
        Some(bytes_to_mb(metadata.len())),
        true,
        true,
        "Model path is a readable local GGUF file.",
        "This validates the path only. Model loading and inference are deferred.",
    )
}

pub fn apply_model_path_to_registry(
    entries: &mut [ModelRegistryEntry],
    model_id: &str,
    validation: ModelPathValidationResult,
) -> Result<ModelRegistryEntry, String> {
    if !validation.valid {
        return Err(validation.message);
    }

    let entry = entries
        .iter_mut()
        .find(|entry| entry.model_id == model_id)
        .ok_or_else(|| format!("Unknown model registry entry: {model_id}"))?;

    entry.file_path = validation.path;
    entry.file_name = validation.file_name;
    entry.file_size_mb = validation.file_size_mb;
    entry.installed = true;
    entry.validated = true;
    entry.last_validated_at = current_timestamp_label();

    Ok(entry.clone())
}

fn validation_result(
    state: ModelPathState,
    path: Option<String>,
    file_name: Option<String>,
    extension: Option<String>,
    file_size_mb: Option<f64>,
    readable: bool,
    is_file: bool,
    message: &str,
    user_action: &str,
) -> ModelPathValidationResult {
    ModelPathValidationResult {
        valid: state == ModelPathState::ValidGguf,
        state,
        path,
        file_name,
        extension,
        file_size_mb,
        readable,
        is_file,
        message: message.to_string(),
        recoverable: true,
        user_action: user_action.to_string(),
    }
}

fn contains_rejected_path_syntax(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();

    path.contains('\0')
        || path.contains('\n')
        || path.contains('\r')
        || lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("file://")
        || path.contains(';')
        || path.contains("&&")
        || path.contains("||")
        || path.contains('`')
        || path.contains("$(")
        || path.contains('>')
        || path.contains('<')
        || lower.contains(".gguf ")
}

fn bytes_to_mb(bytes: u64) -> f64 {
    (bytes as f64) / 1_048_576.0
}

fn current_timestamp_label() -> Option<String> {
    let seconds = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    Some(format!("unix:{seconds}"))
}

#[cfg(test)]
mod tests {
    use super::{
        apply_model_path_to_registry, initial_model_registry, validate_model_path_value,
        ModelPathState,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn valid_gguf_temp_file_returns_valid_gguf() {
        let sandbox = TestSandbox::new("valid");
        let model_path = sandbox.write_file("qwen-test.gguf", b"gguf placeholder");

        let result = validate_model_path_value(path_str(&model_path));

        assert!(result.valid);
        assert_eq!(result.state, ModelPathState::ValidGguf);
        assert_eq!(result.file_name.as_deref(), Some("qwen-test.gguf"));
        assert_eq!(result.extension.as_deref(), Some("gguf"));
        assert!(result.readable);
        assert!(result.is_file);
        assert!(result.file_size_mb.unwrap_or_default() > 0.0);
    }

    #[test]
    fn missing_path_returns_path_missing() {
        let sandbox = TestSandbox::new("missing");
        let missing_path = sandbox.path().join("missing.gguf");

        let result = validate_model_path_value(path_str(&missing_path));

        assert!(!result.valid);
        assert_eq!(result.state, ModelPathState::PathMissing);
    }

    #[test]
    fn directory_path_returns_not_file() {
        let sandbox = TestSandbox::new("directory");

        let result = validate_model_path_value(path_str(sandbox.path()));

        assert!(!result.valid);
        assert_eq!(result.state, ModelPathState::NotFile);
    }

    #[test]
    fn unsupported_extension_returns_unsupported_extension() {
        let sandbox = TestSandbox::new("extension");
        let model_path = sandbox.write_file("qwen-test.bin", b"not gguf");

        let result = validate_model_path_value(path_str(&model_path));

        assert!(!result.valid);
        assert_eq!(result.state, ModelPathState::UnsupportedExtension);
        assert_eq!(result.extension.as_deref(), Some("bin"));
    }

    #[test]
    fn url_like_path_is_rejected_before_filesystem_lookup() {
        let result = validate_model_path_value("https://example.com/model.gguf");

        assert!(!result.valid);
        assert_eq!(result.state, ModelPathState::Error);
        assert!(result.message.contains("local file path"));
    }

    #[test]
    fn command_like_path_is_rejected_before_filesystem_lookup() {
        let result = validate_model_path_value("/tmp/model.gguf --threads 8");

        assert!(!result.valid);
        assert_eq!(result.state, ModelPathState::Error);
        assert!(result.user_action.contains("no command arguments"));
    }

    #[test]
    fn initial_registry_returns_qwen_placeholder() {
        let registry = initial_model_registry();

        assert_eq!(registry.len(), 1);
        assert_eq!(registry[0].model_id, "qwen-0_8b-local");
        assert_eq!(registry[0].display_name, "Qwen 0.8B Local");
        assert!(!registry[0].installed);
        assert!(!registry[0].validated);
    }

    #[test]
    fn set_model_path_updates_placeholder_without_loading_model() {
        let sandbox = TestSandbox::new("registry");
        let model_path = sandbox.write_file("qwen-test.gguf", b"gguf placeholder");
        let validation = validate_model_path_value(path_str(&model_path));
        let mut registry = initial_model_registry();

        let entry =
            apply_model_path_to_registry(&mut registry, "qwen-0_8b-local", validation).unwrap();

        assert!(entry.installed);
        assert!(entry.validated);
        assert_eq!(entry.file_name.as_deref(), Some("qwen-test.gguf"));
        assert_eq!(entry.file_path.as_deref(), Some(path_str(&model_path)));
        assert!(entry.last_validated_at.is_some());
    }

    struct TestSandbox {
        root: PathBuf,
    }

    impl TestSandbox {
        fn new(label: &str) -> Self {
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system time should be valid")
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "cyro-model-validation-{label}-{}-{nanos}",
                std::process::id()
            ));
            fs::create_dir_all(&root).expect("test sandbox should be created");

            Self { root }
        }

        fn path(&self) -> &Path {
            &self.root
        }

        fn write_file(&self, name: &str, content: &[u8]) -> PathBuf {
            let path = self.root.join(name);
            fs::write(&path, content).expect("test file should be written");
            path
        }
    }

    impl Drop for TestSandbox {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    fn path_str(path: &Path) -> &str {
        path.to_str().expect("test path should be utf8")
    }
}
