import React, { useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router';
import { useDispatch } from 'react-redux';
import {
  setActiveTab,
  setRequests,
  useActiveTab,
  useActiveTabUrl,
} from '../../reducers/requests';
import { BackgroundActiontype } from '../Background/rpc';
import Requests from '../../pages/Requests';
import Options from '../../pages/Options';
import Request from '../../pages/Requests/Request';
import Home from '../../pages/Home';
import RequestBuilder from '../../pages/RequestBuilder';
import Notarize from '../../pages/Notarize';
import ProofViewer from '../../pages/ProofViewer';
import History from '../../pages/History';
import BookmarkHistory from '../../pages/History/bookmark-history';
import Bookmarks from '../../pages/Bookmarks';
import ProofUploader from '../../pages/ProofUploader';
import browser from 'webextension-polyfill';
import store from '../../utils/store';

import ConnectionDetailsModal from '../../components/ConnectionDetailsModal';
import { ConnectionApproval } from '../../pages/ConnectionApproval';
import { GetHistoryApproval } from '../../pages/GetHistoryApproval';
import { GetProofApproval } from '../../pages/GetProofApproval';
import { NotarizeApproval } from '../../pages/NotarizeApproval';

import Icon from '../../components/Icon';
import classNames from 'classnames';
import { getConnection } from '../Background/db';

import NavHeader from '../../components/NavHeader';
import Websites from '../../pages/Websites';
import AttestationDetails from '../../pages/AttestationDetails';

const Popup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      dispatch(setActiveTab(tab || null));

      const logs = await browser.runtime.sendMessage({
        type: BackgroundActiontype.get_requests,
        data: tab?.id,
      });

      dispatch(setRequests(logs));

      await browser.runtime.sendMessage({
        type: BackgroundActiontype.get_prove_requests,
        data: tab?.id,
      });
    })();
  }, []);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request) => {
      switch (request.type) {
        case BackgroundActiontype.push_action: {
          if (
            request.data.tabId === store.getState().requests.activeTab?.id ||
            request.data.tabId === 'background'
          ) {
            store.dispatch(request.action);
          }
          break;
        }
        case BackgroundActiontype.change_route: {
          if (request.data.tabId === 'background') {
            navigate(request.route);
            break;
          }
        }
      }
    });
  }, []);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-mainDark text-text">
      <NavHeader
        pathname={location.pathname}
        host={location.search.split('=')[1]}
        navigate={navigate}
      />

      <Routes>
        <Route path="/requests/:requestId/*" element={<Request />} />
        <Route path="/notary/:requestId" element={<Notarize />} />
        <Route path="/verify/:requestId/*" element={<ProofViewer />} />
        <Route path="/verify" element={<ProofUploader />} />

        <Route path="/history" element={<History />} />
        <Route path="/history/:host" element={<History />} />
        <Route path="/websites/history/:host" element={<History />} />
        <Route path="/websites/all/history/:host" element={<History />} />
        <Route path="/home/all/bookmarks/:id" element={<BookmarkHistory />} />

        <Route
          path="/bookmarks"
          element={<Bookmarks indexStart={0} indexEnd={4} />}
        />

        <Route path="/home/all" element={<Websites allWebsites />} />
        <Route path="/websites" element={<Websites />} />

        <Route path="/requests" element={<Requests />} />
        <Route path="/custom/*" element={<RequestBuilder />} />
        <Route path="/options" element={<Options />} />

        <Route
          path="/home/attestation/:requestId"
          element={<AttestationDetails />}
        />
        <Route
          path="/home/website/:id/attestation/:requestId"
          element={<AttestationDetails />}
        />
        <Route
          path="/home/all/website/:id/attestation/:requestId"
          element={<AttestationDetails />}
        />

        <Route path="/home/all/website/:id" element={<BookmarkHistory />} />
        <Route path="/home/website/:id" element={<BookmarkHistory />} />

        <Route path="/home" element={<Home />} />

        {/* Legacy, remove if not required */}

        <Route path="/connection-approval" element={<ConnectionApproval />} />
        <Route path="/get-history-approval" element={<GetHistoryApproval />} />
        <Route path="/get-proof-approval" element={<GetProofApproval />} />
        <Route path="/notarize-approval" element={<NotarizeApproval />} />

        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </div>
  );
};

export default Popup;

function AppConnectionLogo() {
  const activeTab = useActiveTab();
  const url = useActiveTabUrl();
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    (async () => {
      if (url) {
        const isConnected: boolean | null = await getConnection(url?.origin);
        isConnected ? setConnected(true) : setConnected(false);
      }
    })();
  }, [url]);

  return (
    <div
      className="absolute right-2 flex flex-nowrap flex-row items-center gap-1 justify-center w-fit cursor-pointer"
      onClick={() => setShowConnectionDetails(true)}
    >
      <div className="flex flex-row relative bg-black border-[1px] border-black rounded-full">
        {!!activeTab?.favIconUrl ? (
          <img
            src={activeTab?.favIconUrl}
            className="h-5 rounded-full"
            alt="logo"
          />
        ) : (
          <Icon
            fa="fa-solid fa-globe"
            className="bg-white text-slate-400 rounded-full"
            size={1.25}
          />
        )}
        <div
          className={classNames(
            'absolute right-[-2px] bottom-[-2px] rounded-full h-[10px] w-[10px] border-[2px]',
            {
              'bg-green-500': connected,
              'bg-slate-500': !connected,
            },
          )}
        />
      </div>
      {showConnectionDetails && (
        <ConnectionDetailsModal
          showConnectionDetails={showConnectionDetails}
          setShowConnectionDetails={setShowConnectionDetails}
        />
      )}
    </div>
  );
}
