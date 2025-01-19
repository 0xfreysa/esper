import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { download, urlify, bigintToHex } from '../../utils/misc';
import { useRequestHistory } from '../../reducers/history';
import { CheckCircle, X } from 'lucide-react';
import { IdentityManager, useIdentity } from '../../reducers/identity';
import { MOTIVATION_URL, VERIFIER_APP_URL } from '../../utils/constants';
import { AttestationObject, decodeAppData, Attribute } from '@freysa/esper-js';
import { AttestationDetailsCard } from '../../components/AttestationDetailsCard';
export default function AttestationDetails() {
  const [identity] = useIdentity();
  const params = useParams<{ host: string; requestId: string }>();

  const request = useRequestHistory(params.requestId);
  const requestUrl = urlify(request?.url || '');

  const [attributeAttestation, setAttributeAttestation] =
    useState<AttestationObject>();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [sessionData, setSessionData] = useState<string>('');
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  useEffect(() => {
    const AttributeAttestation = request?.proof;

    if (!AttributeAttestation) return;

    const { attributes } = AttributeAttestation;
    if (attributes) setAttributes(attributes);

    const decodedAppData = decodeAppData(AttributeAttestation.application_data);

    AttributeAttestation.application_data_decoded = decodedAppData;

    setAttributeAttestation(AttributeAttestation);
    setSessionData(decodedAppData?.response_body || '');
  }, [request]);

  const copyAttestation = () => {
    const text = JSON.stringify(request?.proof);
    navigator.clipboard.writeText(text);
    setShowCopyDialog(true);
  };

  const downloadAttestation = () => {
    if (!request) return;
    download(request.id, JSON.stringify(request.proof));
  };

  const copyAndVerify = async () => {
    const text = JSON.stringify(request?.proof);
    navigator.clipboard.writeText(text);
    setShowVerifyDialog(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    window.open(VERIFIER_APP_URL, '_blank');
  };
  const identityManager = new IdentityManager();
  if (!attributeAttestation) return <>ahi</>;
  return (
    <div className="flex flex-col gap-4 py-4 overflow-y-auto flex-1 bg-mainDark">
      {showCopyDialog && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg z-50">
            <div className="flex items-center flex-col">
              <div className="flex items-center gap-2">
                <X
                  className="w-5 h-5 absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCopyDialog(false)}
                />
              </div>

              <div className="flex items-center gap-2 mt-2 mb-2 mx-8">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-800 text-base whitespace-nowrap">
                  Copied to clipboard
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      {showVerifyDialog && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center flex-col">
              <div className="flex items-center gap-2">
                <X
                  className="w-5 h-5 absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-700"
                  onClick={() => setShowVerifyDialog(false)}
                />
              </div>

              <div className="flex items-center gap-1 mt-2 mx-8">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-800 text-base whitespace-nowrap">
                  Copied to clipboard
                </span>
              </div>

              <div className="flex items-center mt-2 text-center text-sm text-textGray">
                You are being redirected to the <br /> verifier app...
              </div>
            </div>
          </div>
        </>
      )}
      <div className="flex flex-col flex-nowrap justify-center gap-4 mx-4">
        <div className="p-4 bg-providerTile rounded-xl flex flex-col shadow-sm">
          <div className="flex flex-row items-center">
            <div className="flex-1 font-bold text-text text-lg truncate">
              Your public key
            </div>
          </div>
          <div className="text-base mt-4 text-text break-all">
            {identity && identityManager.getShortenedPublicKey(identity)}
          </div>
          <div className="text-sm text-text mt-4">
            Every attestation you create will be associated with your public
            cryptographic key.&nbsp;
            <span
              className="text-textGray cursor-pointer underline"
              onClick={() => {
                chrome.tabs.create({
                  url: MOTIVATION_URL,
                });
              }}
            >
              Learn more
            </span>
          </div>
        </div>

        <AttestationDetailsCard
          requestId={params.requestId ?? ''}
          onCopy={copyAttestation}
          onDownload={downloadAttestation}
          onVerify={copyAndVerify}
          attributeAttestation={attributeAttestation}
        />
      </div>
    </div>
  );
}
