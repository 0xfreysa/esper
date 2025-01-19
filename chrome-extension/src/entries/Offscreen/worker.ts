import * as Comlink from 'comlink';
import init, { Prover, verify_attestation } from '@freysa/esper-js';

Comlink.expose({
  init,
  Prover,
  verify_attestation,
});
