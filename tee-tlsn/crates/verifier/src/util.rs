//! This module contains the utility functions for logging events to PostHog.

use posthog_rs::Event;
use serde::Serialize;

use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};

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

    // Handle property insertion errors gracefully
    if let Err(e) = event.insert_prop("subtype", log_event.event_subtype) {
        eprintln!(
            "Warning: Failed to insert subtype property for PostHog event: {}",
            e
        );
        return;
    }

    if let Err(e) = event.insert_prop("debug", log_event.debug) {
        eprintln!(
            "Warning: Failed to insert debug property for PostHog event: {}",
            e
        );
        return;
    }

    if let Err(e) = event.insert_prop(log_event.misc_property_name, log_event.misc_property_value) {
        eprintln!(
            "Warning: Failed to insert misc property for PostHog event: {}",
            e
        );
        return;
    }

    let posthog_key = posthog_key.to_string();

    match tokio::task::spawn_blocking(move || {
        // Handle PostHog key validation gracefully
        if posthog_key.is_empty() {
            return Err("PostHog key is empty".to_string());
        }

        // Don't assume the key is exactly 47 bytes - use it as is
        let client = posthog_rs::client(posthog_key.as_str());
        client.capture(event).map_err(|e| e.to_string())
    })
    .await
    {
        Ok(Ok(())) => {
            // Successfully captured event
        }
        Ok(Err(e)) => {
            eprintln!("Warning: Failed to capture PostHog event: {}", e);
        }
        Err(e) => {
            eprintln!("Warning: PostHog task failed: {}", e);
        }
    }
}

/// Retrieves the signed code attestation from AWS
/// This attestation is fetched by calling nitriding server from within the TEE
pub async fn get_code_attestation(nonce: String) -> String {
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

/// This is used to verify a p256 signature
pub async fn verify_signature(
    hex_raw_signature: String,
    hex_raw_public_key: String,
    hex_application_data: String,
) -> bool {
    println!("hex_raw_public_key: {:?}", hex_raw_public_key);
    let bytes_public_key = hex::decode(hex_raw_public_key).expect("decode public key failed");

    println!("bytes_public_key: {:?}", bytes_public_key);
    let verifying_key = match VerifyingKey::from_sec1_bytes(bytes_public_key.as_slice()) {
        Ok(verifying_key) => verifying_key,
        Err(e) => {
            println!("decode P256 public key failed: {:?}", e);
            return false;
        }
    };

    //signature
    let signature_bytes = hex::decode(hex_raw_signature).expect("decode signature failed");
    println!("signature_bytes: {:?}", signature_bytes);

    let signature = match Signature::from_slice(&signature_bytes) {
        Ok(signature) => signature,
        Err(e) => {
            println!("decode signature failed: {:?}", e);
            return false;
        }
    };

    //message
    let application_data = match hex::decode(hex_application_data) {
        Ok(data) => data,
        Err(e) => {
            println!("decode hex app data failed: {:?}", e);
            return false;
        }
    };

    verifying_key.verify(&application_data, &signature).is_ok()
}
