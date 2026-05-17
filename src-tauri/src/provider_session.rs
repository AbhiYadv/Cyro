use serde::Serialize;

use crate::runtime_types::RuntimeError;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSessionDescriptor {
    pub provider_id: String,
    pub display_name: &'static str,
    pub origin: &'static str,
    pub provider_owned_label: &'static str,
    pub fallback_allowed: bool,
    pub blocked_message: &'static str,
}

#[tauri::command]
pub fn get_provider_session(
    provider_id: String,
) -> Result<ProviderSessionDescriptor, RuntimeError> {
    resolve_provider_session(&provider_id)
}

pub fn resolve_provider_session(
    provider_id: &str,
) -> Result<ProviderSessionDescriptor, RuntimeError> {
    match provider_id {
        "chatgpt" => Ok(provider_descriptor(
            "chatgpt",
            "ChatGPT",
            "https://chatgpt.com",
        )),
        "claude" => Ok(provider_descriptor("claude", "Claude", "https://claude.ai")),
        "gemini" => Ok(provider_descriptor(
            "gemini",
            "Gemini",
            "https://gemini.google.com",
        )),
        _ => Err(RuntimeError::recoverable(
            "provider_not_allowlisted",
            "This provider route is not allowlisted.",
            "Choose Local, ChatGPT, Claude, or Gemini.",
            Some(format!("providerId={provider_id}")),
        )),
    }
}

fn provider_descriptor(
    provider_id: &str,
    display_name: &'static str,
    origin: &'static str,
) -> ProviderSessionDescriptor {
    ProviderSessionDescriptor {
        provider_id: provider_id.to_string(),
        display_name,
        origin,
        provider_owned_label: "Provider-owned content. Cyro does not read provider DOM, responses, cookies, tokens, or credentials.",
        fallback_allowed: true,
        blocked_message: "If this provider refuses to load inside Cyro, use the explicit fallback link. Do not bypass provider protections.",
    }
}

#[cfg(test)]
mod tests {
    use super::resolve_provider_session;

    #[test]
    fn resolves_only_allowlisted_provider_origins() {
        let chatgpt = resolve_provider_session("chatgpt").unwrap();
        let claude = resolve_provider_session("claude").unwrap();
        let gemini = resolve_provider_session("gemini").unwrap();

        assert_eq!(chatgpt.origin, "https://chatgpt.com");
        assert_eq!(claude.origin, "https://claude.ai");
        assert_eq!(gemini.origin, "https://gemini.google.com");
    }

    #[test]
    fn rejects_unknown_provider_ids_and_arbitrary_urls() {
        let unknown = resolve_provider_session("perplexity").unwrap_err();
        let arbitrary_url = resolve_provider_session("https://chatgpt.com").unwrap_err();

        assert_eq!(unknown.code, "provider_not_allowlisted");
        assert_eq!(arbitrary_url.code, "provider_not_allowlisted");
    }
}
