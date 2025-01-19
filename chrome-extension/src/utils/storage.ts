import { LoggingLevel } from '@freysa/esper-js';

export const NOTARY_API_LS_KEY = 'notary-api';
export const PROXY_API_LS_KEY = 'proxy-api';
export const MAX_SENT_LS_KEY = 'max-sent';
export const MAX_RECEIVED_LS_KEY = 'max-received';
export const LOGGING_FILTER_KEY = 'logging-filter-2';
export const DEV_MODE_KEY = 'dev-mode';
export const EXTENSION_ENABLED = 'enable-extension';

import { NOTARY_API, NOTARY_PROXY } from './constants';

export async function set(key: string, value: any) {
  return chrome.storage.sync.set({ [key]: value });
}

export async function get(key: string, defaultValue?: any) {
  return chrome.storage.sync
    .get(key)
    .then((json: any) => json[key] || defaultValue)
    .catch(() => defaultValue);
}

export async function getBoolean(key: string) {
  const value = await get(key);
  return value === true || value === 'true';
}

export async function getMaxSent() {
  return parseInt(await get(MAX_SENT_LS_KEY, '4096'));
}

export async function getMaxRecv() {
  return parseInt(await get(MAX_RECEIVED_LS_KEY, '16384'));
}

export async function getNotaryApi() {
  return await get(NOTARY_API_LS_KEY, NOTARY_API);
}

export async function getProxyApi() {
  return await get(PROXY_API_LS_KEY, NOTARY_PROXY);
}

export async function getLoggingFilter(): Promise<LoggingLevel> {
  return await get(LOGGING_FILTER_KEY, 'Info');
}
