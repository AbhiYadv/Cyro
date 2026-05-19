use serde::Serialize;
use tauri::{
    LogicalPosition, LogicalSize, Manager, Rect, Url, WebviewBuilder, WebviewUrl,
    WebviewWindowBuilder,
};

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

const PROVIDER_IN_LAYOUT_TOP: f64 = 96.0;
const PROVIDER_IN_LAYOUT_BOTTOM_RESERVED: f64 = 236.0;
const PROVIDER_IN_LAYOUT_DESKTOP_MARGIN: f64 = 40.0;
const PROVIDER_IN_LAYOUT_MOBILE_MARGIN: f64 = 16.0;
const PROVIDER_SHELL_MAX_WIDTH: f64 = 1248.0;

#[tauri::command]
pub fn get_provider_session(
    provider_id: String,
) -> Result<ProviderSessionDescriptor, RuntimeError> {
    resolve_provider_session(&provider_id)
}

#[tauri::command]
pub async fn open_in_layout_provider_container(
    app: tauri::AppHandle,
    window: tauri::Window,
    provider_id: String,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;
    let bounds = provider_in_layout_bounds(&window)?;

    close_other_in_layout_provider_webviews(&app, target.window_label)?;

    if let Some(webview) = app.get_webview(target.window_label) {
        webview.set_bounds(bounds).map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_resize_failed",
                "Cyro could not resize the existing in-layout provider webview.",
                "Close and reopen Cyro before continuing provider container validation.",
                Some(error.to_string()),
            )
        })?;

        return Ok(target.with_status(
            "in_layout",
            format!(
                "{} in-layout native provider webview is attached to the main Cyro window. This validates placement only, not login, chat, or session persistence.",
                target.display_name
            ),
        ));
    }

    let provider_url = Url::parse(target.origin).map_err(|error| {
        RuntimeError::recoverable(
            "provider_origin_parse_failed",
            "Cyro could not parse the allowlisted provider origin.",
            "Use the explicit separate-window fallback for this provider.",
            Some(error.to_string()),
        )
    })?;
    let allowed_host = provider_url.host_str().unwrap_or_default().to_string();

    let webview_builder = WebviewBuilder::new(
        target.window_label,
        WebviewUrl::External(provider_url),
    )
    .incognito(true)
    .on_navigation(move |url| {
        url.scheme() == "https" && url.host_str() == Some(allowed_host.as_str())
    })
    .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny);

    window
        .add_child(webview_builder, bounds.position, bounds.size)
        .map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_webview_failed",
                "Cyro could not attach an in-layout native provider webview to the main window.",
                "Use the explicit separate-window fallback and keep CYRO-PROVIDER-011 marked as unresolved for final UX.",
                Some(error.to_string()),
            )
        })?;

    Ok(target.with_status(
        "in_layout",
        format!(
            "{} in-layout native provider webview opened inside the main Cyro window. This validates placement only, not login, chat, or session persistence.",
            target.display_name
        ),
    ))
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
            "separate_window_fallback",
            format!(
                "{} separate native provider window is already visible as fallback only. Provider-owned content remains user-controlled.",
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
        "separate_window_fallback",
        format!(
            "{} separate native provider window opened as fallback only. Provider-owned content remains visible and user-controlled.",
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

pub fn resolve_in_layout_provider_container(
    provider_id: &str,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    match provider_id {
        "chatgpt" => Ok(native_child_container_target(
            "chatgpt",
            "ChatGPT",
            "https://chatgpt.com",
            "provider-in-layout-chatgpt",
        )),
        "claude" => Ok(native_child_container_target(
            "claude",
            "Claude",
            "https://claude.ai",
            "provider-in-layout-claude",
        )),
        "gemini" => Ok(native_child_container_target(
            "gemini",
            "Gemini",
            "https://gemini.google.com",
            "provider-in-layout-gemini",
        )),
        _ => Err(RuntimeError::recoverable(
            "provider_not_allowlisted",
            "This provider route is not allowlisted for the in-layout native container spike.",
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

fn native_child_container_target(
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
        surface_mechanism: "native_child_webview",
        status: "untested",
        message: "In-layout native provider container has not been opened in this session."
            .to_string(),
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

fn provider_in_layout_bounds(window: &tauri::Window) -> Result<Rect, RuntimeError> {
    let inner_size = window.inner_size().map_err(|error| {
        RuntimeError::recoverable(
            "provider_window_size_failed",
            "Cyro could not read the main window size for the in-layout provider webview.",
            "Use the explicit separate-window fallback for this provider.",
            Some(error.to_string()),
        )
    })?;
    let scale_factor = window.scale_factor().map_err(|error| {
        RuntimeError::recoverable(
            "provider_window_scale_failed",
            "Cyro could not read the main window scale for the in-layout provider webview.",
            "Use the explicit separate-window fallback for this provider.",
            Some(error.to_string()),
        )
    })?;
    let logical_size = inner_size.to_logical::<f64>(scale_factor);
    let shell_width = logical_size.width.min(PROVIDER_SHELL_MAX_WIDTH);
    let margin = if logical_size.width < 760.0 {
        PROVIDER_IN_LAYOUT_MOBILE_MARGIN
    } else {
        PROVIDER_IN_LAYOUT_DESKTOP_MARGIN
    };
    let x = ((logical_size.width - shell_width) / 2.0).max(0.0) + margin;
    let width = (shell_width - (margin * 2.0)).max(320.0);
    let height = (logical_size.height
        - PROVIDER_IN_LAYOUT_TOP
        - PROVIDER_IN_LAYOUT_BOTTOM_RESERVED)
        .max(280.0);

    Ok(Rect {
        position: LogicalPosition::new(x, PROVIDER_IN_LAYOUT_TOP).into(),
        size: LogicalSize::new(width, height).into(),
    })
}

fn close_other_in_layout_provider_webviews(
    app: &tauri::AppHandle,
    active_label: &str,
) -> Result<(), RuntimeError> {
    for label in [
        "provider-in-layout-chatgpt",
        "provider-in-layout-claude",
        "provider-in-layout-gemini",
    ] {
        if label == active_label {
            continue;
        }

        if let Some(webview) = app.get_webview(label) {
            webview.close().map_err(|error| {
                RuntimeError::recoverable(
                    "provider_in_layout_close_failed",
                    "Cyro could not close the previous in-layout provider webview.",
                    "Close and reopen Cyro before continuing provider container validation.",
                    Some(error.to_string()),
                )
            })?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_in_layout_provider_container, resolve_native_provider_container,
        resolve_provider_session,
    };

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

    #[test]
    fn resolves_in_layout_container_targets_from_provider_id_only() {
        let chatgpt = resolve_in_layout_provider_container("chatgpt").unwrap();
        let claude = resolve_in_layout_provider_container("claude").unwrap();
        let gemini = resolve_in_layout_provider_container("gemini").unwrap();

        assert_eq!(chatgpt.provider_id, "chatgpt");
        assert_eq!(chatgpt.origin, "https://chatgpt.com");
        assert_eq!(chatgpt.window_label, "provider-in-layout-chatgpt");
        assert_eq!(chatgpt.surface_mechanism, "native_child_webview");
        assert_eq!(chatgpt.status, "untested");
        assert_eq!(claude.origin, "https://claude.ai");
        assert_eq!(gemini.origin, "https://gemini.google.com");
    }

    #[test]
    fn rejects_unknown_in_layout_provider_ids_and_arbitrary_urls() {
        let unknown = resolve_in_layout_provider_container("perplexity").unwrap_err();
        let arbitrary_url = resolve_in_layout_provider_container("https://chatgpt.com").unwrap_err();

        assert_eq!(unknown.code, "provider_not_allowlisted");
        assert_eq!(arbitrary_url.code, "provider_not_allowlisted");
    }
}
