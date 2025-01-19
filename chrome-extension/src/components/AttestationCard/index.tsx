import React, { ReactElement, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { download, urlify } from '../../utils/misc';
import { useRequestHistory } from '../../reducers/history';
import { getNotaryApi, getProxyApi } from '../../utils/storage';
import { BackgroundActiontype } from '../../entries/Background/rpc';
import Modal, { ModalContent } from '../Modal/Modal';
import Error from '../SvgIcons/Error';
import { useDevMode } from '../../reducers/requests';
import { urlToRegex, extractHostFromUrl } from '../../utils/misc';
import { useBookmarks } from '../../reducers/bookmarks';
import { Attribute } from '@freysa/esper-js';
import VerifiedCheck from '../SvgIcons/VerifiedCheck';
import { on } from 'events';

const charwise = require('charwise');

export function formatDate(requestId: string) {
  const date = new Date(charwise.decode(requestId, 'hex'));
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return 'TODAY';
  }

  if (isYesterday) {
    return 'YESTERDAY';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatAttestationDate(
  requestId: string,
  previousRequestId?: string,
) {
  const date = formatDate(requestId);
  const previousDate = previousRequestId ? formatDate(previousRequestId) : null;

  if (!previousDate) {
    return date;
  }

  if (date !== previousDate) {
    return date;
  }

  return '';
}

function hardcodedKeys(key: string) {
  if (key === 'screen_name') {
    return 'Screen Name';
  }

  if (key === 'verified') {
    return 'Verified';
  }

  if (key === 'PreGPT4') {
    return 'Pre GPT-4';
  }

  if (key === 'paid') {
    return 'Paid';
  }

  if (key === 'karma') {
    return 'Post Karma';
  }

  if (key === 'over_10k') {
    return 'Over $10k';
  }

  if (key === 'age') {
    return 'Age';
  }

  if (key === 'isValid') {
    return 'Valid';
  }

  if (key === 'usd_total') {
    return 'USD Total';
  }

  if (key === 'usd_count') {
    return 'USD Count';
  }

  if (key === 'eur_total') {
    return 'EUR Total';
  }

  if (key === 'eur_count') {
    return 'EUR Count';
  }

  if (key === 'creditScore') {
    return 'Credit Score';
  }

  if (key === 'high_score') {
    return 'High Score';
  }

  if (key === 'grade_name') {
    return 'Grade Name';
  }

  return null;
}

export function formatAttestationField(field: string, isKey: boolean) {
  if (!field) return '';
  if (isKey) {
    const hardcoded = hardcodedKeys(field);
    if (hardcoded) {
      return hardcoded;
    }
  }

  let formattedField = field.trim();

  // remove outside quotes if present (handle both single and double quotes)
  if (
    (formattedField.startsWith('"') && formattedField.endsWith('"')) ||
    (formattedField.startsWith("'") && formattedField.endsWith("'"))
  ) {
    formattedField = formattedField.slice(1, -1);
  }

  // do not format users values further
  if (!isKey) {
    return formattedField;
  }

  // convert snake case to camel case
  formattedField = formattedField.replace(
    /_([a-z])/g,
    function (match, letter) {
      return letter.toUpperCase();
    },
  );

  // convert camel case to title case
  formattedField = formattedField.replace(/([A-Z])/g, ' $1');

  // capitalize first letter
  formattedField =
    formattedField.charAt(0).toUpperCase() + formattedField.slice(1);

  return formattedField;
}

export function AttestationCard({
  requestId,
  id,
  previousRequestId,
  showDate,
  pathname,
}: {
  requestId: string;
  id?: string;
  previousRequestId?: string;
  showDate: boolean;
  pathname: string;
}): ReactElement {
  const request = useRequestHistory(requestId);
  const navigate = useNavigate();
  const requestUrl = urlify(request?.url || '');
  const date = formatAttestationDate(requestId, previousRequestId);
  const [bookmarks] = useBookmarks();
  const [devMode] = useDevMode();

  const { status } = request || {};

  const [showingError, showError] = useState(false);

  const onRetry = useCallback(async () => {
    const notaryUrl = await getNotaryApi();
    const websocketProxyUrl = await getProxyApi();
    chrome.runtime.sendMessage<any, string>({
      type: BackgroundActiontype.retry_prove_request,
      data: {
        id: requestId,
        notaryUrl,
        websocketProxyUrl,
      },
    });
  }, [requestId]);

  const onShowError = useCallback(async () => {
    showError(true);
  }, [request?.error, showError]);

  const closeAllModal = useCallback(() => {
    showError(false);
  }, [showingError, showError]);

  const copyRequest = useCallback(async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTabUrl = tabs[0]?.url || '';
    const request_ = {
      id: bookmarks.length + 1,
      host: extractHostFromUrl(request?.url || ''),
      urlRegex: urlToRegex(request?.url || ''),
      targetUrl: currentTabUrl,
      method: request?.method,
      title: '',
      description: '',
      icon: '',
      responseType: '',
      actionSelectors: [],
    };

    navigator.clipboard.writeText(JSON.stringify(request_, null, 2));
  }, [request, bookmarks]);

  function ErrorModal(): ReactElement {
    const msg = typeof request?.error === 'string' && request?.error;
    return !showingError ? (
      <></>
    ) : (
      <Modal
        className="p-4 bg-providerTile rounded-xl flex flex-col mx-6"
        onClose={closeAllModal}
      >
        <ModalContent className="flex flex-col">
          <div className="flex-1 font-bold text-textLight text-lg truncate">
            Error
          </div>
          <div className="text-textGray text-sm leading-5 mb-4">
            {msg || 'Something went wrong...'}
          </div>
        </ModalContent>
        <div
          onClick={closeAllModal}
          className="mx-auto cursor-pointer flex items-center gap-2 text-error text-sm font-medium py-2 px-8 rounded-lg bg-buttonLight hover:bg-buttonLightHover"
        >
          Close
        </div>
      </Modal>
    );
  }

  const attributes = request?.proof?.attributes || [];

  return (
    <div className="flex flex-col" key={requestId}>
      <ErrorModal />
      {showDate && date && (
        <div className="text-sm font-semibold mb-3 text-textGray">{date}</div>
      )}
      <div className="p-4 bg-providerTile rounded-xl flex flex-col shadow-sm">
        <div className="flex flex-row items-center mb-4">
          <div className="flex-1 text-textLight text-[18px] font-bold leading-[20px] truncate">
            {requestUrl?.host}
          </div>
          {status === 'error' && !!request?.error && (
            <>
              <div
                onClick={onShowError}
                className="cursor-pointer flex items-center gap-2 text-error text-sm font-medium py-[6px] px-2 rounded-lg hover:opacity-70"
              >
                <Error />
                &nbsp;Error
              </div>
            </>
          )}
          {status !== 'success' && (
            <div
              onClick={() => {
                if (status === 'pending') return;
                onRetry();
              }}
              className={`${status !== 'pending' ? 'cursor-pointer text-textVerified hover:opacity-70' : 'text-textGray'} ml-2 text-sm font-medium py-[6px] px-2 rounded-lg border border-grayOutline`}
            >
              {status === 'pending' ? 'Pending' : 'Retry'}
            </div>
          )}
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

        <div className="grid grid-cols-[100px,1fr] gap-2">
          {attributes.map((attribute: Attribute) => (
            <>
              <div className="text-[#808079] text-sm leading-5 overflow-hidden text-ellipsis whitespace-nowrap font-bold">
                {formatAttestationField(
                  attribute.attribute_name.split(':')[0],
                  true,
                )}
              </div>
              <div className="text-text text-sm leading-5 truncate font-bold">
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
          ].map(({ label, value }) => (
            <>
              <div className="text-[#808079] text-sm leading-5">{label}</div>
              <div className="text-text text-sm leading-5 truncate">
                {value}
              </div>
            </>
          ))}
        </div>

        <div className="flex mt-4 gap-4">
          {status === 'success' && (
            <>
              {[
                {
                  label: 'View',
                  onClick: () => {
                    navigate(
                      `${pathname}/attestation/${requestId}?host=${requestUrl?.host}`,
                    );
                  },
                  // onClick: () =>
                  //   id
                  //     ? navigate(
                  //         `/home/website/${id}/attestation/${requestId}?host=${requestUrl?.host}`,
                  //       )
                  //     : navigate(
                  //         `/home/attestation/${requestId}?host=${requestUrl?.host}`,
                  //       ),
                },
                {
                  label: 'Save',
                  onClick: () =>
                    download(
                      `${request?.id}.json`,
                      JSON.stringify(request?.proof),
                    ),
                },
                {
                  label: 'Copy request',
                  onClick: copyRequest,
                  showIf: devMode,
                },
              ].map(
                ({ label, onClick, showIf = true }) =>
                  showIf && (
                    <div
                      key={label}
                      onClick={onClick}
                      className={`cursor-pointer flex h-[40px] px-4 py-1 justify-center items-center gap-3 flex-1 rounded-lg bg-buttonLight hover:bg-buttonLightHover text-buttonLightText text-sm font-medium`}
                    >
                      {label}
                    </div>
                  ),
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
