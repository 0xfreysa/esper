import React, { ReactElement, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router';
import { urlify } from '../../utils/misc';
import { useRequestHistory } from '../../reducers/history';
import { deleteRequestHistory } from '../../reducers/history';
import { useDevMode } from '../../reducers/requests';
import { urlToRegex, extractHostFromUrl } from '../../utils/misc';
import { useBookmarks, BookmarkManager } from '../../reducers/bookmarks';
import { AttestationObject, Attribute } from '@freysa/esper-js';
import VerifiedCheck from '../SvgIcons/VerifiedCheck';
import { formatAttestationField } from '../AttestationCard';

const charwise = require('charwise');

export function AttestationDetailsCard({
  requestId,
  onCopy,
  onDownload,
  onVerify,
  attributeAttestation,
}: {
  requestId: string;
  id?: string;
  onCopy: () => void;
  onDownload: () => void;
  onVerify: () => void;
  attributeAttestation: AttestationObject;
}): ReactElement {
  const request = useRequestHistory(requestId);
  const requestUrl = urlify(request?.url || '');
  const [bookmarks] = useBookmarks();
  const [devMode] = useDevMode();
  const dispatch = useDispatch();
  const bookmarkManager = new BookmarkManager();
  const navigate = useNavigate();
  const location = useLocation();

  const { status } = request || {};

  const attributes = request?.proof?.attributes || [];

  const onDelete = useCallback(async () => {
    dispatch(deleteRequestHistory(requestId));

    const bookmark = await bookmarkManager.findBookmark(
      request?.url || '',
      '',
      '',
    );

    if (bookmark) {
      const updatedBookmark = {
        ...bookmark,
        notarizedAt: undefined,
      };
      await bookmarkManager.updateBookmark(updatedBookmark);
    }

    const steps = location.pathname.split('/');

    if (steps.length > 4) {
      navigate(steps.slice(0, -2).join('/'));
      return;
    } else {
      navigate('/home?opentab=history');
    }
  }, [requestId, location.pathname, navigate]);

  return (
    <>
      <div className="flex flex-col" key={requestId}>
        <div className="p-4 bg-providerTile rounded-xl flex flex-col">
          <div className="flex flex-row items-center mb-4">
            <div className="flex-1 text-text text-[18px] font-bold leading-[20px] truncate">
              {requestUrl?.host}
            </div>
            {status === 'success' && (
              <div>
                <div className="inline-flex items-center px-2 py-1.5 rounded-full gap-1">
                  <VerifiedCheck />
                  <span className="text-textVerified text-[14px] font-[600] leading-[20px]">
                    Verified
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[160px,1fr] gap-2">
            {attributes.map((attribute: Attribute) => (
              <>
                <div className="text-textDim text-sm leading-5 overflow-hidden text-ellipsis whitespace-nowrap font-bold capitalize">
                  {formatAttestationField(
                    attribute.attribute_name.split(':')[0],
                    true,
                  )}
                </div>
                <div className="text-text text-sm leading-5 truncate font-bold capitalize">
                  {formatAttestationField(
                    attribute.attribute_name.split(':')[1],
                    false,
                  )}
                </div>
              </>
            ))}

            {[
              {
                label: 'Time',
                value: new Date(charwise.decode(requestId, 'hex'))
                  .toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                  .replace(/(\d+)\/(\d+)\/(\d+),\s*(.*)/, '$3-$1-$2 $4'),
              },
              {
                label: 'Notary',
                value: attributeAttestation?.meta?.notaryUrl,
              },
              {
                label: 'Version',
                value: attributeAttestation?.version,
              },
              {
                label: 'Websocket proxy',
                value: attributeAttestation?.meta?.websocketProxyUrl,
              },
              {
                label: 'Your public key',
                value:
                  attributeAttestation?.application_data_decoded
                    ?.semaphore_identity_commitment,
              },
              {
                label: 'Signature',
                value: attributeAttestation?.signature,
              },
            ].map(({ label, value }) => (
              <>
                <div className="text-textDim text-sm leading-5">{label}</div>
                <div className="text-text text-sm leading-5 break-all">
                  {value}
                </div>
              </>
            ))}
          </div>

          {/* <div className="text-textDim text-sm leading-5">Data</div>
          <div className="text-text text-sm leading-5 break-all mt-2">
            {(() => {
              try {
                const parsedData = JSON.parse(
                  attributeAttestation.application_data_decoded
                    ?.response_body || '',
                );
                return <StylizedJSON data={parsedData} />;
              } catch (error) {
                return (
                  <p>
                    {
                      attributeAttestation.application_data_decoded
                        ?.response_body
                    }
                  </p>
                );
              }
            })()}
          </div> */}

          <div className="flex mt-4 gap-4">
            {status === 'success' && (
              <>
                {[
                  {
                    label: 'Copy',
                    onClick: onCopy,
                  },
                  {
                    label: 'Download',
                    onClick: onDownload,
                  },
                  {
                    label: 'Verify',
                    onClick: onVerify,
                  },
                ].map(({ label, onClick }) => (
                  <div
                    key={label}
                    onClick={onClick}
                    className={`cursor-pointer flex h-[40px] px-4 py-1 justify-center items-center gap-3 flex-1 rounded-lg bg-buttonLight hover:bg-buttonLightHover text-buttonLightText text-sm font-medium`}
                  >
                    {label}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex">
        <div
          onClick={onDelete}
          className="flex-1 text-center cursor-pointer border border-error/40 hover:opacity-80 text-error bg-error/10 text-sm font-medium py-[10px] px-4 rounded-lg"
        >
          Delete Attestation
        </div>
      </div>
    </>
  );
}

interface StylizedJSONProps {
  data: any;
}

const StylizedJSON: React.FC<StylizedJSONProps> = ({ data }) => {
  const convertToStylizedYAML = (
    obj: Record<string, unknown>,
    indent = 0,
  ): React.ReactNode[] => {
    if (typeof obj !== 'object' || obj === null) {
      throw Error('Input must be a valid JSON object');
    }

    return Object.entries(obj).map(([key, value], index) => {
      const indentation = '  '.repeat(indent);
      const isArray = Array.isArray(value);
      const isObject = typeof value === 'object' && value !== null && !isArray;

      let content: React.ReactNode;

      if (isObject || isArray) {
        content = (
          <>
            <span className="text-purple-600">{key}:</span> {isArray ? '▼' : ''}
            {convertToStylizedYAML(
              value as Record<string, unknown>,
              indent + 1,
            )}
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
      <pre className="font-mono text-sm bg-mainDark/60 p-4 rounded-lg overflow-x-auto">
        {stylizedContent}
      </pre>
    );
  } catch (error) {
    return (
      <div className="text-red-600">Error: {(error as Error).message}</div>
    );
  }
};
