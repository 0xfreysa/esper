import * as Comlink from 'comlink';
import init, { Prover, NotarizedSession, TlsProof } from '../src/lib';

Comlink.expose({
  init,
  Prover,
  NotarizedSession,
  TlsProof,
});
