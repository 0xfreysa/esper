import {
  AttestationObject,
  NotaryRequest,
  Prover,
  NotaryConfig,
  Provider,
} from '@freysa/esper-js';
export type Proof = ProofV0 | AttestationObject;

export type ProofV0 = {
  version?: undefined;
  session: any;
  substrings: any;
  notaryUrl: string;
};

export type { NotaryRequest, Provider, NotaryConfig, Prover };
