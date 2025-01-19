import { BackgroundActiontype, RequestLog } from '../entries/Background/rpc';
import { EXPLORER_API } from './constants';
import createPlugin, {
  CallContext,
  ExtismPluginOptions,
  Plugin,
} from '@extism/extism';
import browser from 'webextension-polyfill';
import NodeCache from 'node-cache';
import { getNotaryApi, getProxyApi } from './storage';
import { minimatch } from 'minimatch';
import { getCookiesByHost, getHeadersByHost } from '../entries/Background/db';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PROVIDERS } from './constants';
const charwise = require('charwise');

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function reqTypeToName(type: string) {
  switch (type) {
    case 'xmlhttprequest':
      return 'XHR';

    default:
      return type;
  }
}

export function urlify(
  text: string,
  params?: [string, string, boolean?][],
): URL | null {
  try {
    const url = new URL(text);

    if (params) {
      params.forEach(([k, v]) => {
        url.searchParams.append(k, v);
      });
    }

    return url;
  } catch (e) {
    return null;
  }
}

export function devlog(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

export function download(filename: string, content: string) {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(content),
  );
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export async function upload(filename: string, content: string) {
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([content], { type: 'application/json' }),
    filename,
  );
  const response = await fetch(`${EXPLORER_API}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload');
  }
  const data = await response.json();
  return data;
}

export const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error(e);
  }
};

export async function replayRequest(req: RequestLog): Promise<string> {
  const options = {
    method: req.method,
    headers: req.requestHeaders.reduce(
      // @ts-ignore
      (acc: { [key: string]: string }, h: chrome.webRequest.HttpHeader) => {
        if (typeof h.name !== 'undefined' && typeof h.value !== 'undefined') {
          acc[h.name] = h.value;
        }
        return acc;
      },
      {},
    ),
    body: req.requestBody,
  };

  if (req?.formData) {
    const formData = new URLSearchParams();
    Object.entries(req.formData).forEach(([key, values]) => {
      values.forEach((v) => formData.append(key, v));
    });
    options.body = formData.toString();
  }

  // @ts-ignore
  const resp = await fetch(req.url, options);
  return extractBodyFromResponse(resp);
}

export const extractBodyFromResponse = async (
  resp: Response,
): Promise<string> => {
  const contentType =
    resp.headers.get('content-type') || resp.headers.get('Content-Type');

  if (contentType?.includes('application/json')) {
    return resp.text();
  } else if (contentType?.includes('text')) {
    return resp.text();
  } else if (contentType?.includes('image')) {
    return resp.blob().then((blob) => blob.text());
  } else {
    return resp.blob().then((blob) => blob.text());
  }
};

export const sha256 = async (data: string) => {
  const encoder = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};

const VALID_HOST_FUNCS: { [name: string]: string } = {
  redirect: 'redirect',
  notarize: 'notarize',
};

export type StepConfig = {
  title: string;
  description?: string;
  cta: string;
  action: string;
  prover?: boolean;
};

export type PluginConfig = {
  title: string;
  description: string;
  icon?: string;
  steps?: StepConfig[];
  hostFunctions?: string[];
  cookies?: string[];
  headers?: string[];
  requests: { method: string; url: string }[];
  notaryUrls?: string[];
  proxyUrls?: string[];
};

export type PluginMetadata = {
  origin: string;
  filePath: string;
} & { [k: string]: string };

export const assert = (expr: any, msg = 'unknown error') => {
  if (!expr) throw new Error(msg);
};

export const hexToArrayBuffer = (hex: string) =>
  new Uint8Array(Buffer.from(hex, 'hex')).buffer;

export const cacheToMap = (cache: NodeCache) => {
  const keys = cache.keys();
  return keys.reduce((acc: { [k: string]: string }, key) => {
    acc[key] = cache.get(key) || '';
    return acc;
  }, {});
};

export function safeParseJSON(data?: string | null) {
  try {
    return JSON.parse(data!);
  } catch (e) {
    return null;
  }
}

export function decodeTLSData(hexString: string) {
  // Remove any whitespace from the hex string
  hexString = hexString.replace(/\s/g, '');

  // Decode the hex string to a regular string
  let decodedString = '';
  for (let i = 0; i < hexString.length; i += 2) {
    decodedString += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
  }

  // Split the decoded string into request and response
  const [request, response_header, response_body] =
    decodedString.split('\r\n\r\n');

  return {
    request,
    response: response_body, // Split headers and body
  };
}

export function extractHostFromUrl(url: string) {
  const u = new URL(url);
  return u.host;
}

export function extractPathFromUrl(url: string) {
  const u = new URL(url);
  return u.pathname.substring(1);
}

export function bigintToHex(bigint?: bigint) {
  if (!bigint) return '';
  return `0x${bigint.toString(16)}`;
}
export async function getNotaryConfig() {
  const config = PROVIDERS;
  return config;
}

export function urlToRegex(url: string): string {
  // Escape special regex characters
  let regexPattern = url.replace(/[-\/\\^$.*+?()[\]{}|]/g, '\\$&');

  // Replace dynamic segments (e.g., numeric IDs)
  // Here we assume segments like '12345' are numeric
  regexPattern = regexPattern.replace(/\\d+/g, '\\d+'); // Adjust as needed for other patterns

  // Remove query string if present
  regexPattern = regexPattern.split('?')[0];
  // Allow for optional query strings
  regexPattern = `^${regexPattern}.*$`;

  return regexPattern;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
