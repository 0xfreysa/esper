# React Demo for Notarization and Verification of attestations

This webapp allows you to

1) Generate an attestation for a dummy request

2) Verifies the attestation

## 🔴 Todo and bugs

### Notarization

- Only works with local websockify server

### Verification

- Notary pubkey is hardcoded, should be retrieved from the notary URL and converted from PEM to raw bytes ASN1
