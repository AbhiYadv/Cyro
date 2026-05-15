use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeMode {
    Fast,
    Thinking,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeRoute {
    LocalMock,
    LocalSidecar,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum RuntimeState {
    NotConfigured,
    SidecarReady,
    ModelValid,
    Ready,
    Generating,
    Error,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    Completed,
    MockFallback,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPromptResponse {
    pub response: String,
    pub model_id: Option<String>,
    pub mode: RuntimeMode,
    pub route: RuntimeRoute,
    pub elapsed_ms: u64,
    pub finish_reason: FinishReason,
    pub mocked: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
    pub user_action: String,
    pub debug_detail_safe: Option<String>,
}

impl RuntimeError {
    pub fn recoverable(
        code: &str,
        message: &str,
        user_action: &str,
        debug_detail_safe: Option<String>,
    ) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            recoverable: true,
            user_action: user_action.to_string(),
            debug_detail_safe,
        }
    }
}

pub fn mocked_local_prompt_response(mode: RuntimeMode) -> LocalPromptResponse {
    LocalPromptResponse {
        response: "Local inference is not connected yet. This is the Sprint 0 mocked response."
            .to_string(),
        model_id: None,
        mode,
        route: RuntimeRoute::LocalMock,
        elapsed_ms: 0,
        finish_reason: FinishReason::MockFallback,
        mocked: true,
    }
}
