use crate::{config::NotarizationProperties, domain::auth::AuthorizationWhitelistRecord};
use p256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tlsn_verifier::provider::Processor;

/// Response object of the /session API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotarizationSessionResponse {
    /// Unique session id that is generated by notary and shared to prover
    pub session_id: String,
}

/// Request object of the /session API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotarizationSessionRequest {
    pub client_type: ClientType,
    /// Maximum data that can be sent by the prover
    pub max_sent_data: Option<usize>,
    /// Maximum data that can be received by the prover
    pub max_recv_data: Option<usize>,
}

/// Request query of the /notarize API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotarizationRequestQuery {
    /// Session id that is returned from /session API
    pub session_id: String,
}

/// Types of client that the prover is using
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ClientType {
    /// Client that has access to the transport layer
    Tcp,
    /// Client that cannot directly access transport layer, e.g. browser extension
    Websocket,
}

/// Session configuration data to be stored in temporary storage
#[derive(Clone, Debug)]
pub struct SessionData {
    pub max_sent_data: Option<usize>,
    pub max_recv_data: Option<usize>,
}

/// Global data that needs to be shared with the axum handlers
#[derive(Clone, Debug)]
pub struct NotaryGlobals {
    pub notary_signing_key: SigningKey,
    pub notarization_config: NotarizationProperties,
    /// A temporary storage to store configuration data, mainly used for WebSocket client
    pub store: Arc<Mutex<HashMap<String, SessionData>>>,
    /// Whitelist of API keys for authorization purpose
    pub authorization_whitelist: Option<Arc<Mutex<HashMap<String, AuthorizationWhitelistRecord>>>>,
    /// Providers to be used for attribute extraction
    pub provider_processor: Processor,
    /// Posthog client
    pub posthog_key: String,
}

impl NotaryGlobals {
    pub fn new(
        notary_signing_key: SigningKey,
        notarization_config: NotarizationProperties,
        authorization_whitelist: Option<Arc<Mutex<HashMap<String, AuthorizationWhitelistRecord>>>>,
        provider_processor: Processor,
        posthog_key: String,
    ) -> Self {
        Self {
            notary_signing_key,
            notarization_config,
            store: Default::default(),
            authorization_whitelist,
            provider_processor,
            posthog_key,
        }
    }
}
