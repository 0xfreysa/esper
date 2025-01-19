import React, { ReactElement, useEffect, useState } from 'react';
import * as Comlink from 'comlink';
import {
  AttestationObject,
  decode_and_verify,
  Attribute,
  DecodedData,
} from 'tlsn-js';
import { CheckCircle, XCircle } from 'lucide-react';

import { CheckCircle2 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './shadcn';

const worker = Comlink.wrap(
  new Worker(new URL('../utils/worker.ts', import.meta.url)),
);

const { init, verify_attestation_signature }: any = worker;

export function VerifyAttributeAttestation(): ReactElement {
  useEffect(() => {
    const initialize = async () => {
      await init({ loggingLevel: 'Debug' });
    };

    initialize();
  }, []);

  const [isAttrAttestationValid, setIsAttrAttestationValid] = useState<
    null | boolean
  >(null);
  const [error, setError] = useState<null | string>(null);
  const [attestationObject, setAttestationObject] = useState<string | null>(
    null,
  );
  const [decodedAttestation, setDecodedAttestation] =
    useState<AttestationObject | null>(null);

  const [hexNotaryKey, setHexNotaryKey] = useState<string | null>(null);

  const verifyAttestation = async () => {
    if (!attestationObject) return setError('Attestation object is invalid');

    try {
      const attestationObject_ = JSON.parse(
        attestationObject,
      ) as AttestationObject;

      const { is_valid, decodedAttestation, hex_notary_key } =
        await decode_and_verify(
          attestationObject_,
          verify_attestation_signature,
        );

      if (!is_valid) return setError('Signature is invalid');

      setDecodedAttestation(decodedAttestation);
      setHexNotaryKey(hex_notary_key);
      setIsAttrAttestationValid(is_valid);
    } catch (e) {
      setIsAttrAttestationValid(false);
      return setError('Attestation is invalid');
    }
  };

  const parseAttestationObject = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    try {
      setAttestationObject(e.target.value);
    } catch (e) {}
  };

  return (
    <div>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="text-2xl font-bold text-gray-800">
            Verify your TLS attestation
          </div>

          <div className="mt-4">
            <label
              htmlFor="attestation"
              className="block text-sm font-medium text-gray-700"
            >
              Paste attestation object
            </label>
            <textarea
              id="attestation"
              name="attestation"
              rows={4}
              className="h-40 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              onChange={parseAttestationObject}
              placeholder={placeholder_object}
            ></textarea>

            <div className="flex justify-center items-center mb-4 mt-4">
              <button
                onClick={verifyAttestation}
                disabled={!attestationObject}
                className={`px-4 py-2 ${attestationObject ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 flex items-center`}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Verify
              </button>
            </div>

            {isAttrAttestationValid === false && (
              <div
                className={`mt-4 p-4 rounded-md ${isAttrAttestationValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">{<p> {error}</p>}</span>
                </div>
              </div>
            )}

            {isAttrAttestationValid &&
              decodedAttestation &&
              decodedAttestation.application_data_decoded && (
                <CardAttestation
                  decoded_data={decodedAttestation.application_data_decoded}
                  attributes={decodedAttestation.attributes}
                  hex_notary_key={hexNotaryKey || ''}
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StylizedJSON = ({ data }: { data: DecodedData }) => {
  const convertToStylizedYAML = (obj: any, indent = 0): React.ReactNode[] => {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Input must be a valid JSON object');
    }

    const obj_ = obj;

    return Object.entries(obj_).map(([key, value], index) => {
      const indentation = '  '.repeat(indent);
      const isArray = Array.isArray(value);
      const isObject = typeof value === 'object' && value !== null && !isArray;

      let content: React.ReactNode;

      if (isObject || isArray) {
        content = (
          <>
            <span className="text-purple-600">{key}:</span> {isArray ? '▼' : ''}
            {convertToStylizedYAML(value, indent + 1)}
          </>
        );
      } else {
        let valueClass = 'text-blue-600';
        if (typeof value === 'string') {
          valueClass = 'text-green-600';
          value = `"${value}"`;
        } else if (typeof value === 'number') {
          valueClass = 'text-orange-600';
        }
        content = (
          <>
            <span className="text-purple-600">{key}:</span>{' '}
            <span className={valueClass}>{value as any}</span>
          </>
        );
      }

      return (
        <div key={index} style={{ marginLeft: `${indent * 20}px` }}>
          {indentation}
          {content}
        </div>
      );
    });
  };

  try {
    const stylizedContent = convertToStylizedYAML(data);
    return (
      <pre className="font-mono text-sm bg-gray-100 p-4 rounded-lg overflow-x-auto">
        {stylizedContent}
      </pre>
    );
  } catch (error) {
    return (
      <div className="text-red-600">Error: {(error as Error).message}</div>
    );
  }
};

const placeholder_object = `
copy the attestation object from the extension
example:
{
  "version": "1.0",
  "meta": {
    "notaryUrl": "http://localhost:7047",
    "websocketProxyUrl": "ws://localhost:55688"
  },
  "signature": "2897de7cfe3c59367c8fbc42bdcab9832cfa89be74ea629c27a8c8ce5f6b123c939184269d6e79bc335f64a913601bcda9fc76cad507365e8a25593c49c7468f",
  "application_data": "4745542068747470733a2f2f64756d6d796a736f6e2e636f6d2f70726f64756374732f3120485454502f312e310d0a757365722d6167656e743a204d6f7a696c6c612f352e3020285831313b204c696e7578207838365f363429204170706c655765624b69742f3533372e333620284b48544d4c2c206c696b65204765636b6f29204368726f6d652f3132392e302e302e30205361666172692f3533372e33360d0a7365632d63682d75612d6d6f62696c653a203f300d0a6163636570743a20746578742f68746d6c2c6170706c69636174696f6e2f7868746d6c2b786d6c2c6170706c69636174696f6e2f786d6c3b713d302e392c696d6167652f617669662c696d6167652f776562702c696d6167652f61706e672c2a2f2a3b713d302e382c6170706c69636174696f6e2f7369676e65642d65786368616e67653b763d62333b713d302e370d0a7365632d66657463682d736974653a2063726f73732d736974650d0a7365632d66657463682d6d6f64653a206e617669676174650d0a7365632d66657463682d646573743a20646f63756d656e740d0a6163636570742d656e636f64696e673a206964656e746974790d0a6163636570742d6c616e67756167653a20656e2d55532c656e3b713d302e392c66722d46523b713d302e382c66723b713d302e372c656e2d46523b713d302e362c7a682d46523b713d302e352c7a683b713d302e342c61722d46523b713d302e332c61723b713d302e320d0a686f73743a2064756d6d796a736f6e2e636f6d0d0a757067726164652d696e7365637572652d72657175657374733a20310d0a7365632d63682d75613a2022476f6f676c65204368726f6d65223b763d22313239222c20224e6f743d413f4272616e64223b763d2238222c20224368726f6d69756d223b763d22313239220d0a636f6e6e656374696f6e3a20636c6f73650d0a7365632d63682d75612d706c6174666f726d3a20224c696e7578220d0a646e743a20310d0a0d0a485454502f312e3120323030204f4b0d0a5265706f72742d546f3a207b2267726f7570223a226865726f6b752d6e656c222c226d61785f616765223a333630302c22656e64706f696e7473223a5b7b2275726c223a2268747470733a2f2f6e656c2e6865726f6b752e636f6d2f7265706f7274733f74733d31373239333736353331267369643d65313137303764352d303261372d343365662d623435652d32636634643230333666376426733d31524b70534e7251514247326b326445535577762532465266446d346265785263526e65536e7131436f61414d253344227d5d7d0d0a5265706f7274696e672d456e64706f696e74733a206865726f6b752d6e656c3d68747470733a2f2f6e656c2e6865726f6b752e636f6d2f7265706f7274733f74733d31373239333736353331267369643d65313137303764352d303261372d343365662d623435652d32636634643230333666376426733d31524b70534e7251514247326b326445535577762532465266446d346265785263526e65536e7131436f61414d2533440d0a4e656c3a207b227265706f72745f746f223a226865726f6b752d6e656c222c226d61785f616765223a333630302c22737563636573735f6672616374696f6e223a302e3030352c226661696c7572655f6672616374696f6e223a302e30352c22726573706f6e73655f68656164657273223a5b22566961225d7d0d0a436f6e6e656374696f6e3a20636c6f73650d0a4163636573732d436f6e74726f6c2d416c6c6f772d4f726967696e3a202a0d0a582d446e732d50726566657463682d436f6e74726f6c3a206f66660d0a582d4672616d652d4f7074696f6e733a2053414d454f524947494e0d0a5374726963742d5472616e73706f72742d53656375726974793a206d61782d6167653d31353535323030303b20696e636c756465537562446f6d61696e730d0a582d446f776e6c6f61642d4f7074696f6e733a206e6f6f70656e0d0a582d436f6e74656e742d547970652d4f7074696f6e733a206e6f736e6966660d0a582d5873732d50726f74656374696f6e3a20313b206d6f64653d626c6f636b0d0a582d506f77657265642d42793a2043617473206f6e204b6579626f617264730d0a5365727665723a20426f625468654275696c6465720d0a582d526174656c696d69742d4c696d69743a203130300d0a582d526174656c696d69742d52656d61696e696e673a2039380d0a446174653a205361742c203139204f637420323032342032323a32323a313120474d540d0a582d526174656c696d69742d52657365743a20313732393337363533320d0a436f6e74656e742d547970653a206170706c69636174696f6e2f6a736f6e3b20636861727365743d7574662d380d0a436f6e74656e742d4c656e6774683a20313531330d0a457461673a20572f223565392d724e43734856684836586e573854394235766a64396d58552b7063220d0a566172793a204163636570742d456e636f64696e670d0a5669613a20312e312076656775720d0a0d0a7b226964223a312c227469746c65223a22457373656e6365204d617363617261204c617368205072696e63657373222c226465736372697074696f6e223a2254686520457373656e6365204d617363617261204c617368205072696e63657373206973206120706f70756c6172206d617363617261206b6e6f776e20666f722069747320766f6c756d697a696e6720616e64206c656e677468656e696e6720656666656374732e2041636869657665206472616d61746963206c617368657320776974682074686973206c6f6e672d6c617374696e6720616e6420637275656c74792d6672656520666f726d756c612e222c2263617465676f7279223a22626561757479222c227072696365223a392e39392c22646973636f756e7450657263656e74616765223a372e31372c22726174696e67223a342e39342c2273746f636b223a352c2274616773223a5b22626561757479222c226d617363617261225d2c226272616e64223a22457373656e6365222c22736b75223a225243483435513141222c22776569676874223a322c2264696d656e73696f6e73223a7b227769647468223a32332e31372c22686569676874223a31342e34332c226465707468223a32382e30317d2c2277617272616e7479496e666f726d6174696f6e223a2231206d6f6e74682077617272616e7479222c227368697070696e67496e666f726d6174696f6e223a22536869707320696e2031206d6f6e7468222c22617661696c6162696c697479537461747573223a224c6f772053746f636b222c2272657669657773223a5b7b22726174696e67223a322c22636f6d6d656e74223a225665727920756e68617070792077697468206d7920707572636861736521222c2264617465223a22323032342d30352d32335430383a35363a32312e3631385a222c2272657669657765724e616d65223a224a6f686e20446f65222c227265766965776572456d61696c223a226a6f686e2e646f6540782e64756d6d796a736f6e2e636f6d227d2c7b22726174696e67223a322c22636f6d6d656e74223a224e6f742061732064657363726962656421222c2264617465223a22323032342d30352d32335430383a35363a32312e3631385a222c2272657669657765724e616d65223a224e6f6c616e20476f6e7a616c657a222c227265766965776572456d61696c223a226e6f6c616e2e676f6e7a616c657a40782e64756d6d796a736f6e2e636f6d227d2c7b22726174696e67223a352c22636f6d6d656e74223a22566572792073617469736669656421222c2264617465223a22323032342d30352d32335430383a35363a32312e3631385a222c2272657669657765724e616d65223a22536361726c65747420577269676874222c227265766965776572456d61696c223a22736361726c6574742e77726967687440782e64756d6d796a736f6e2e636f6d227d5d2c2272657475726e506f6c696379223a22333020646179732072657475726e20706f6c696379222c226d696e696d756d4f726465725175616e74697479223a32342c226d657461223a7b22637265617465644174223a22323032342d30352d32335430383a35363a32312e3631385a222c22757064617465644174223a22323032342d30352d32335430383a35363a32312e3631385a222c22626172636f6465223a2239313634303335313039383638222c227172436f6465223a2268747470733a2f2f6173736574732e64756d6d796a736f6e2e636f6d2f7075626c69632f71722d636f64652e706e67227d2c22696d61676573223a5b2268747470733a2f2f63646e2e64756d6d796a736f6e2e636f6d2f70726f64756374732f696d616765732f6265617574792f457373656e63652532304d6173636172612532304c6173682532305072696e636573732f312e706e67225d2c227468756d626e61696c223a2268747470733a2f2f63646e2e64756d6d796a736f6e2e636f6d2f70726f64756374732f696d616765732f6265617574792f457373656e63652532304d6173636172612532304c6173682532305072696e636573732f7468756d626e61696c2e706e67227d",
  "attributes": [
    {
      "attribute_hex": "697348756d616e",
      "attribute_name": "isHuman",
      "signature": "a8624f88ab60b5f9a23e16b1fde1743c6c0dd723155466011f2479deea69b23bea626e24054f800bbdeea4fe4a08f80e1c3dd62601520f8fcbe57e70ddb7addb"
    },
    {
      "attribute_hex": "6167653e3231",
      "attribute_name": "age>21",
      "signature": "5b5cb19ad137052c6b5720c1e81f6218c0fccfb10e4363c1395d812835a445fd30052728594b69313655cc700800129b85b93e04efeab80a2f4d660d45e4326d"
    }
  ]
}
`;

function CardAttestation({
  decoded_data,
  attributes,
  hex_notary_key,
}: {
  decoded_data: DecodedData;
  attributes: Attribute[];
  hex_notary_key: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex justify-center items-center mb-4">
      <Card className="w-full max-w-md  border-2 border-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold text-gray-800">
            Attestation{' '}
            {decoded_data.hostname ? 'for ' + decoded_data.hostname : ''}
          </CardTitle>
          <div className="flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Verified
          </div>
        </CardHeader>

        <CardContent>
          {attributes && (
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr: Attribute) => (
                <div
                  key={attr.attribute_name}
                  className="inline-flex items-center rounded-full bg-green-500 px-2 py-1 text-base font-medium text-white"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  <span>{attr.attribute_name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {decoded_data.semaphore_identity_commitment && (
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Your Public Key
            </h3>
            <p className="mt-1 text-md text-gray-900 font-mono break-all">
              {decoded_data.semaphore_identity_commitment}
            </p>
          </CardContent>
        )}

        <CardContent>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Notary signing key
          </h3>
          <p className="mt-1 text-md text-gray-900 font-mono break-all">
            {hex_notary_key}
          </p>
        </CardContent>

        {
          <CardFooter className="flex justify-between">
            <button
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md px-2 py-1"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'View raw data'}
            </button>
          </CardFooter>
        }
        {showDetails && <StylizedJSON data={decoded_data} />}
      </Card>
    </div>
  );
}
