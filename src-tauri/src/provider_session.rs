use serde::Serialize;
use tauri::{Manager, Url, WebviewUrl, WebviewWindowBuilder};

use crate::runtime_types::RuntimeError;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSessionDescriptor {
    pub provider_id: String,
    pub display_name: &'static str,
    pub origin: &'static str,
    pub surface_mechanism: &'static str,
    pub feasibility_status: &'static str,
    pub feasibility_result: &'static str,
    pub provider_owned_label: &'static str,
    pub fallback_allowed: bool,
    pub blocked_message: &'static str,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderNativeContainerResult {
    pub provider_id: String,
    pub display_name: &'static str,
    pub origin: &'static str,
    pub window_label: &'static str,
    pub surface_mechanism: &'static str,
    pub status: &'static str,
    pub message: String,
}

#[tauri::command]
pub fn get_provider_session(
    provider_id: String,
) -> Result<ProviderSessionDescriptor, RuntimeError> {
    resolve_provider_session(&provider_id)
}

#[tauri::command]
pub async fn open_native_provider_container(
    app: tauri::AppHandle,
    provider_id: String,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_native_provider_container(&provider_id)?;

    if let Some(window) = app.get_webview_window(target.window_label) {
        window.show().map_err(|error| {
            RuntimeError::recoverable(
                "provider_native_window_focus_failed",
                "Cyro could not show the existing provider window.",
                "Close the provider window and try opening it again.",
                Some(error.to_string()),
            )
        })?;
        window.set_focus().map_err(|error| {
            RuntimeError::recoverable(
                "provider_native_window_focus_failed",
                "Cyro could not focus the existing provider window.",
                "Use the visible provider window manually or reopen it from Cyro.",
                Some(error.to_string()),
            )
        })?;

        return Ok(target.with_status(
            "visible",
            format!(
                "{} native provider window is already visible. Provider-owned content remains user-controlled.",
                target.display_name
            ),
        ));
    }

    let provider_url = Url::parse(target.origin).map_err(|error| {
        RuntimeError::recoverable(
            "provider_origin_parse_failed",
            "Cyro could not parse the allowlisted provider origin.",
            "Use the explicit external fallback for this provider.",
            Some(error.to_string()),
        )
    })?;

    WebviewWindowBuilder::new(
        &app,
        target.window_label,
        WebviewUrl::External(provider_url),
    )
    .title(format!("Cyro Provider - {}", target.display_name))
    .inner_size(1080.0, 760.0)
    .min_inner_size(920.0, 640.0)
    .resizable(true)
    .visible(true)
    .focused(true)
    .incognito(true)
    .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
    .build()
    .map_err(|error| {
        RuntimeError::recoverable(
            "provider_native_window_failed",
            "Cyro could not open the native provider webview window.",
            "Use the explicit external fallback and keep CYRO-PROVIDER-010 marked as unresolved for this provider.",
            Some(error.to_string()),
        )
    })?;

    Ok(target.with_status(
        "visible",
        format!(
            "{} native provider window opened. Provider-owned content remains visible and user-controlled.",
            target.display_name
        ),
    ))
}

pub fn resolve_provider_session(
    provider_id: &str,
) -> Result<ProviderSessionDescriptor, RuntimeError> {
    match provider_id {
        "chatgpt" => Ok(provider_descriptor(
            "chatgpt",
            "ChatGPT",
            "https://chatgpt.com",
            "blocked_blank",
            "Manual review observed a blank or blocked ChatGPT iframe inside the Cyro layout. Iframe embedding is likely unsuitable for ChatGPT final UX.",
        )),
        "claude" => Ok(provider_descriptor(
            "claude",
            "Claude",
            "https://claude.ai",
            "not_tested",
            "Claude iframe behavior has not been manually validated in this review. Cyro must not claim embedded Claude session success.",
        )),
        "gemini" => Ok(provider_descriptor(
            "gemini",
            "Gemini",
            "https://gemini.google.com",
            "not_tested",
            "Gemini iframe behavior has not been manually validated in this review. Cyro must not claim embedded Gemini session success.",
        )),
        _ => Err(RuntimeError::recoverable(
            "provider_not_allowlisted",
            "This provider route is not allowlisted.",
            "Choose Local, ChatGPT, Claude, or Gemini.",
            Some(format!("providerId={provider_id}")),
        )),
    }
}

pub fn resolve_native_provider_container(
    provider_id: &str,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    match provider_id {
        "chatgpt" => Ok(native_container_target(
            "chatgpt",
            "ChatGPT",
            "https://chatgpt.com",
            "provider-chatgpt",
        )),
        "claude" => Ok(native_container_target(
            "claude",
            "Claude",
            "https://claude.ai",
            "provider-claude",
        )),
        "gemini" => Ok(native_container_target(
            "gemini",
            "Gemini",
            "https://gemini.google.com",
            "provider-gemini",
        )),
        _ => Err(RuntimeError::recoverable(
            "provider_not_allowlisted",
            "This provider route is not allowlisted for the native container spike.",
            "Choose Local, ChatGPT, Claude, or Gemini.",
            Some(format!("providerId={provider_id}")),
        )),
    }
}

fn provider_descriptor(
    provider_id: &str,
    display_name: &'static str,
    origin: &'static str,
    feasibility_status: &'static str,
    feasibility_result: &'static str,
) -> ProviderSessionDescriptor {
    ProviderSessionDescriptor {
        provider_id: provider_id.to_string(),
        display_name,
        origin,
        surface_mechanism: "iframe",
        feasibility_status,
        feasibility_result,
        provider_owned_label: "Provider-owned origin. Cyro does not read provider DOM, responses, cookies, tokens, or credentials.",
        fallback_allowed: true,
        blocked_message: "If this provider refuses to load inside Cyro, use the explicit fallback link. Do not bypass provider protections.",
    }
}

fn native_container_target(
    provider_id: &str,
    display_name: &'static str,
    origin: &'static str,
    window_label: &'static str,
) -> ProviderNativeContainerResult {
    ProviderNativeContainerResult {
        provider_id: provider_id.to_string(),
        display_name,
        origin,
        window_label,
        surface_mechanism: "native_webview_window",
        status: "untested",
        message: "Native provider container has not been opened in this session.".to_string(),
    }
}

impl ProviderNativeContainerResult {
    fn with_status(&self, status: &'static str, message: String) -> Self {
        Self {
            provider_id: self.provider_id.clone(),
            display_name: self.display_name,
            origin: self.origin,
            window_label: self.window_label,
            surface_mechanism: self.surface_mechanism,
            status,
            message,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{resolve_native_provider_container, resolve_provider_session};

    #[test]
    fn resolves_only_allowlisted_provider_origins() {
        let chatgpt = resolve_provider_session("chatgpt").unwrap();
        let claude = resolve_provider_session("claude").unwrap();
        let gemini = resolve_provider_session("gemini").unwrap();

        assert_eq!(chatgpt.origin, "https://chatgpt.com");
        assert_eq!(claude.origin, "https://claude.ai");
        assert_eq!(gemini.origin, "https://gemini.google.com");
        assert_eq!(chatgpt.surface_mechanism, "iframe");
        assert_eq!(chatgpt.feasibility_status, "blocked_blank");
        assert_eq!(claude.feasibility_status, "not_tested");
        assert_eq!(gemini.feasibility_status, "not_tested");
    }

    #[test]
    fn rejects_unknown_provider_ids_and_arbitrary_urls() {
        let unknown = resolve_provider_session("perplexity").unwrap_err();
        let arbitrary_url = resolve_provider_session("https://chatgpt.com").unwrap_err();

        assert_eq!(unknown.code, "provider_not_allowlisted");
        assert_eq!(arbitrary_url.code, "provider_not_allowlisted");
    }

    #[test]
    fn resolves_native_container_targets_from_provider_id_only() {
        let chatgpt = resolve_native_provider_container("chatgpt").unwrap();
        let claude = resolve_native_provider_container("claude").unwrap();
        let gemini = resolve_native_provider_container("gemini").unwrap();

        assert_eq!(chatgpt.provider_id, "chatgpt");
        assert_eq!(chatgpt.origin, "https://chatgpt.com");
        assert_eq!(chatgpt.window_label, "provider-chatgpt");
        assert_eq!(chatgpt.surface_mechanism, "native_webview_window");
        assert_eq!(chatgpt.status, "untested");
        assert_eq!(claude.origin, "https://claude.ai");
        assert_eq!(gemini.origin, "https://gemini.google.com");
    }

    #[test]
    fn rejects_unknown_native_provider_ids_and_arbitrary_urls() {
        let unknown = resolve_native_provider_container("perplexity").unwrap_err();
        let arbitrary_url = resolve_native_provider_container("https://chatgpt.com").unwrap_err();

        assert_eq!(unknown.code, "provider_not_allowlisted");
        assert_eq!(arbitrary_url.code, "provider_not_allowlisted");
    }
}
