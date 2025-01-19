import * as Comlink from 'comlink';
import init, {
  Prover,
  SignedSession,
  verify_attestation,
  verify_attestation_signature,
} from 'tlsn-js';

Comlink.expose({
  init,
  Prover,
  SignedSession,
  verify_attestation,
  verify_attestation_signature,
});
