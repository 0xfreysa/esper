import initWasm, {
  initThreadPool,
  init_logging,
  LoggingLevel,
  LoggingConfig,
  SignedSession as WasmSignedSession,
  Transcript,
  verify_attestation_document,
  verify_attestation_signature,
  type Commit,
  type Reveal,
  Verifier as WasmVerifier,
  Prover as WasmProver,
  type ProverConfig,
  type Method,
  VerifierConfig,
} from '../wasm/pkg/tlsn_wasm';
import { arrayToHex, expect, headerToMap } from './utils';
import type { ParsedTranscriptData, ProofData } from './types';

import {
  AttestationObject,
  RemoteAttestation,
  Payload,
  Attribute,
  DecodedData,
  NotaryRequest,
  NotaryConfig,
  Provider,
} from './types';
import { SEMAPHORE_IDENTITY_HEADER } from './utils';
let LOGGING_LEVEL: LoggingLevel = 'Info';

function debug(...args: any[]) {
  if (['Debug', 'Trace'].includes(LOGGING_LEVEL)) {
    console.log('tlsn-js DEBUG', ...args);
  }
}

export type {
  AttestationObject,
  RemoteAttestation,
  Payload,
  Attribute,
  DecodedData,
  NotaryRequest,
  NotaryConfig,
  Provider,
};

/**
 * Convert the PEM string represetation of a P256 public key to a hex string of its raw bytes
 * @param pemString - The PEM string to convert
 * @returns The raw hex string
 */
function pemToRawHex(pemString: string) {
  const base64 = pemString
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  return Buffer.from(base64, 'base64').toString('hex').slice(-130);
}

export async function decode_and_verify(
  attestationObject: AttestationObject,
  verify_signature_function: (
    attribute_hex: string,
    signature: string,
    notary_public_key: string,
    hash_appdata: boolean,
  ) => Promise<boolean>,
): Promise<{
  is_valid: boolean;
  hex_notary_key: string;
  decodedAttestation: AttestationObject;
}> {
  const { signature, application_data, attributes } = attestationObject;

  const decodedAttestation: AttestationObject = {
    ...attestationObject,
    application_data_decoded: decodeAppData(attestationObject.application_data),
  };

  const hex_notary_key = await getHexNotaryKey(
    attestationObject.meta?.notaryUrl ?? '',
  );

  if (!application_data) throw new Error('binary_data is null');
  if (!attestationObject.signature) throw new Error('signature is null');

  let is_valid = true;
  if (attributes) {
    for (const attribute of attributes) {
      const isValid_ = await verify_signature_function(
        attribute.attribute_hex ?? '',
        attribute.signature,
        hex_notary_key,
        false,
      );

      if (!isValid_) {
        is_valid = false;
        break;
      }
    }
    return {
      is_valid,
      hex_notary_key,
      decodedAttestation,
    };
  } else {
    try {
      is_valid = await verify_signature_function(
        application_data!,
        signature!,
        hex_notary_key,
        true,
      );
    } catch (e) {
      is_valid = false;
    }
  }
  return {
    is_valid,
    hex_notary_key,
    decodedAttestation,
  };
}

export async function getHexNotaryKey(notaryUrl: string) {
  const notary = NotaryServer.from(notaryUrl);
  return pemToRawHex(await notary.publicKey());
}

/**
 * Decode the signed  bytes tls data which contains request and response
 * @returns {string} The generated nonce.
 */
export function decodeAppData(hexString: string) {
  hexString = hexString.replace(/\s/g, '');

  let decodedString = '';
  for (let i = 0; i < hexString.length; i += 2) {
    decodedString += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
  }

  const [request, response_header, response_body] =
    decodedString.split('\r\n\r\n');

  let request_url = '';
  let hostname = '';
  let semaphore_identity_commitment = '';
  const lines = request.split('\r');
  try {
    request_url = lines.filter(
      (line: string) => line.startsWith('GET') || line.startsWith('POST'),
    )[0];

    const requestUrlParts = request_url.split(' ');
    if (requestUrlParts.length >= 2) {
      request_url = requestUrlParts.slice(0, -1).join(' ').trim();
    }
    request_url = request_url.replace('GET', '').replace('POST', '').trim();
  } catch (e) {
    console.log('decodeAppData: error', e);
  }
  try {
    semaphore_identity_commitment = lines.filter((line: string) =>
      line.includes(SEMAPHORE_IDENTITY_HEADER),
    )[0];

    if (semaphore_identity_commitment) {
      semaphore_identity_commitment = semaphore_identity_commitment
        .split(':')[1]
        .trim();
    }
  } catch (e) {
    console.log('decodeAppData: error', e);
  }

  try {
    const hostnameMatch = request_url.match(
      /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im,
    );
    hostname = hostnameMatch ? hostnameMatch[1] : '';
  } catch (e) {
    console.log('decodeAppData: error', e);
  }

  // Add hostname to the return object
  return {
    hostname: hostname ?? '',
    request_url,
    request,
    response_header,
    response_body,
    semaphore_identity_commitment,
  };
}

/**
 * It generates a random nonce of length 40 using hexadecimal characters.
 * This nonce is used to ensure the uniqueness of the attestation.
 * @returns {string} The generated nonce.
 */

export function generateNonce() {
  return Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

export { verify_attestation_signature };

export function parseSignature(input: string) {
  const regex = /\(([\dA-Fa-f]+)\)/;

  const match = input.match(regex);

  return match && match[1] ? match[1] : null;
}
export async function verify_attestation(
  remote_attestation_base64: string,
  nonce: string,
  pcrs: string[],
  timestamp: number = Math.floor(Date.now() / 1000),
) {
  return await verify_attestation_document(
    remote_attestation_base64,
    nonce,
    pcrs,
    BigInt(timestamp),
  );
}

export default async function init(config?: {
  loggingLevel?: LoggingLevel;
  hardwareConcurrency?: number;
}) {
  const {
    loggingLevel = 'Info',
    hardwareConcurrency = navigator.hardwareConcurrency,
  } = config || {};

  LOGGING_LEVEL = loggingLevel;

  const res = await initWasm();

  init_logging({
    level: loggingLevel,
    crate_filters: undefined,
    span_events: undefined,
  });

  // 6422528 ~= 6.12 mb
  debug('res.memory=', res.memory);
  debug('res.memory.buffer.length=', res.memory.buffer.byteLength);
  debug('DEBUG', 'initialize thread pool');

  await initThreadPool(hardwareConcurrency);
  debug('initialized thread pool');

  return true;
}

export class Prover {
  #prover: WasmProver;
  #config: ProverConfig;

  static async notarize(options: {
    url: string;
    notaryUrl: string;
    websocketProxyUrl: string;
    method?: Method;
    headers?: {
      [name: string]: string;
    };
    body?: any;
    maxSentData?: number;
    maxRecvData?: number;
    id: string;
    commit?: Commit;
  }) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      maxSentData,
      maxRecvData,
      notaryUrl,
      websocketProxyUrl,
      id,
    } = options;
    const hostname = new URL(url).hostname;
    const notary = NotaryServer.from(notaryUrl);
    const prover = new WasmProver({
      id,
      server_dns: hostname,
      max_sent_data: maxSentData,
      max_recv_data: maxRecvData,
    });

    await prover.setup(await notary.sessionUrl(maxSentData, maxRecvData));

    await prover.send_request(websocketProxyUrl + `?token=${hostname}`, {
      uri: url,
      method,
      headers: headerToMap(headers),
      body,
    });
    const notarized = await prover.notarize();

    return notarized;
  }

  constructor(config: {
    id?: string;
    serverDns: string;
    maxSentData?: number;
    maxRecvData?: number;
  }) {
    this.#config = {
      id: config.id || String(Date.now()),
      server_dns: config.serverDns,
      max_recv_data: config.maxRecvData,
      max_sent_data: config.maxSentData,
    };
    this.#prover = new WasmProver(this.#config);
  }

  get id() {
    return this.#config.id;
  }

  async free() {
    return this.#prover.free();
  }

  async setup(verifierUrl: string): Promise<void> {
    return this.#prover.setup(verifierUrl);
  }

  async sendRequest(
    wsProxyUrl: string,
    request: {
      url: string;
      method?: Method;
      headers?: { [key: string]: string };
      body?: any;
    },
    semaphoreIdentity?: string,
  ): Promise<{
    status: number;
    headers: { [key: string]: string };
    body?: string;
  }> {
    const { url, method = 'GET', headers = {}, body } = request;
    const hostname = new URL(url).hostname;
    const headerMap = headerToMap({
      [SEMAPHORE_IDENTITY_HEADER]: semaphoreIdentity ?? '',
      Host: hostname,
      Connection: 'close',
      ...headers,
    });

    const resp = await this.#prover.send_request(wsProxyUrl, {
      uri: url,
      method,
      headers: headerMap,
      body,
    });
    debug('prover.sendRequest', resp);

    return {
      status: resp.status,
      headers: resp.headers.reduce(
        (acc: { [key: string]: string }, [name, arr]) => {
          acc[name] = Buffer.from(arr).toString();
          return acc;
        },
        {},
      ),
      body: resp.body,
    };
  }

  async notarize(): Promise<AttestationObject> {
    const signedSessionString = await this.#prover.notarize();

    const signedSession = JSON.parse(signedSessionString);

    signedSession.attributes = signedSession.attributes.map(
      (attributes: string) => JSON.parse(attributes),
    );

    //console.log('signedSession', signedSession);

    return signedSession;
  }
}

export class Verifier {
  #config: VerifierConfig;
  #verifier: WasmVerifier;

  constructor(config: VerifierConfig) {
    this.#config = config;
    this.#verifier = new WasmVerifier(this.#config);
  }

  get id() {
    return this.#config.id;
  }

  async connect(proverUrl: string): Promise<void> {
    return this.#verifier.connect(proverUrl);
  }
}

export class SignedSession {
  #session: WasmSignedSession;

  constructor(serializedSessionHex: string) {
    this.#session = WasmSignedSession.deserialize(
      new Uint8Array(Buffer.from(serializedSessionHex, 'hex')),
    );
  }

  async free() {
    return this.#session.free();
  }

  async serialize() {
    return arrayToHex(this.#session.serialize());
  }
}

export class NotaryServer {
  #url: string;

  static from(url: string) {
    return new NotaryServer(url);
  }

  constructor(url: string) {
    this.#url = url;
  }

  get url() {
    return this.#url;
  }

  async publicKey(): Promise<string> {
    const res = await fetch(this.#url + '/info');
    const { publicKey } = await res.json();
    expect(
      typeof publicKey === 'string' && !!publicKey.length,
      'invalid public key',
    );
    return publicKey!;
  }

  async sessionUrl(
    maxSentData?: number,
    maxRecvData?: number,
  ): Promise<string> {
    const resp = await fetch(`${this.#url}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientType: 'Websocket',
        maxRecvData,
        maxSentData,
      }),
    });
    const { sessionId } = await resp.json();
    expect(
      typeof sessionId === 'string' && !!sessionId.length,
      'invalid session id',
    );
    const url = new URL(this.#url);
    const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
    const pathname = url.pathname;
    return `${protocol}://${url.host}${pathname === '/' ? '' : pathname}/notarize?sessionId=${sessionId!}`;
  }
}

export {
  type ParsedTranscriptData,
  type ProofData,
  type LoggingLevel,
  type LoggingConfig,
  type Transcript,
  type Commit,
  type Reveal,
  type ProverConfig,
};
