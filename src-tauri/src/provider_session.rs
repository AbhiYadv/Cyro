use serde::{Deserialize, Serialize};
use tauri::{
    webview::{Color, PageLoadEvent},
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

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderViewportBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ProviderWebviewSessionPolicy {
    pub incognito: bool,
    pub data_store_identifier: [u8; 16],
}

const PROVIDER_VIEWPORT_MIN_WIDTH: f64 = 320.0;
const PROVIDER_VIEWPORT_MIN_HEIGHT: f64 = 280.0;
const PROVIDER_VIEWPORT_MAX_EDGE: f64 = 12_000.0;
const PROVIDER_WEBVIEW_DARK_BACKGROUND: Color = Color(5, 6, 7, 255);

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
    viewport_bounds: ProviderViewportBounds,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;
    let bounds = provider_in_layout_bounds_from_viewport(&window, &provider_id, viewport_bounds)?;

    if let Some(webview) = app.get_webview(target.window_label) {
        webview.set_bounds(bounds).map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_resize_failed",
                "Cyro could not resize the existing in-layout provider webview.",
                "Close and reopen Cyro before continuing provider container validation.",
                Some(error.to_string()),
            )
        })?;
        webview.show().map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_show_failed",
                "Cyro could not show the existing in-layout provider webview.",
                "Close and reopen Cyro before continuing provider container validation.",
                Some(error.to_string()),
            )
        })?;

        return Ok(target.with_status(
            "native_visible",
            format!(
                "{} in-layout native provider webview is attached to the main Cyro window. Provider-owned session storage remains inside the native webview.",
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
    let session_policy = provider_webview_session_policy(&provider_id)?;
    let navigation_provider_id = target.provider_id.clone();
    let popup_provider_id = target.provider_id.clone();

    let webview_builder =
        WebviewBuilder::new(target.window_label, WebviewUrl::External(provider_url))
            .background_color(PROVIDER_WEBVIEW_DARK_BACKGROUND)
            .incognito(session_policy.incognito)
            .data_store_identifier(session_policy.data_store_identifier)
            .on_navigation(move |url| is_provider_navigation_allowed(&navigation_provider_id, url))
            .on_page_load(|webview, payload| {
                if payload.event() == PageLoadEvent::Finished {
                    let _ = webview.show();
                }
            })
            .on_new_window(move |url, _| {
                if is_provider_navigation_allowed(&popup_provider_id, &url) {
                    tauri::webview::NewWindowResponse::Allow
                } else {
                    tauri::webview::NewWindowResponse::Deny
                }
            });

    let hidden_bounds = hidden_provider_child_bounds();
    window
        .add_child(webview_builder, hidden_bounds.position, hidden_bounds.size)
        .map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_webview_failed",
                "Cyro could not attach an in-layout native provider webview to the main window.",
                "Use the explicit separate-window fallback and keep CYRO-PROVIDER-011 marked as unresolved for final UX.",
                Some(error.to_string()),
            )
        })?
        .hide()
        .map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_hide_failed",
                "Cyro could not hide the new in-layout provider webview during initial load.",
                "Use the explicit separate-window fallback and keep provider-session validation pending.",
                Some(error.to_string()),
            )
        })?;

    let Some(webview) = app.get_webview(target.window_label) else {
        return Err(RuntimeError::recoverable(
            "provider_in_layout_webview_missing",
            "Cyro attached the provider webview but could not retrieve it for positioning.",
            "Use the explicit separate-window fallback and keep provider-session validation pending.",
            None,
        ));
    };
    webview.set_bounds(bounds).map_err(|error| {
        RuntimeError::recoverable(
            "provider_in_layout_resize_failed",
            "Cyro could not position the hidden provider webview before first paint.",
            "Use the explicit separate-window fallback and keep provider-session validation pending.",
            Some(error.to_string()),
        )
    })?;

    Ok(target.with_status(
        "native_visible",
        format!(
            "{} in-layout native provider webview opened inside the main Cyro window with provider-owned persistent session storage.",
            target.display_name
        ),
    ))
}

#[tauri::command]
pub async fn resize_in_layout_provider_container(
    app: tauri::AppHandle,
    window: tauri::Window,
    provider_id: String,
    viewport_bounds: ProviderViewportBounds,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;
    let bounds = provider_in_layout_bounds_from_viewport(&window, &provider_id, viewport_bounds)?;

    let Some(webview) = app.get_webview(target.window_label) else {
        return Ok(target.with_status(
            "native_failed",
            format!(
                "{} in-layout native provider webview is not attached yet.",
                target.display_name
            ),
        ));
    };

    webview.set_bounds(bounds).map_err(|error| {
        RuntimeError::recoverable(
            "provider_in_layout_resize_failed",
            "Cyro could not resize the in-layout provider webview.",
            "Close and reopen the provider route before continuing provider container validation.",
            Some(error.to_string()),
        )
    })?;
    webview.show().map_err(|error| {
        RuntimeError::recoverable(
            "provider_in_layout_show_failed",
            "Cyro could not show the in-layout provider webview.",
            "Close and reopen the provider route before continuing provider container validation.",
            Some(error.to_string()),
        )
    })?;

    Ok(target.with_status(
        "native_visible",
        format!(
            "{} in-layout native provider webview bounds updated from the Cyro provider viewport.",
            target.display_name
        ),
    ))
}

#[tauri::command]
pub async fn hide_in_layout_provider_container(
    app: tauri::AppHandle,
    provider_id: String,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;

    if let Some(webview) = app.get_webview(target.window_label) {
        webview.hide().map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_hide_failed",
                "Cyro could not hide the inactive in-layout provider webview.",
                "Close and reopen Cyro before continuing provider container validation.",
                Some(error.to_string()),
            )
        })?;
    }

    Ok(target.with_status(
        "native_hidden",
        format!(
            "{} in-layout native provider webview hidden without closing its provider-owned session.",
            target.display_name
        ),
    ))
}

#[tauri::command]
pub async fn provider_reload(
    app: tauri::AppHandle,
    provider_id: String,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;

    let Some(webview) = app.get_webview(target.window_label) else {
        return Ok(target.with_status(
            "native_failed",
            format!(
                "{} in-layout native provider webview is not attached yet.",
                target.display_name
            ),
        ));
    };

    webview.hide().map_err(|error| {
        RuntimeError::recoverable(
            "provider_reload_hide_failed",
            "Cyro could not mask the provider webview before reload.",
            "Use Provider Home or reopen the provider route.",
            Some(error.to_string()),
        )
    })?;
    webview.reload().map_err(|error| {
        RuntimeError::recoverable(
            "provider_reload_failed",
            "Cyro could not reload the provider webview.",
            "Use Provider Home or reopen the provider route.",
            Some(error.to_string()),
        )
    })?;

    Ok(target.with_status(
        "native_opening",
        format!(
            "{} provider session reload requested. Provider-owned content remains unread by Cyro.",
            target.display_name
        ),
    ))
}

#[tauri::command]
pub async fn provider_go_home(
    app: tauri::AppHandle,
    provider_id: String,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;
    let provider_url = provider_home_url(&provider_id)?;

    let Some(webview) = app.get_webview(target.window_label) else {
        return Ok(target.with_status(
            "native_failed",
            format!(
                "{} in-layout native provider webview is not attached yet.",
                target.display_name
            ),
        ));
    };

    webview.hide().map_err(|error| {
        RuntimeError::recoverable(
            "provider_home_hide_failed",
            "Cyro could not mask the provider webview before navigating home.",
            "Reload or reopen the provider route.",
            Some(error.to_string()),
        )
    })?;
    webview.navigate(provider_url).map_err(|error| {
        RuntimeError::recoverable(
            "provider_home_failed",
            "Cyro could not navigate the provider webview to its allowlisted home.",
            "Reload or reopen the provider route.",
            Some(error.to_string()),
        )
    })?;

    Ok(target.with_status(
        "native_opening",
        format!(
            "{} provider home requested from the Rust-owned allowlist. No frontend URL was accepted.",
            target.display_name
        ),
    ))
}

#[tauri::command]
pub async fn close_in_layout_provider_container(
    app: tauri::AppHandle,
    provider_id: String,
) -> Result<ProviderNativeContainerResult, RuntimeError> {
    let target = resolve_in_layout_provider_container(&provider_id)?;

    if let Some(webview) = app.get_webview(target.window_label) {
        webview.close().map_err(|error| {
            RuntimeError::recoverable(
                "provider_in_layout_close_failed",
                "Cyro could not close the in-layout provider webview.",
                "Close and reopen Cyro before continuing provider container validation.",
                Some(error.to_string()),
            )
        })?;
    }

    Ok(target.with_status(
        "idle",
        format!(
            "{} in-layout native provider webview closed. No provider content was read by Cyro.",
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
    let session_policy = provider_webview_session_policy(&provider_id)?;
    let navigation_provider_id = target.provider_id.clone();
    let popup_provider_id = target.provider_id.clone();

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
    .incognito(session_policy.incognito)
    .data_store_identifier(session_policy.data_store_identifier)
    .on_navigation(move |url| is_provider_navigation_allowed(&navigation_provider_id, url))
    .on_new_window(move |url, _| {
        if is_provider_navigation_allowed(&popup_provider_id, &url) {
            tauri::webview::NewWindowResponse::Allow
        } else {
            tauri::webview::NewWindowResponse::Deny
        }
    })
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

pub fn provider_webview_session_policy(
    provider_id: &str,
) -> Result<ProviderWebviewSessionPolicy, RuntimeError> {
    resolve_in_layout_provider_container(provider_id)?;

    let data_store_identifier = match provider_id {
        "chatgpt" => *b"cyro-chatgpt-v01",
        "claude" => *b"cyro-claude--v01",
        "gemini" => *b"cyro-gemini--v01",
        _ => unreachable!("provider id was already allowlist-validated"),
    };

    Ok(ProviderWebviewSessionPolicy {
        incognito: false,
        data_store_identifier,
    })
}

pub fn provider_home_url(provider_id: &str) -> Result<Url, RuntimeError> {
    let target = resolve_in_layout_provider_container(provider_id)?;
    Url::parse(target.origin).map_err(|error| {
        RuntimeError::recoverable(
            "provider_origin_parse_failed",
            "Cyro could not parse the allowlisted provider origin.",
            "Use reload or reopen the provider route.",
            Some(error.to_string()),
        )
    })
}

pub fn is_provider_navigation_allowed(provider_id: &str, url: &Url) -> bool {
    if url.scheme() != "https" {
        return false;
    }

    let Some(host) = url.host_str() else {
        return false;
    };

    provider_allowed_navigation_hosts(provider_id)
        .map(|hosts| hosts.iter().any(|allowed_host| *allowed_host == host))
        .unwrap_or(false)
}

fn provider_allowed_navigation_hosts(
    provider_id: &str,
) -> Result<&'static [&'static str], RuntimeError> {
    resolve_in_layout_provider_container(provider_id)?;

    match provider_id {
        "chatgpt" => Ok(&[
            "chatgpt.com",
            "auth.openai.com",
            "auth0.openai.com",
            "accounts.google.com",
            "appleid.apple.com",
        ]),
        "claude" => Ok(&["claude.ai", "accounts.google.com", "appleid.apple.com"]),
        "gemini" => Ok(&[
            "gemini.google.com",
            "accounts.google.com",
            "myaccount.google.com",
        ]),
        _ => unreachable!("provider id was already allowlist-validated"),
    }
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
        status: "idle",
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
        status: "idle",
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

fn provider_in_layout_bounds_from_viewport(
    window: &tauri::Window,
    provider_id: &str,
    viewport_bounds: ProviderViewportBounds,
) -> Result<Rect, RuntimeError> {
    let sanitized = validate_provider_viewport_bounds(provider_id, viewport_bounds)?;
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
    let max_width = (logical_size.width - sanitized.x).max(PROVIDER_VIEWPORT_MIN_WIDTH);
    let max_height = (logical_size.height - sanitized.y).max(PROVIDER_VIEWPORT_MIN_HEIGHT);
    let width = sanitized.width.min(max_width);
    let height = sanitized.height.min(max_height);

    Ok(Rect {
        position: LogicalPosition::new(sanitized.x, sanitized.y).into(),
        size: LogicalSize::new(width, height).into(),
    })
}

fn hidden_provider_child_bounds() -> Rect {
    Rect {
        position: LogicalPosition::new(-20_000.0, -20_000.0).into(),
        size: LogicalSize::new(1.0, 1.0).into(),
    }
}

fn validate_provider_viewport_bounds(
    provider_id: &str,
    bounds: ProviderViewportBounds,
) -> Result<ProviderViewportBounds, RuntimeError> {
    resolve_in_layout_provider_container(provider_id)?;

    let values = [bounds.x, bounds.y, bounds.width, bounds.height];
    if values.iter().any(|value| !value.is_finite()) {
        return Err(invalid_provider_bounds_error(
            "provider viewport bounds must be finite numbers",
        ));
    }

    if bounds.x < 0.0 || bounds.y < 0.0 {
        return Err(invalid_provider_bounds_error(
            "provider viewport origin cannot be negative",
        ));
    }

    if bounds.width < PROVIDER_VIEWPORT_MIN_WIDTH || bounds.height < PROVIDER_VIEWPORT_MIN_HEIGHT {
        return Err(invalid_provider_bounds_error(
            "provider viewport is too small",
        ));
    }

    if values
        .iter()
        .any(|value| *value > PROVIDER_VIEWPORT_MAX_EDGE)
    {
        return Err(invalid_provider_bounds_error(
            "provider viewport bounds are unreasonably large",
        ));
    }

    Ok(ProviderViewportBounds {
        x: bounds.x.round(),
        y: bounds.y.round(),
        width: bounds.width.round(),
        height: bounds.height.round(),
    })
}

fn invalid_provider_bounds_error(detail: &'static str) -> RuntimeError {
    RuntimeError::recoverable(
        "provider_in_layout_bounds_invalid",
        "Cyro rejected invalid provider viewport bounds.",
        "Reopen the provider route and keep the provider surface visible.",
        Some(detail.to_string()),
    )
}

#[cfg(test)]
mod tests {
    use super::{
        is_provider_navigation_allowed, provider_webview_session_policy,
        provider_home_url,
        resolve_in_layout_provider_container, resolve_native_provider_container,
        resolve_provider_session, validate_provider_viewport_bounds, ProviderViewportBounds,
    };
    use tauri::Url;

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
        assert_eq!(chatgpt.status, "idle");
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
        assert_eq!(chatgpt.status, "idle");
        assert_eq!(claude.origin, "https://claude.ai");
        assert_eq!(gemini.origin, "https://gemini.google.com");
    }

    #[test]
    fn rejects_unknown_in_layout_provider_ids_and_arbitrary_urls() {
        let unknown = resolve_in_layout_provider_container("perplexity").unwrap_err();
        let arbitrary_url =
            resolve_in_layout_provider_container("https://chatgpt.com").unwrap_err();

        assert_eq!(unknown.code, "provider_not_allowlisted");
        assert_eq!(arbitrary_url.code, "provider_not_allowlisted");
    }

    #[test]
    fn provider_home_uses_allowlisted_provider_origin() {
        let chatgpt = provider_home_url("chatgpt").unwrap();
        let claude = provider_home_url("claude").unwrap();
        let gemini = provider_home_url("gemini").unwrap();

        assert_eq!(chatgpt.as_str(), "https://chatgpt.com/");
        assert_eq!(claude.as_str(), "https://claude.ai/");
        assert_eq!(gemini.as_str(), "https://gemini.google.com/");
    }

    #[test]
    fn provider_navigation_controls_reject_unknown_provider_ids() {
        let unknown = provider_home_url("perplexity").unwrap_err();
        let arbitrary_url = provider_home_url("https://chatgpt.com").unwrap_err();

        assert_eq!(unknown.code, "provider_not_allowlisted");
        assert_eq!(arbitrary_url.code, "provider_not_allowlisted");
    }

    #[test]
    fn provider_session_policy_is_persistent_and_provider_scoped() {
        let chatgpt = provider_webview_session_policy("chatgpt").unwrap();
        let gemini = provider_webview_session_policy("gemini").unwrap();

        assert!(!chatgpt.incognito);
        assert!(!gemini.incognito);
        assert_ne!(chatgpt.data_store_identifier, gemini.data_store_identifier);
    }

    #[test]
    fn provider_session_policy_rejects_unknown_provider_ids() {
        let error = provider_webview_session_policy("https://chatgpt.com").unwrap_err();

        assert_eq!(error.code, "provider_not_allowlisted");
    }

    #[test]
    fn provider_navigation_allows_provider_owned_auth_redirects_only() {
        assert!(is_provider_navigation_allowed(
            "gemini",
            &Url::parse("https://accounts.google.com/signin/v2/identifier").unwrap()
        ));
        assert!(is_provider_navigation_allowed(
            "chatgpt",
            &Url::parse("https://auth.openai.com/u/login").unwrap()
        ));
        assert!(!is_provider_navigation_allowed(
            "gemini",
            &Url::parse("https://example.com/auth").unwrap()
        ));
        assert!(!is_provider_navigation_allowed(
            "gemini",
            &Url::parse("http://accounts.google.com/signin").unwrap()
        ));
    }

    #[test]
    fn resize_bounds_reject_unknown_provider_ids() {
        let error = validate_provider_viewport_bounds(
            "perplexity",
            ProviderViewportBounds {
                x: 0.0,
                y: 96.0,
                width: 1200.0,
                height: 720.0,
            },
        )
        .unwrap_err();

        assert_eq!(error.code, "provider_not_allowlisted");
    }

    #[test]
    fn resize_bounds_reject_invalid_geometry() {
        for bounds in [
            ProviderViewportBounds {
                x: -1.0,
                y: 96.0,
                width: 1200.0,
                height: 720.0,
            },
            ProviderViewportBounds {
                x: 0.0,
                y: 96.0,
                width: 0.0,
                height: 720.0,
            },
            ProviderViewportBounds {
                x: 0.0,
                y: 96.0,
                width: 1200.0,
                height: f64::NAN,
            },
            ProviderViewportBounds {
                x: 0.0,
                y: 96.0,
                width: 20_000.0,
                height: 720.0,
            },
        ] {
            let error = validate_provider_viewport_bounds("chatgpt", bounds).unwrap_err();
            assert_eq!(error.code, "provider_in_layout_bounds_invalid");
        }
    }

    #[test]
    fn resize_bounds_accept_valid_provider_id_and_numeric_geometry() {
        let bounds = validate_provider_viewport_bounds(
            "gemini",
            ProviderViewportBounds {
                x: 12.4,
                y: 74.6,
                width: 1372.2,
                height: 822.8,
            },
        )
        .unwrap();

        assert_eq!(
            bounds,
            ProviderViewportBounds {
                x: 12.0,
                y: 75.0,
                width: 1372.0,
                height: 823.0,
            }
        );
    }

    #[test]
    fn resize_bounds_accept_fullscreen_sized_geometry() {
        let bounds = validate_provider_viewport_bounds(
            "chatgpt",
            ProviderViewportBounds {
                x: 72.0,
                y: 64.0,
                width: 3840.0,
                height: 2160.0,
            },
        )
        .unwrap();

        assert_eq!(
            bounds,
            ProviderViewportBounds {
                x: 72.0,
                y: 64.0,
                width: 3840.0,
                height: 2160.0,
            }
        );
    }
}
