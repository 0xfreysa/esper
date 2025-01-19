//! This module handles the notarization phase of the verifier.
//!
//! The TLS verifier is only a notary.

use crate::provider::Processor;
use crate::util::{log_event, LogEvent};
use std::collections::HashMap;

use super::{state::Notarize, Verifier, VerifierError};
use httparse::{Request, Response, Status};
use serio::SinkExt;
use signature::Signer;
use tlsn_core::{msg::SignedSession, Signature};

use sha2::{Digest, Sha256};
use tracing::{debug, info, instrument};
use zeroize::Zeroize;

use lazy_static::lazy_static;

use prometheus::{register_histogram, Histogram};

lazy_static! {
    static ref FINALIZATION_HISTOGRAM: Histogram = register_histogram!(
        "finalization_duration_seconds",
        "The duration of finalization in seconds"
    )
    .unwrap();
}

impl Verifier<Notarize> {
    /// Notarizes the TLS session.
    ///
    /// # Arguments
    ///
    /// * `signer` - The signer used to sign the notarization result.
    #[instrument(parent = &self.span, level = "debug", skip_all, err, err(Debug))]
    pub async fn finalize<T>(
        self,
        signer: &impl Signer<T>,
        provider: &Processor,
        session_id: String,
        posthog_key: String,
    ) -> Result<SignedSession, VerifierError>
    where
        T: Into<Signature>,
    {
        debug!("starting finalization");
        let timer = FINALIZATION_HISTOGRAM.start_timer();
        let Notarize {
            mut io,
            mux_ctrl,
            mut mux_fut,
            mut response_data,
            mut request_data,
            ..
        } = self.state;

        let mut request_headers = [httparse::EMPTY_HEADER; 64];
        let mut request = Request::new(&mut request_headers);
        let request_data_mut = request_data.to_owned();
        let req_bytes = request_data_mut.as_bytes();
        let _req_result = request.parse(&req_bytes).unwrap();

        let mut response_headers = [httparse::EMPTY_HEADER; 64];
        let mut response = Response::new(&mut response_headers);
        let response_data_mut = response_data.to_owned();
        let resp_bytes = response_data_mut.as_bytes();
        let resp_size = match response.parse(resp_bytes).unwrap() {
            Status::Complete(size) => {
                info!("response parsed");
                size
            }
            Status::Partial => {
                info!("response partial");
                0
            }
        };
        let body = String::from_utf8_lossy(&resp_bytes[resp_size..]).to_string();
        let mut attestations: HashMap<String, Signature> = HashMap::new();

        #[cfg(not(target_arch = "wasm32"))]
        match request.path {
            Some(path) => {
                info!("request path: {:?}", path);
                let provider_ = provider
                    .find_provider(path, request.method.expect("method not found"))
                    .expect("provider not found");
                info!("provider: {:?}", provider_.url_regex);

                log_event(
                    LogEvent {
                        event_type: "new_attestation".to_string(),
                        event_subtype: "processing_provider".to_string(),
                        session_id: session_id.to_string(),
                        debug: false,
                        misc_property_name: "website_url_regex".to_string(),
                        misc_property_value: provider_.url_regex.to_string(),
                    },
                    posthog_key.to_string(),
                )
                .await;

                let attributes = match provider.process(
                    path,
                    request.method.expect("method not found"),
                    &body,
                ) {
                    Ok(attributes) => attributes,
                    Err(e) => {
                        return Err(VerifierError::ProviderError(e));
                    }
                };
                for attribute in attributes {
                    let signature = signer.sign(attribute.as_bytes());
                    attestations.insert(attribute, signature.into());
                }
            }
            None => {
                info!("request path not found");
            }
        }

        let session_header = mux_fut
            .poll_with(async {
                let mut data = Vec::new();
                data.extend_from_slice(req_bytes);
                data.extend_from_slice(resp_bytes);
                let mut hasher = Sha256::new();
                hasher.update(&data);
                let hash = hasher.finalize();
                let signature = signer.sign(&hash);
                info!("signing session");
                let signed_session = SignedSession {
                    application_signed_data: hex::encode(hash),
                    signature: signature.into(),
                    attestations,
                    application_data: hex::encode(data),
                };
                info!("sending signed session");

                io.send(signed_session.clone()).await?;
                info!(
                    "sent signed session {:?}",
                    signed_session.attestations.keys()
                );
                info!("signed session hash: {:?}", signed_session.application_data);

                // Finalize all TEE before signing the session header.
                Ok::<_, VerifierError>(signed_session)
            })
            .await?;

        request_data.zeroize();
        response_data.zeroize();
        drop(response);
        drop(request);

        if !mux_fut.is_complete() {
            mux_ctrl.mux().close();
            mux_fut.await?;
        }

        timer.stop_and_record();
        debug!("finalization complete");

        Ok(session_header)
    }
}
