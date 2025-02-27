import browser from 'webextension-polyfill';
import { ContentScriptRequest, ContentScriptTypes, RPCServer } from './rpc';
import { BackgroundActiontype, RequestHistory } from '../Background/rpc';
import { urlify } from '../../utils/misc';
import { Bookmark } from '../../reducers/bookmarks';
import { sleep } from '../../utils/misc';
// Custom console log
const originalConsoleLog = console.log;
console.log = function (...args) {
  originalConsoleLog.apply(console, ['[🌎Esper]', ...args]);
};

(async () => {
  loadScript('content.bundle.js');

  const server = new RPCServer();
  server.on(
    ContentScriptTypes.load_page,
    async (request: ContentScriptRequest<{ url: string }>) => {
      const { url } = request.params || {};

      if (!url) throw new Error('params must include url.');

      if (window.location.href === url) {
        window.location.reload();
      }
    },
  );

  server.on(ContentScriptTypes.connect, async () => {
    console.log('ContentScriptTypes connect');

    const connected = await browser.runtime.sendMessage({
      type: BackgroundActiontype.connect_request,
      data: {
        ...getPopupData(),
      },
    });

    if (!connected) throw new Error('user rejected.');

    return connected;
  });

  server.on(
    ContentScriptTypes.get_history,
    async (
      request: ContentScriptRequest<{
        method: string;
        url: string;
        metadata?: { [k: string]: string };
      }>,
    ) => {
      const {
        method: filterMethod,
        url: filterUrl,
        metadata,
      } = request.params || {};
      console.log('ContentScriptTypes get_history');
      if (!filterMethod || !filterUrl)
        throw new Error('params must include method and url.');

      const response: RequestHistory[] = await browser.runtime.sendMessage({
        type: BackgroundActiontype.get_history_request,
        data: {
          ...getPopupData(),
          method: filterMethod,
          url: filterUrl,
          metadata,
        },
      });

      return response;
    },
  );

  server.on(
    ContentScriptTypes.get_proof,
    async (request: ContentScriptRequest<{ id: string }>) => {
      const { id } = request.params || {};

      if (!id) throw new Error('params must include id.');

      const proof = await browser.runtime.sendMessage({
        type: BackgroundActiontype.get_proof_request,
        data: {
          ...getPopupData(),
          id,
        },
      });

      return proof;
    },
  );

  server.on(
    ContentScriptTypes.notarize,
    async (
      request: ContentScriptRequest<{
        url: string;
        method?: string;
        headers?: { [key: string]: string };
        metadata?: { [key: string]: string };
        body?: string;
        notaryUrl?: string;
        websocketProxyUrl?: string;
      }>,
    ) => {
      const {
        url,
        method,
        headers,
        body,
        notaryUrl,
        websocketProxyUrl,
        metadata,
      } = request.params || {};

      if (!url || !urlify(url)) throw new Error('invalid url.');

      const proof = await browser.runtime.sendMessage({
        type: BackgroundActiontype.notarize_request,
        data: {
          ...getPopupData(),
          url,
          method,
          headers,
          body,
          notaryUrl,
          websocketProxyUrl,
          metadata,
        },
      });

      return proof;
    },
  );

  // server.on(
  //   ContentScriptTypes.install_plugin,
  //   async (
  //     request: ContentScriptRequest<{
  //       url: string;
  //       metadata?: { [k: string]: string };
  //     }>,
  //   ) => {
  //     const { url, metadata } = request.params || {};

  //     if (!url) throw new Error('params must include url.');

  //     const response: RequestHistory[] = await browser.runtime.sendMessage({
  //       type: BackgroundActiontype.install_plugin_request,
  //       data: {
  //         ...getPopupData(),
  //         url,
  //         metadata,
  //       },
  //     });

  //     return response;
  //   },
  // );

  // server.on(
  //   ContentScriptTypes.get_plugins,
  //   async (
  //     request: ContentScriptRequest<{
  //       url: string;
  //       origin?: string;
  //       metadata?: { [k: string]: string };
  //     }>,
  //   ) => {
  //     const {
  //       url: filterUrl,
  //       origin: filterOrigin,
  //       metadata,
  //     } = request.params || {};

  //     if (!filterUrl) throw new Error('params must include url.');

  //     const response = await browser.runtime.sendMessage({
  //       type: BackgroundActiontype.get_plugins_request,
  //       data: {
  //         ...getPopupData(),
  //         url: filterUrl,
  //         origin: filterOrigin,
  //         metadata,
  //       },
  //     });

  //     return response;
  //   },
  // );

  // server.on(
  //   ContentScriptTypes.run_plugin,
  //   async (request: ContentScriptRequest<{ hash: string }>) => {
  //     const { hash } = request.params || {};

  //     if (!hash) throw new Error('params must include hash');

  //     const response = await browser.runtime.sendMessage({
  //       type: BackgroundActiontype.run_plugin_request,
  //       data: {
  //         ...getPopupData(),
  //         hash,
  //       },
  //     });

  //     return response;
  //   },
  // );
})();

function loadScript(filename: string) {
  const url = browser.runtime.getURL(filename);
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', url);
  document.body.appendChild(script);
}

function getPopupData() {
  return {
    origin: window.origin,
    position: {
      left: window.screen.width / 2 - 240,
      top: window.screen.height / 2 - 300,
    },
  };
}

async function findAndClickElement(selector: string) {
  const maxRetries = 4;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const element: HTMLLinkElement | null = document.querySelector(selector);

    if (element) {
      element.click();
      return;
    }

    console.log(
      `🟡 Attempt ${attempt}/${maxRetries}: Element not found, retrying...`,
    );
    await sleep(1000);
  }

  console.log(
    `❌ Failed to find element after ${maxRetries} attempts: ${selector}`,
  );
}

async function performPreNotarizationAction() {
  const host = window.location.host;
  const request: Bookmark | undefined = await browser.runtime.sendMessage({
    type: BackgroundActiontype.get_notarization_status,
    data: {
      tab_host: host,
    },
  });
  console.log('request', request);

  if (!request) return console.log('No notarization to run. 😴');

  console.log('request.actionSelectors', request.actionSelectors);

  // const element = request.actionSelectors?.[0];

  // if (!element)
  //   return console.log(
  //     '🟡 A notarization is ongoing but no action to perform was found.',
  //   );

  // console.log(`Redirecting...`);
  // findAndClickElement(element);

  // Process all selectors sequentially

  if (request.actionSelectors) {
    for (const selector of request.actionSelectors) {
      if (!selector) {
        return console.log(
          '🟡 A notarization is ongoing but no action to perform was found.',
        );
      }
      await findAndClickElement(selector);
    }
  }
}

// Run the script when the page is fully loaded
window.addEventListener('load', performPreNotarizationAction);
