import React, { ReactElement, useState, useCallback, useEffect } from 'react';
import { useLocation, useParams } from 'react-router';
import {
  useHistoryOrder,
  useAllRequestHistory,
  useRequestHistory,
} from '../../reducers/history';

import { removeAllNotaryRequests } from '../../entries/Background/db';
import { BookmarkManager } from '../../reducers/bookmarks';
import { AttestationCard } from '../../components/AttestationCard';
import { Bookmark } from '../../reducers/bookmarks';
import { urlify } from '../../utils/misc';

const bookmarkManager = new BookmarkManager();
export default function BookmarkHistory(): ReactElement {
  const params = useParams<{ id: string }>();
  const { pathname } = useLocation();

  const { id } = params;

  const showDate = !Boolean(id);
  const [useHistoryFromHost, setUseHistoryFromHost] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const [bookmark, setBookmark] = useState<Bookmark | undefined>(undefined);

  const history = useHistoryOrder(
    undefined,
    undefined,
    bookmark?.urlRegex?.toString(),
  );

  const historyFromHost = useHistoryOrder(id);

  const request = useRequestHistory(historyFromHost[0]);
  const [targetUrl, setTargetUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    const targetUrl = urlify(request?.url || '');
    const host = targetUrl?.host;
    const scheme = targetUrl?.protocol;
    setTargetUrl(targetUrl?.toString());
  }, [request]);

  //retrieve bookmark detail
  useEffect(() => {
    async function fetchBookmarks() {
      if (!id) return;
      const bookmark = await bookmarkManager.getBookmarkById(id);

      if (!bookmark) {
        console.log('Bookmark not found');
        setError('Bookmark not found');
        setUseHistoryFromHost(true);
        return;
      }
      setBookmark(bookmark);
    }
    fetchBookmarks();
  }, [id]);

  const generateAttestation = useCallback(() => {
    (async () => {
      if (!bookmark) return;
      await bookmarkManager.updateBookmark({
        ...bookmark,
        toNotarize: true,
      });
      window.open(bookmark?.targetUrl || '', '_blank');
    })();
  }, [bookmark]);

  if (!bookmark && !useHistoryFromHost) return <></>;
  if (error && !useHistoryFromHost)
    return (
      <div className="flex flex-col gap-4 py-4 overflow-y-auto flex-1">
        <div className="flex flex-col flex-nowrap justify-center gap-2 mx-4">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-4 pb-4 overflow-y-auto flex-1 px-4 bg-mainDark">
      {bookmark?.description ? (
        <div className="text-xs text-[#1F2024] mt-4">
          {bookmark.description}
        </div>
      ) : (
        <div className="" />
      )}

      {!useHistoryFromHost && (
        <div
          onClick={generateAttestation}
          className="cursor-pointer bg-button hover:bg-buttonHover text-buttonText text-sm font-medium py-[10px] px-2 rounded-lg text-center"
        >
          Generate new attestation
        </div>
      )}

      {!showDate && (
        <div className="text-sm font-semibold text-[#97979F]">
          Previous Attestations
        </div>
      )}
      {useHistoryFromHost
        ? historyFromHost.map((attestationId, index) => (
            <AttestationCard
              key={attestationId}
              requestId={attestationId}
              id={id}
              showDate={showDate}
              previousRequestId={
                index > 0 ? historyFromHost[index - 1] : undefined
              }
              pathname={pathname}
            />
          ))
        : history.map((attestationId, index) => (
            <AttestationCard
              key={attestationId}
              requestId={attestationId}
              id={id}
              showDate={showDate}
              previousRequestId={index > 0 ? history[index - 1] : undefined}
              pathname={pathname}
            />
          ))}
    </div>
  );
}
