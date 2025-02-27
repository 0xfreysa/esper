//! Contains message types for communication between leader and follower

use serde::{Deserialize, Serialize};

use crate::{
    error::Kind,
    follower::{
        ComputeClientKey, ComputeClientRandom, Decrypt, Encrypt, GetClientFinishedVd,
        ServerFinishedVd, SetCipherSuite, SetProtocolVersion, SetServerCertDetails,
        SetServerKeyShare, SetServerKxDetails, SetServerRandom, ServerClosed, AttestationDoc,
    },
    leader::{
        BackendMsgBufferIncoming, BackendMsgBufferLen, BackendMsgDecrypt, BackendMsgEncrypt,
        BackendMsgGetClientFinishedVd, BackendMsgGetClientKeyShare, BackendMsgGetClientRandom,
        BackendMsgGetNotify, BackendMsgGetServerFinishedVd, BackendMsgGetSuite,
        BackendMsgNextIncoming, BackendMsgPrepareEncryption, BackendMsgServerClosed,
        BackendMsgSetCipherSuite, BackendMsgSetDecrypt, BackendMsgSetEncrypt,
        BackendMsgSetHsHashClientKeyExchange, BackendMsgSetHsHashServerHello,
        BackendMsgSetProtocolVersion, BackendMsgSetServerCertDetails, BackendMsgSetServerKeyShare,
        BackendMsgSetServerKxDetails, BackendMsgSetServerRandom,
    },
    TeeTlsError,
};

/// TEE-TLS protocol message.
#[allow(missing_docs)]
#[derive(Debug, Serialize, Deserialize)]
pub enum TeeTlsMessage {
    AttestationDoc(AttestationDoc),
    ServerClosed(ServerClosed),
    ServerFinishedVd(ServerFinishedVd),
    CloseConnection(CloseConnection),
    ComputeClientKey(ComputeClientKey),
    ComputeClientRandom(ComputeClientRandom),
    SetProtocolVersion(SetProtocolVersion),
    SetCipherSuite(SetCipherSuite),
    SetServerRandom(SetServerRandom),
    SetServerCertDetails(SetServerCertDetails),
    SetServerKxDetails(SetServerKxDetails),
    SetServerKeyShare(SetServerKeyShare),
    GetClientFinishedVd(GetClientFinishedVd),
    Encrypt(Encrypt),
    Decrypt(Decrypt),
}

impl TryFrom<TeeTlsMessage> for TeeTlsFollowerMsg {
    type Error = TeeTlsError;

    fn try_from(msg: TeeTlsMessage) -> Result<Self, Self::Error> {
        #[allow(unreachable_patterns)]
        match msg {
            TeeTlsMessage::AttestationDoc(msg) => Ok(Self::AttestationDoc(msg)),
            TeeTlsMessage::ServerClosed(msg) => Ok(Self::ServerClosed(msg)),
            TeeTlsMessage::ServerFinishedVd(msg) => Ok(Self::ServerFinishedVd(msg)),
            TeeTlsMessage::Decrypt(msg) => Ok(Self::Decrypt(msg)),
            TeeTlsMessage::Encrypt(msg) => Ok(Self::Encrypt(msg)),
            TeeTlsMessage::GetClientFinishedVd(msg) => Ok(Self::GetClientFinishedVd(msg)),
            TeeTlsMessage::SetServerKeyShare(msg) => Ok(Self::SetServerKeyShare(msg)),
            TeeTlsMessage::SetServerKxDetails(msg) => Ok(Self::SetServerKxDetails(msg)),
            TeeTlsMessage::SetServerCertDetails(msg) => Ok(Self::SetServerCertDetails(msg)),
            TeeTlsMessage::SetServerRandom(msg) => Ok(Self::SetServerRandom(msg)),
            TeeTlsMessage::SetCipherSuite(msg) => Ok(Self::SetCipherSuite(msg)),
            TeeTlsMessage::SetProtocolVersion(msg) => Ok(Self::SetProtocolVersion(msg)),
            TeeTlsMessage::ComputeClientRandom(msg) => Ok(Self::ComputeClientRandom(msg)),
            TeeTlsMessage::ComputeClientKey(msg) => Ok(Self::ComputeClientKey(msg)),

            TeeTlsMessage::CloseConnection(msg) => Ok(Self::CloseConnection(msg)),
            msg => Err(TeeTlsError::new(
                Kind::PeerMisbehaved,
                format!("peer sent unexpected message: {:?}", msg),
            )),
        }
    }
}

#[derive(ludi::Wrap)]
#[allow(missing_docs)]
#[ludi(return_attrs(allow(missing_docs)))]
pub enum TeeTlsLeaderMsg {
    BackendMsgSetProtocolVersion(BackendMsgSetProtocolVersion),
    BackendMsgSetCipherSuite(BackendMsgSetCipherSuite),
    BackendMsgGetSuite(BackendMsgGetSuite),
    BackendMsgSetEncrypt(BackendMsgSetEncrypt),
    BackendMsgSetDecrypt(BackendMsgSetDecrypt),
    BackendMsgGetClientRandom(BackendMsgGetClientRandom),
    BackendMsgGetClientKeyShare(BackendMsgGetClientKeyShare),
    BackendMsgSetServerRandom(BackendMsgSetServerRandom),
    BackendMsgSetServerKeyShare(BackendMsgSetServerKeyShare),
    BackendMsgSetServerCertDetails(BackendMsgSetServerCertDetails),
    BackendMsgSetServerKxDetails(BackendMsgSetServerKxDetails),
    BackendMsgSetHsHashClientKeyExchange(BackendMsgSetHsHashClientKeyExchange),
    BackendMsgSetHsHashServerHello(BackendMsgSetHsHashServerHello),
    BackendMsgGetServerFinishedVd(BackendMsgGetServerFinishedVd),
    BackendMsgGetClientFinishedVd(BackendMsgGetClientFinishedVd),
    BackendMsgPrepareEncryption(BackendMsgPrepareEncryption),
    BackendMsgEncrypt(BackendMsgEncrypt),
    BackendMsgDecrypt(BackendMsgDecrypt),
    BackendMsgNextIncoming(BackendMsgNextIncoming),
    BackendMsgBufferIncoming(BackendMsgBufferIncoming),
    BackendMsgGetNotify(BackendMsgGetNotify),
    BackendMsgBufferLen(BackendMsgBufferLen),
    BackendMsgServerClosed(BackendMsgServerClosed),
    CloseConnection(CloseConnection),
    Finalize(Commit),
}

#[derive(ludi::Wrap)]
#[allow(missing_docs)]
#[ludi(return_attrs(allow(missing_docs)))]
pub enum TeeTlsFollowerMsg {
    AttestationDoc(AttestationDoc),
    ServerClosed(ServerClosed),
    ServerFinishedVd(ServerFinishedVd),
    Decrypt(Decrypt),
    Encrypt(Encrypt),
    GetClientFinishedVd(GetClientFinishedVd),
    SetServerKeyShare(SetServerKeyShare),
    SetServerKxDetails(SetServerKxDetails),
    SetServerCertDetails(SetServerCertDetails),
    SetServerRandom(SetServerRandom),
    SetCipherSuite(SetCipherSuite),
    SetProtocolVersion(SetProtocolVersion),
    ComputeClientRandom(ComputeClientRandom),
    ComputeClientKey(ComputeClientKey),

    CloseConnection(CloseConnection),
    Finalize(Commit),
}

/// Message to close the connection
#[derive(Debug, ludi::Message, Serialize, Deserialize)]
#[ludi(return_ty = "Result<(), TeeTlsError>")]
pub struct CloseConnection;

/// Message to finalize the TEE-TLS protocol
#[derive(Debug, ludi::Message, Serialize, Deserialize)]
#[ludi(return_ty = "Result<(), TeeTlsError>")]
pub struct Commit;
