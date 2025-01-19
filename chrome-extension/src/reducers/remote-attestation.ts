import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CODE_ATTESTATION,
  NOTARY_API,
  NOTARY_API_LOCAL,
} from '../utils/constants';
import { RemoteAttestation, generateNonce } from '@freysa/esper-js';
import { OffscreenActionTypes } from '../entries/Offscreen/types';
import { getNotaryConfig } from '../utils/misc';

export const useRemoteAttestation = () => {
  const [remoteAttestation, setRemoteAttestation] =
    useState<RemoteAttestation | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expectedPcrs, setExpectedPcrs] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const config = await getNotaryConfig();
      setExpectedPcrs(config.EXPECTED_PCRS);
    })();
  }, []);

  useEffect(() => {
    (() => {
      chrome.runtime.onMessage.addListener(
        async (request, sender, sendResponse) => {
          switch (request.type) {
            case OffscreenActionTypes.remote_attestation_verification_response: {
              const result = request.data;
              setIsValid(result);
            }
          }
        },
      );
    })();
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!expectedPcrs) {
          return;
        }
        //const nonce = generateNonce();
        const nonce = '0000000000000000000000000000000000000000';
        const enclaveEndpoint = `${NOTARY_API}/code_attestation`;

        const response = await axios.get(enclaveEndpoint);
        const remoteAttbase64 = response.data;

        chrome.runtime.sendMessage({
          type: OffscreenActionTypes.remote_attestation_verification,
          data: {
            remoteAttestation: remoteAttbase64.trim(),
            nonce,
            pcrs: expectedPcrs,
          },
        });
      } catch (error) {
        console.log('error fetching code attestation from enclave', error);
        setError(error as any);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [expectedPcrs]);

  return { remoteAttestation, loading, error, isValid };
};
