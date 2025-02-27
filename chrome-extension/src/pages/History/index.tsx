import React, { ReactElement, useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import {
  useHistoryOrder,
  useRequestHistory,
  deleteRequestHistory,
  useAllRequestHistory,
} from '../../reducers/history';

import { getNotaryApi, getProxyApi } from '../../utils/storage';
import { urlify, download, upload } from '../../utils/misc';
import { BackgroundActiontype } from '../../entries/Background/rpc';
import Modal, { ModalContent } from '../../components/Modal/Modal';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import { EXPLORER_API } from '../../utils/constants';
import {
  setNotaryRequestCid,
  getNotaryRequest,
  getNotaryRequests,
  removeNotaryRequest,
  removeAllNotaryRequests,
} from '../../entries/Background/db';
import { BookmarkManager } from '../../reducers/bookmarks';
import { RequestHistory } from '../../entries/Background/rpc';
import Icon from '../../components/Icon';
import { AttestationCard } from '../../components/AttestationCard';
const charwise = require('charwise');

const bookmarkManager = new BookmarkManager();
export default function History(): ReactElement {
  const params = useParams<{ host: string }>();
  const history = useHistoryOrder(params.host);
  const showDate = !Boolean(params.host);

  const request = useRequestHistory(history[0]);
  const [targetUrl, setTargetUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    const targetUrl = urlify(request?.url || '');
    const host = targetUrl?.host;
    const scheme = targetUrl?.protocol;
    setTargetUrl(targetUrl?.toString());
  }, [request]);

  const clearHistory = useCallback(async () => {
    await removeAllNotaryRequests();
  }, []);

  const allRequest = useAllRequestHistory();

  return (
    <div className="flex flex-col gap-4 overflow-y-auto flex-1 px-4 pb-6">
      {!showDate && (
        <div
          onClick={() => {
            window.open(targetUrl || '', '_blank');
          }}
          className="cursor-pointer border border-button bg-white hover:bg-slate-100 text-[#092EEA] text-sm font-medium py-[10px] px-2 rounded-lg text-center"
        >
          Generate new attestation
        </div>
      )}

      {!showDate && (
        <>
          <div className="text-sm font-semibold mb-3 text-[#97979F]">
            Previous Attestations
          </div>
        </>
      )}

      {history.length === 0 && (
        <div className="text-sm mb-2 text-[#97979F] flex flex-1 justify-center items-center">
          No verifications found
        </div>
      )}

      {history.map((id, index) => (
        <AttestationCard
          key={id}
          requestId={id}
          showDate={showDate}
          previousRequestId={index > 0 ? history[index - 1] : undefined}
          pathname={'/home'}
        />
      ))}
    </div>
  );
}

export function OneRequestHistory(props: {
  requestId: string;
  className?: string;
  hideActions?: string[];
}): ReactElement {
  const { hideActions = [] } = props;
  const dispatch = useDispatch();
  const request = useRequestHistory(props.requestId);
  const [showingError, showError] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showingShareConfirmation, setShowingShareConfirmation] =
    useState(false);
  const [cid, setCid] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { status } = request || {};
  const requestUrl = urlify(request?.url || '');

  const [successBookmark, setSuccessBookmark] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (request && request.cid) {
          setCid({ [props.requestId]: request.cid });
        }
      } catch (e) {
        console.error('Error fetching data', e);
      }
    };
    fetchData();
  }, []);

  const onRetry = useCallback(async () => {
    const notaryUrl = await getNotaryApi();
    const websocketProxyUrl = await getProxyApi();
    chrome.runtime.sendMessage<any, string>({
      type: BackgroundActiontype.retry_prove_request,
      data: {
        id: props.requestId,
        notaryUrl,
        websocketProxyUrl,
      },
    });
  }, [props.requestId]);

  const onView = useCallback(() => {
    chrome.runtime.sendMessage<any, string>({
      type: BackgroundActiontype.verify_prove_request,
      data: request,
    });
    navigate('/verify/' + request?.id);
  }, [request]);

  const onDelete = useCallback(async () => {
    dispatch(deleteRequestHistory(props.requestId));
  }, [props.requestId]);

  const onShowError = useCallback(async () => {
    showError(true);
  }, [request?.error, showError]);

  const closeAllModal = useCallback(() => {
    setShowingShareConfirmation(false);
    showError(false);
  }, [setShowingShareConfirmation, showError]);

  const addBookmark = useCallback(
    async (request: RequestHistory) => {
      setSuccessBookmark(true);
      const bm = await bookmarkManager.convertRequestToBookmark(request);
      bookmarkManager.addBookmark(bm);
    },
    [request],
  );

  const handleUpload = useCallback(async () => {
    setUploading(true);
    try {
      const data = await upload(
        `${request?.id}.json`,
        JSON.stringify(request?.proof),
      );
      setCid((prevCid) => ({ ...prevCid, [props.requestId]: data }));
      await setNotaryRequestCid(props.requestId, data);
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }, [props.requestId, request, cid]);

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap border rounded-md p-2 gap-1 hover:bg-slate-50 cursor-pointer',
        props.className,
      )}
    >
      <ShareConfirmationModal />
      <ErrorModal />
      <div className="flex flex-col flex-nowrap flex-grow flex-shrink w-0">
        <div className="flex flex-row items-center text-xs">
          <div className="bg-slate-200 text-slate-400 px-1 py-0.5 rounded-sm">
            {request?.method}
          </div>
          <div className="text-black font-bold px-2 py-1 rounded-md overflow-hidden text-ellipsis">
            {requestUrl?.host}
          </div>
        </div>
        <div className="flex flex-row">
          <div className="font-bold text-slate-400">Time:</div>
          <div className="ml-2 text-slate-800">
            {new Date(charwise.decode(props.requestId, 'hex')).toISOString()}
          </div>
        </div>
        <div className="flex flex-row">
          <div className="font-bold text-slate-400">Url:</div>
          <div className="ml-2 text-slate-800">
            {requestUrl?.pathname.substring(0, 100) + '...'}
          </div>
        </div>
        <div className="flex flex-row">
          <div className="font-bold text-slate-400">Notary API:</div>
          <div className="ml-2 text-slate-800">{request?.notaryUrl}</div>
        </div>
        <div className="flex flex-row">
          <div className="font-bold text-slate-400">TLS Proxy API:</div>
          <div className="ml-2 text-slate-800">
            {request?.websocketProxyUrl}
          </div>
        </div>
        <div className="flex flex-row">
          <div className="font-bold text-slate-400">Notary signature</div>
          <div className="ml-2 text-slate-800">
            0x{request?.proof?.signature.substring(0, 20) + '...'}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {status === 'success' && (
          <>
            <ActionButton
              className="bg-slate-600 text-slate-200 hover:bg-slate-500 hover:text-slate-100"
              onClick={onView}
              fa="fa-solid fa-receipt"
              ctaText="View Attestation"
              hidden={hideActions.includes('view')}
            />
            <ActionButton
              className={
                'text-slate-300 hover:bg-slate-200 hover:text-slate-500 ' +
                (successBookmark ? 'bg-slate-600' : 'bg-slate-100')
              }
              onClick={() => addBookmark(request!)}
              fa="fa-solid fa-bookmark"
              ctaText="Add provider"
              hidden={hideActions.includes('save')}
            />

            <ActionButton
              className="bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500"
              onClick={() =>
                download(`${request?.id}.json`, JSON.stringify(request?.proof))
              }
              fa="fa-solid fa-download"
              ctaText="Download"
              hidden={hideActions.includes('download')}
            />

            {/* <ActionButton
              className="flex flex-row flex-grow-0 gap-2 self-end items-center justify-end px-2 py-1 bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500 hover:font-bold"
              onClick={() => setShowingShareConfirmation(true)}
              fa="fa-solid fa-upload"
              ctaText="Share"
              hidden={hideActions.includes('share')}
            /> */}
          </>
        )}
        {status === 'error' && !!request?.error && (
          <ErrorButton hidden={hideActions.includes('error')} />
        )}
        {<RetryButton hidden={hideActions.includes('retry')} />}
        {status === 'pending' && (
          <button className="flex flex-row flex-grow-0 gap-2 self-end items-center justify-end px-2 py-1 bg-slate-100 text-slate-300 font-bold">
            <Icon className="animate-spin" fa="fa-solid fa-spinner" size={1} />
            <span className="text-xs font-bold">Pending</span>
          </button>
        )}
        <ActionButton
          className="flex flex-row flex-grow-0 gap-2 self-end items-center justify-end px-2 py-1 bg-slate-100 text-slate-300 hover:bg-red-100 hover:text-red-500 hover:font-bold"
          onClick={onDelete}
          fa="fa-solid fa-trash"
          ctaText="Delete"
          hidden={hideActions.includes('delete')}
        />
      </div>
    </div>
  );

  function RetryButton(p: { hidden?: boolean }): ReactElement {
    if (p.hidden) return <></>;
    return (
      <button
        className="flex flex-row flex-grow-0 gap-2 self-end items-center justify-end px-2 py-1 bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500 hover:font-bold"
        onClick={onRetry}
      >
        <Icon fa="fa-solid fa-arrows-rotate" size={1} />
        <span className="text-xs font-bold">Retry</span>
      </button>
    );
  }

  function ErrorButton(p: { hidden?: boolean }): ReactElement {
    if (p.hidden) return <></>;
    return (
      <button
        className="flex flex-row flex-grow-0 gap-2 self-end items-center justify-end px-2 py-1 bg-red-100 text-red-300 hover:bg-red-200 hover:text-red-500 hover:font-bold"
        onClick={onShowError}
      >
        <Icon fa="fa-solid fa-circle-exclamation" size={1} />
        <span className="text-xs font-bold">Error</span>
      </button>
    );
  }

  function ErrorModal(): ReactElement {
    const msg = typeof request?.error === 'string' && request?.error;
    return !showingError ? (
      <></>
    ) : (
      <Modal
        className="flex flex-col gap-4 items-center text-base cursor-default justify-center !w-auto mx-4 my-[50%] min-h-24 p-4 border border-red-500"
        onClose={closeAllModal}
      >
        <ModalContent className="flex justify-center items-center text-slate-500">
          {msg || 'Something went wrong :('}
        </ModalContent>
        <button
          className="m-0 w-24 bg-red-100 text-red-300 hover:bg-red-200 hover:text-red-500"
          onClick={closeAllModal}
        >
          OK
        </button>
      </Modal>
    );
  }

  function ShareConfirmationModal(): ReactElement {
    return !showingShareConfirmation ? (
      <></>
    ) : (
      <Modal
        className="flex flex-col items-center text-base cursor-default justify-center !w-auto mx-4 my-[50%] p-4 gap-4"
        onClose={closeAllModal}
      >
        <ModalContent className="flex flex-col w-full gap-4 items-center text-base justify-center">
          {!cid[props.requestId] ? (
            <p className="text-slate-500 text-center">
              {uploadError ||
                'This will make your proof publicly accessible by anyone with the CID'}
            </p>
          ) : (
            <input
              className="input w-full bg-slate-100 border border-slate-200"
              readOnly
              value={`${EXPLORER_API}/ipfs/${cid[props.requestId]}`}
              onFocus={(e) => e.target.select()}
            />
          )}
        </ModalContent>
        <div className="flex flex-row gap-2 justify-center">
          {!cid[props.requestId] ? (
            <>
              {!uploadError && (
                <button
                  onClick={handleUpload}
                  className="button button--primary flex flex-row items-center justify-center gap-2 m-0"
                  disabled={uploading}
                >
                  {uploading && (
                    <Icon
                      className="animate-spin"
                      fa="fa-solid fa-spinner"
                      size={1}
                    />
                  )}
                  I understand
                </button>
              )}
              <button
                className="m-0 w-24 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 font-bold"
                onClick={closeAllModal}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  copy(`${EXPLORER_API}/ipfs/${cid[props.requestId]}`)
                }
                className="m-0 w-24 bg-slate-600 text-slate-200 hover:bg-slate-500 hover:text-slate-100 font-bold"
              >
                Copy
              </button>
              <button
                className="m-0 w-24 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 font-bold"
                onClick={closeAllModal}
              >
                Close
              </button>
            </>
          )}
        </div>
      </Modal>
    );
  }
}

function ActionButton(props: {
  onClick: () => void;
  fa: string;
  ctaText: string;
  className?: string;
  hidden?: boolean;
}): ReactElement {
  if (props.hidden) return <></>;

  return (
    <button
      className={
        'flex items-center px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors duration-200'
      }
      onClick={props.onClick}
    >
      <Icon className="" fa={props.fa} size={1} />
      <span className="text-xs font-bold">{props.ctaText}</span>
    </button>
  );
}
