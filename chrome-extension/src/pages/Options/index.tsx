import React, {
  ReactElement,
  useState,
  useEffect,
  useCallback,
  MouseEvent,
  ReactNode,
} from 'react';
import {
  set,
  NOTARY_API_LS_KEY,
  PROXY_API_LS_KEY,
  MAX_SENT_LS_KEY,
  MAX_RECEIVED_LS_KEY,
  getMaxSent,
  getMaxRecv,
  getNotaryApi,
  getProxyApi,
  getLoggingFilter,
  LOGGING_FILTER_KEY,
  DEV_MODE_KEY,
  get,
  getBoolean,
} from '../../utils/storage';
import {
  NOTARY_API,
  NOTARY_PROXY,
  NOTARY_API_LOCAL,
  NOTARY_PROXY_LOCAL,
  MAX_RECV,
  MAX_SENT,
  MODE,
  Mode,
  MOTIVATION_URL,
} from '../../utils/constants';
import Modal, { ModalContent } from '../../components/Modal/Modal';
import browser, { identity } from 'webextension-polyfill';
import { LoggingLevel } from '@freysa/esper-js';

import RemoteAttestationBadge from '../../components/RemoteAttestationBadge';

import { Identity } from '@semaphore-protocol/identity';
import { bigintToHex } from '../../utils/misc';
import InfoCircle from '../../components/SvgIcons/InfoCircle';
import DropdownChevron from '../../components/SvgIcons/DropdownChevron';
import NavButton from '../../components/NavButton';
import Search from '../../components/SvgIcons/Search';
import { useNavigate } from 'react-router';
import { useUniqueRequests, useDevMode } from '../../reducers/requests';
// import { version } from '../../../package.json';
import { IdentityManager, useIdentity } from '../../reducers/identity';
import { Copy } from 'lucide-react';

export default function Options(): ReactElement {
  const [notary, setNotary] = useState(NOTARY_API);
  const [proxy, setProxy] = useState(NOTARY_PROXY);
  const [maxSent, setMaxSent] = useState(MAX_SENT);
  const [maxReceived, setMaxReceived] = useState(MAX_RECV);
  const [loggingLevel, setLoggingLevel] = useState<LoggingLevel>('Info');

  const [dirty, setDirty] = useState(false);
  const [shouldReload, setShouldReload] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [showReloadModal, setShowReloadModal] = useState(false);
  const navigate = useNavigate();
  const requests = useUniqueRequests();
  const [devMode, setDevMode] = useDevMode();

  const [identity, setIdentity] = useIdentity();

  const identityManager = new IdentityManager();
  useEffect(() => {
    (async () => {
      setNotary((await getNotaryApi()) || NOTARY_API);
      setProxy((await getProxyApi()) || NOTARY_PROXY);
      setMaxReceived((await getMaxRecv()) || MAX_RECV);
      setMaxSent((await getMaxSent()) || MAX_SENT);
      setLoggingLevel((await getLoggingFilter()) || 'Info');
      setDevMode(await getBoolean(DEV_MODE_KEY));
    })();
  }, [advanced]);

  const onSave = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, skipCheck = false) => {
      if (!skipCheck && shouldReload) {
        setShowReloadModal(true);
        return;
      }
      await set(NOTARY_API_LS_KEY, notary);
      await set(PROXY_API_LS_KEY, proxy);
      await set(MAX_SENT_LS_KEY, maxSent.toString());
      await set(MAX_RECEIVED_LS_KEY, maxReceived.toString());
      await set(LOGGING_FILTER_KEY, loggingLevel);
      setDirty(false);
    },
    [notary, proxy, maxSent, maxReceived, loggingLevel, shouldReload],
  );

  const onSaveAndReload = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      await onSave(e, true);
      browser.runtime.reload();
    },
    [onSave],
  );

  const onAdvanced = useCallback(() => {
    setAdvanced(!advanced);
  }, [advanced]);

  // const toggleDevMode = useCallback(() => {
  //   setDevMode(!devMode);
  //   set(DEV_MODE_KEY, !devMode);
  // }, [devMode]);

  const handleCopy = useCallback(() => {
    if (identity?.privateKey) {
      navigator.clipboard.writeText(identityManager.getPrivateKey(identity));
    }
  }, [identity?.privateKey]);

  return (
    <div className="flex flex-col flex-nowrap flex-grow px-4 py-5 overflow-y-auto bg-mainDark">
      {showReloadModal && (
        <Modal
          className="flex flex-col items-center text-base cursor-default justify-center !w-auto mx-4 my-[50%] p-4 gap-4 bg-secDark"
          onClose={() => setShowReloadModal(false)}
        >
          <ModalContent className="flex flex-col w-full gap-4 items-center text-sm text-textLight font-medium justify-center">
            Modifying your logging will require your extension to reload. Do you
            want to proceed?
          </ModalContent>
          <div className="flex flex-row justify-end items-center gap-2 w-full">
            <div
              onClick={() => setShowReloadModal(false)}
              className="cursor-pointer flex items-center gap-2 text-textGray text-sm font-medium py-[6px] px-6 rounded-lg hover:opacity-70"
            >
              No
            </div>
            <button
              onClick={(e) => onSaveAndReload(e)}
              className="cursor-pointer flex items-center gap-2 bg-buttonLight hover:bg-buttonLightHover text-buttonLightText text-sm font-medium py-[6px] px-6 rounded-lg"
            >
              Yes
            </button>
          </div>
        </Modal>
      )}

      <div className="flex flex-col gap-8">
        {identity && (
          <InputField
            label="Your public key"
            placeholder="Public key"
            value={identityManager.getShortenedPublicKey(identity)}
            type="text"
            readOnly
            multiline
            LabelIcon={
              <div
                onClick={() => {
                  chrome.tabs.create({
                    url: MOTIVATION_URL,
                  });
                }}
                className="cursor-pointer"
              >
                <InfoCircle />
              </div>
            }
          />
        )}

        <div className="text-center">
          <button
            className={`cursor-pointer text-sm font-medium py-[10px] px-2 rounded-lg text-brand text-center w-full bg-button flex items-center justify-center gap-2 ${
              dirty
                ? 'hover:bg-buttonHover cursor-pointer'
                : 'hover:bg-buttonHover opacity-70'
            }`}
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
            Copy my private key
          </button>
        </div>

        <InputField
          label="Notary API"
          placeholder="https://api.tlsnotary.org"
          value={notary}
          type="text"
          onChange={(e) => {
            setNotary(e.target.value);
            setDirty(true);
          }}
        />
        <InputField
          label="Proxy API"
          placeholder="https://proxy.tlsnotary.org"
          value={proxy}
          type="text"
          onChange={(e) => {
            setProxy(e.target.value);
            setDirty(true);
          }}
        />

        {/* <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="devmode"
            className="cursor-pointer"
            onChange={toggleDevMode}
            checked={devMode}
          />
          <label htmlFor="devmode" className="font-semibold cursor-pointer">
            Enable dev mode
          </label> 
        </div> */}
      </div>

      <div className="flex flex-row mt-8 mx-auto">
        <div
          className="cursor-pointer text-brand text-sm font-medium text-center hover:text-brandHover flex items-center gap-1"
          onClick={onAdvanced}
        >
          Advanced
          <DropdownChevron reverse={advanced} />
        </div>
      </div>

      {!advanced ? (
        <></>
      ) : (
        <div className="flex flex-col w-full mt-8">
          <div className="flex flex-col gap-8">
            <NavButton
              ImageIcon={<Search />}
              title="Notarize requests on current page"
              subtitle={`${requests.length} ${requests.length === 1 ? 'request' : 'requests'} captured`}
              onClick={() => navigate('/requests')}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="localhost"
                className="cursor-pointer"
                onChange={(e) => {
                  if (e.target.checked) {
                    setNotary(NOTARY_API_LOCAL);
                    setProxy(NOTARY_PROXY_LOCAL);
                  } else {
                    setNotary(NOTARY_API);
                    setProxy(NOTARY_PROXY);
                  }
                  setDirty(true);
                }}
              />
              <label
                htmlFor="localhost"
                className="text-sm cursor-default flex items-center text-textLight"
              >
                Use localhost notary
              </label>
            </div>

            <div className="flex flex-col flex-nowrap gap-1">
              <div className="text-sm cursor-default flex items-center text-textLight font-medium">
                Logging Level
              </div>
              <select
                className="select !bg-inputBackground text-sm !font-medium !border !border-r-[1px] !border-b-[1px] !border-inputBackground hover:opacity-80 rounded-md !px-3 !py-2 !text-textLight"
                onChange={(e) => {
                  setLoggingLevel(e.target.value as LoggingLevel);
                  setDirty(true);
                  setShouldReload(true);
                }}
                value={loggingLevel}
              >
                <option value="Error">Error</option>
                <option value="Warn">Warn</option>
                <option value="Info">Info</option>
                <option value="Debug">Debug</option>
                <option value="Trace">Trace</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-row flex-nowrap justify-center gap-2 mt-8">
        <button
          className={`cursor-pointer text-sm font-medium py-[10px] px-2 rounded-lg text-brand text-center w-full bg-button ${
            dirty
              ? 'hover:bg-buttonHover cursor-pointer'
              : 'hover:bg-buttonHover opacity-70'
          }`}
          disabled={!dirty}
          onClick={onSave}
        >
          Save Changes
        </button>
      </div>
      <div className="flex justify-center mt-auto py-4">
        <RemoteAttestationBadge />
      </div>
    </div>
  );
}

function InputField(props: {
  label?: string;
  LabelIcon?: ReactNode;
  placeholder?: string;
  value?: string;
  type?: string;
  min?: number;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const {
    label,
    LabelIcon,
    placeholder,
    value,
    type,
    min,
    onChange,
    multiline,
    readOnly,
  } = props;

  return (
    <div className="flex flex-col flex-nowrap gap-1">
      <div className="text-sm cursor-default flex items-center  text-text font-inter font-medium leading-[20px]">
        {label}
        {LabelIcon && <span>&nbsp;</span>}
        {LabelIcon}
      </div>
      <textarea
        onChange={onChange}
        className="flex w-full text-sm rounded-md border border-inputBackground resize-none bg-inputBackground px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-text"
        value={value}
        placeholder={placeholder}
        id="search"
        rows={multiline ? 2 : 1}
        readOnly={readOnly}
      />
    </div>
  );
}
