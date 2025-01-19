//! This module contains the utility functions for logging events to PostHog.

use posthog_rs::Event;
use serde::Serialize;

#[derive(Debug, Serialize)]
/// LogEvent is the event that is logged to PostHog
pub struct LogEvent {
    /// Event type
    pub event_type: String,
    /// The subtype of the event
    pub event_subtype: String,
    /// The unique session_id of the event
    pub session_id: String,
    /// Debug Whether the event is debug
    pub debug: bool,
    /// misc property name, can be anything
    pub misc_property_name: String,
    /// misc property value
    pub misc_property_value: String,
}
/// Log anonymous notarization request
/// Only the session_id and url url_regex of providers are logged
pub async fn log_event(log_event: LogEvent, posthog_key: String) {
    let mut event = Event::new(log_event.event_type, log_event.session_id);
    event
        .insert_prop("subtype", log_event.event_subtype)
        .unwrap();
    event.insert_prop("debug", log_event.debug).unwrap();
    event
        .insert_prop(log_event.misc_property_name, log_event.misc_property_value)
        .unwrap();

    let posthog_key = posthog_key.to_string();

    let _ = tokio::task::spawn_blocking(move || {
        let key_bytes: [u8; 47] = posthog_key
            .as_bytes()
            .try_into()
            .expect("Failed to convert posthog_key to bytes");
        let key_str = std::str::from_utf8(&key_bytes).unwrap();
        let client = posthog_rs::client(key_str);
        client.capture(event)
    })
    .await
    .expect("Failed to capture PostHog event");
}

/// Retrieves the signed code attestation from AWS
/// This attestation is fetched by calling nitriding server from within the TEE
pub async fn get_code_attestation() -> String {
    let nonce = "0000000000000000000000000000000000000000";
    let url = format!(
        "https://notary.freysa.ai/enclave/attestation?nonce={}",
        nonce
    );

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to create reqwest client");

    client
        .get(&url)
        .send()
        .await
        .expect("Failed to get code attestation")
        .text()
        .await
        .expect("Failed to get code attestation")
}
