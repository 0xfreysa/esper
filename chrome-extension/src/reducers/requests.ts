import {
  type RequestLog,
  type RequestHistory,
} from '../entries/Background/rpc';
import { useSelector } from 'react-redux';
import { AppRootState } from './index';
import deepEqual from 'fast-deep-equal';
import { getNotaryApi, getProxyApi } from '../utils/storage';
import { NotaryRequest } from '../utils/types';
import { BackgroundActiontype } from '../entries/Background/rpc';
import browser from 'webextension-polyfill';
import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { getBoolean, EXTENSION_ENABLED, DEV_MODE_KEY } from '../utils/storage';
enum ActionType {
  '/requests/setRequests' = '/requests/setRequests',
  '/requests/addRequest' = '/requests/addRequest',
  '/requests/setActiveTab' = '/requests/setActiveTab',
}

type Action<payload> = {
  type: ActionType;
  payload?: payload;
  error?: boolean;
  meta?: any;
};

type State = {
  map: {
    [requestId: string]: RequestLog;
  };
  activeTab: chrome.tabs.Tab | null;
};

const initialState: State = {
  map: {},
  activeTab: null,
};

const rejected_types = ['script', 'websocket', 'image', 'font'];

export const setRequests = (requests: RequestLog[]): Action<RequestLog[]> => ({
  type: ActionType['/requests/setRequests'],
  payload: requests,
});

export const notarizeRequest = (options: NotaryRequest) => async () => {
  console.log('notarizeRequest', options);
  const notaryUrl = await getNotaryApi();
  const websocketProxyUrl = await getProxyApi();

  chrome.runtime.sendMessage<any, string>({
    type: BackgroundActiontype.prove_request_start,
    data: {
      url: options.url,
      method: options.method,
      headers: options.headers,
      body: options.body,
      notaryUrl,
      websocketProxyUrl,
    },
  });
};

export const setActiveTab = (
  activeTab: browser.Tabs.Tab | null,
): Action<browser.Tabs.Tab | null> => ({
  type: ActionType['/requests/setActiveTab'],
  payload: activeTab,
});

export const addRequest = (request: RequestLog): Action<RequestLog> => ({
  type: ActionType['/requests/addRequest'],
  payload: request,
});

export default function requests(
  state = initialState,
  action: Action<any>,
): State {
  switch (action.type) {
    case ActionType['/requests/setRequests']:
      return {
        ...state,
        map: {
          ...(action?.payload || []).reduce(
            (acc: { [requestId: string]: RequestLog }, req: RequestLog) => {
              if (req) {
                acc[req.requestId] = req;
              }
              return acc;
            },
            {},
          ),
        },
      };
    case ActionType['/requests/setActiveTab']:
      return {
        ...state,
        activeTab: action.payload,
      };
    case ActionType['/requests/addRequest']:
      return {
        ...state,
        map: {
          ...state.map,
          [action.payload.requestId]: action.payload,
        },
      };
    default:
      return state;
  }
}

export const useRequests = (): RequestLog[] => {
  return useSelector((state: AppRootState) => {
    return Object.values(state.requests.map);
  }, deepEqual);
};

export const useUniqueRequests = (): RequestLog[] => {
  const requests = useRequests();
  const [uniqueRequests, setUniqueRequests] = useState<RequestLog[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      if (!history) return;

      const requestsSet = new Map<string, RequestLog>();

      requests.forEach(async (request) => {
        if (rejected_types.includes(request.type)) return;
        requestsSet.set(request.url, request);
      });

      setUniqueRequests(Array.from(requestsSet.values()).reverse());
    }
    fetchHistory();
  }, [history, requests]);

  return uniqueRequests;
};

export const useRequest = (requestId?: string): RequestLog | null => {
  return useSelector((state: AppRootState) => {
    return requestId ? state.requests.map[requestId] : null;
  }, deepEqual);
};

export const useActiveTab = (): chrome.tabs.Tab | null => {
  return useSelector((state: AppRootState) => {
    return state.requests.activeTab;
  }, deepEqual);
};

export const useActiveTabUrl = (): URL | null => {
  return useSelector((state: AppRootState) => {
    const activeTab = state.requests.activeTab;
    return activeTab?.url ? new URL(activeTab.url) : null;
  }, deepEqual);
};

export const useExtensionEnabled = (): [
  boolean,
  Dispatch<SetStateAction<boolean>>,
] => {
  const [isEnabled, setIsEnabled] = useState(false);
  useEffect(() => {
    (async () => {
      const storage = await chrome.storage.sync.get(EXTENSION_ENABLED);
      const isEnabled = storage[EXTENSION_ENABLED];
      if (isEnabled === undefined) {
        setIsEnabled(true);
        chrome.storage.sync.set({ [EXTENSION_ENABLED]: true });
      } else setIsEnabled(isEnabled);
    })();
  }, []);
  return [isEnabled, setIsEnabled];
};

export const useDevMode = (): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [devMode, setDevMode] = useState(false);
  useEffect(() => {
    (async () => {
      setDevMode(await getBoolean(DEV_MODE_KEY));
    })();
  }, []);
  return [devMode, setDevMode];
};
