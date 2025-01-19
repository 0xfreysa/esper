import React, { ReactElement, useEffect, useState } from 'react';
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { requests } from '../utils/requests';
import { Link } from 'react-router-dom';

import * as Comlink from 'comlink';
import {
  Prover as TProver,
  NotaryServer,
  RemoteAttestation,
  parseSignature,
} from 'tlsn-js';
const { init, verify_attestation, Prover, verify_attestation_signature }: any =
  Comlink.wrap(new Worker(new URL('../utils/worker.ts', import.meta.url)));

const nonce = '0000000000000000000000000000000000000001';
const remote_attestation_encoded =
  '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';
const EXPECTED_PCRS = {
  '1': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '2': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};
const notaryUrl = ''; // Replace with notary URL, eg. 'https://notary.freysa.ai:7047';
const websocketUrl = ''; // Replace with websocket URL, eg. 'http://websockify.freysa.ai:55688';
//const websocketUrl = 'ws://localhost:55688';
//const notaryUrl = 'http://localhost:7047';

const request = requests.swapi;
const { dns, url, method, headers, body } = request;

export function Notarization(): ReactElement {
  const [processingVerification, setProcessingVerification] = useState(false);
  const [processingNotarization, setProcessingNotarization] = useState(false);
  const [notarySignature, setSignature] = useState<string | null>(null);
  const [resultVerify, setResultVerify] = useState<boolean | null>(null);
  const [applicationData, setApplicationData] = useState<null | string>(null);
  const [remoteAttestation, setRemoteAttestation] =
    useState<null | RemoteAttestation>(null);

  const [error, setError] = useState<null | string>(null);
  const [isAttrAttestationValid, setIsAttrAttestationValid] = useState<
    null | boolean
  >(null);

  const verify_attestation_document = async () => {
    setProcessingVerification(true);
    try {
      const resultVerify = await verify_attestation(
        remote_attestation_encoded,
        nonce,
        EXPECTED_PCRS,
        1726606091,
      );
      if (!resultVerify) setError('remote attestation signature is not valid');
      setResultVerify(resultVerify);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessingVerification(false);
    }
  };
  useEffect(() => {
    const initialize = async () => {
      setRemoteAttestation(remoteAttestation);

      await init({ loggingLevel: 'Debug' });
    };

    initialize();
  }, []);

  const notarize = async () => {
    setProcessingNotarization(true);
    const notary = NotaryServer.from(notaryUrl);
    console.time('submit');
    const prover = (await new Prover({
      serverDns: dns,
    })) as TProver;

    await prover.setup(await notary.sessionUrl());
    console.log('setup');
    const resp = await prover.sendRequest(websocketUrl, {
      url,
      method: method as 'GET' | 'POST',
      headers,
      body,
    });

    console.timeEnd('submit');
    console.log(resp);

    const session = await prover.notarize();

    setApplicationData(session.application_data);
    setSignature(session.signature);
    setProcessingNotarization(false);
  };

  //verify signature
  useEffect(() => {
    (async () => {
      if (applicationData && notarySignature) {
        //convert to raw_bytes_hex
        const hex_notary_key =
          '0406fdfa148e1916ccc96b40d0149df05825ef54b16b711ccc1b991a4de1c6a12cc3bba705ab1dee116629146a3a0b410e5207fe98481b92d2eb5e872fe721f32a';

        const signature_hex = parseSignature(notarySignature);
        const isValid = await verify_attestation_signature(
          applicationData,
          signature_hex,
          hex_notary_key,
        );

        setIsAttrAttestationValid(isValid);
        setProcessingVerification(false);
      }
    })();
  }, [applicationData, notarySignature]);

  return (
    <div>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <Link
            to="/verify"
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center"
          >
            Verify manually an Attribute Attestation
          </Link>
        </div>
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-1">
            Notarize data from {dns}
          </div>

          <p className="block mt-1 text-sm leading-tight font-medium text-black">
            Request: {url}
          </p>
          <p className="block mt-1 text-sm leading-tight font-medium text-black">
            Notary: {notaryUrl}
          </p>
          <p className="block mt-1 text-sm leading-tight font-medium text-black">
            Websocket: {websocketUrl}
          </p>

          <div className="mt-2 h-30 overflow-y-auto border border-gray-200 rounded p-4 mb-4">
            <h2 className="text-l font-bold">Notary remote attestation</h2>
            <div>{remote_attestation_encoded}..</div>
          </div>
          {applicationData && (
            <div>
              <h2 className="text-l font-bold">
                attribute attestation for: {dns}{' '}
              </h2>
              <div className="mt-2 h-50 overflow-y-auto border border-gray-200 rounded p-4 mb-4">
                <div>
                  <h2>Application Data Hex</h2>
                  {applicationData}
                </div>

                <div>
                  <h2>signature</h2>
                  {notarySignature}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={verify_attestation_document}
              disabled={processingVerification}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {processingVerification ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Verify Remote Attestation
                </>
              )}
            </button>
            <button
              onClick={notarize}
              disabled={processingNotarization}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {processingNotarization ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Notarizing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Notarize
                </>
              )}
            </button>
          </div>

          {!processingNotarization && isAttrAttestationValid !== null && (
            <div
              className={`mt-4 p-4 rounded-md ${isAttrAttestationValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              <div className="flex items-center">
                {isAttrAttestationValid ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                <span className="font-medium">
                  {isAttrAttestationValid
                    ? 'Attribute attestation is valid'
                    : 'Attribute attestation is invalid'}
                  {!isAttrAttestationValid && <p>Error: {error}</p>}
                </span>
              </div>
            </div>
          )}

          {!processingNotarization && resultVerify !== null && (
            <div
              className={`mt-4 p-4 rounded-md ${resultVerify ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              <div className="flex items-center">
                {resultVerify ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                <span className="font-medium">
                  {resultVerify
                    ? 'Remote attestation is valid'
                    : 'Remote attestation is invalid'}
                  {!resultVerify && <p>Error: {error}</p>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
