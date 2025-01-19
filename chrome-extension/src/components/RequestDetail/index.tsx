import React, {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { notarizeRequest, useRequest } from '../../reducers/requests';
import { useDispatch } from 'react-redux';
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import NavigateWithParams from '../NavigateWithParams';
import {
  set,
  get,
  MAX_SENT_LS_KEY,
  MAX_RECEIVED_LS_KEY,
  getNotaryApi,
  getProxyApi,
  getMaxRecv,
  getMaxSent,
} from '../../utils/storage';
import { MAX_RECV, MAX_SENT } from '../../utils/constants';
import { urlify } from '../../utils/misc';

type Props = {
  requestId: string;
};

export default function RequestDetail(props: Props): ReactElement {
  const request = useRequest(props.requestId);
  const navigate = useNavigate();

  const dispatch = useDispatch();

  const notarize = useCallback(async () => {
    const req = request;
    if (!req) return;
    const hostname = urlify(req.url)?.hostname;
    const notaryUrl = await getNotaryApi();
    const websocketProxyUrl = await getProxyApi();

    const headers: { [k: string]: string } = req.requestHeaders.reduce(
      (acc: any, h) => {
        acc[h.name] = h.value;
        return acc;
      },
      { Host: hostname },
    );

    //TODO: for some reason, these needs to be override to work
    headers['Accept-Encoding'] = 'identity';
    headers['Connection'] = 'close';

    dispatch(
      // @ts-ignore
      notarizeRequest({
        url: req.url,
        method: req.method,
        headers,
        body: req.requestBody,
        notaryUrl,
        websocketProxyUrl,
      }),
    );
    navigate(`/home?opentab=history`);
  }, [request]);

  if (!request) return <></>;

  return (
    <>
      {' '}
      <div className="my-4 mx-4">
        <button
          className="w-full cursor-pointer bg-button hover:bg-buttonHover text-buttonText text-sm font-medium py-[10px] px-8 rounded-lg mx-auto block"
          onClick={notarize}
        >
          Notarize
        </button>
      </div>
      <div className="flex flex-row flex-nowrap relative items-center">
        <RequestDetailsHeaderTab path="/headers">
          Headers
        </RequestDetailsHeaderTab>
        <RequestDetailsHeaderTab path="/payloads">
          Payload
        </RequestDetailsHeaderTab>
        <RequestDetailsHeaderTab path="/response">
          Response
        </RequestDetailsHeaderTab>
        {/* <RequestDetailsHeaderTab path="/advanced">
          Advanced
        </RequestDetailsHeaderTab> */}
      </div>
      <Routes>
        <Route
          path="headers"
          element={<RequestHeaders requestId={props.requestId} />}
        />
        <Route
          path="payloads"
          element={<RequestPayload requestId={props.requestId} />}
        />
        <Route
          path="response"
          element={<WebResponse requestId={props.requestId} />}
        />
        {/* <Route path="advanced" element={<AdvancedOptions />} /> */}
        <Route path="/" element={<NavigateWithParams to="/headers" />} />
      </Routes>
    </>
  );
}

function RequestDetailsHeaderTab(props: {
  children: ReactNode;
  path: string;
}): ReactElement {
  const loc = useLocation();
  const params = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const selected = loc.pathname.includes(props.path);
  return (
    <button
      className={`px-4 text-sm font-medium  text-brand flex-1 pb-2 ${
        selected ? 'border-b-2 border-brand' : ''
      }`}
      onClick={() => navigate('/requests/' + params.requestId + props.path)}
    >
      {props.children}
    </button>
  );
}

function AdvancedOptions(): ReactElement {
  const [maxSent, setMaxSent] = useState(MAX_SENT);
  const [maxRecv, setMaxRecv] = useState(MAX_RECV);

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      setMaxRecv((await getMaxRecv()) || MAX_RECV);
      setMaxSent((await getMaxSent()) || MAX_SENT);
    })();
  }, []);

  const onSave = useCallback(async () => {
    await set(MAX_RECEIVED_LS_KEY, maxRecv.toString());
    await set(MAX_SENT_LS_KEY, maxSent.toString());
    setDirty(false);
  }, [maxSent, maxRecv]);

  return (
    <div className="flex flex-col flex-nowrap py-1 px-2 gap-2">
      <div className="font-semibold">Max Sent Data</div>
      <input
        type="number"
        className="input border"
        value={maxSent}
        min={0}
        onChange={(e) => {
          setMaxSent(parseInt(e.target.value));
          setDirty(true);
        }}
      />
      <div className="font-semibold">Max Received Data</div>
      <input
        type="number"
        className="input border"
        value={maxRecv}
        min={0}
        onChange={(e) => {
          setMaxRecv(parseInt(e.target.value));
          setDirty(true);
        }}
      />
      <div className="flex flex-row flex-nowrap justify-end gap-2 p-2">
        <button
          className="button !bg-primary/[0.9] hover:bg-primary/[0.8] active:bg-primary !text-white"
          disabled={!dirty}
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function RequestPayload(props: Props): ReactElement {
  const data = useRequest(props.requestId);
  const [url, setUrl] = useState<URL | null>();
  const [json, setJson] = useState<any | null>();
  const [formData, setFormData] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (data?.formData) {
      const params = new URLSearchParams();
      Object.entries(data.formData).forEach(([key, values]) => {
        values.forEach((v) => params.append(key, v));
      });
      setFormData(params);
    }
  }, [data?.formData]);

  useEffect(() => {
    try {
      setUrl(new URL(data!.url));
    } catch (e) {}

    try {
      if (data?.requestBody) {
        setJson(JSON.parse(data.requestBody));
      }
    } catch (e) {
      console.error(e);
      setJson(null);
    }
  }, [data]);

  return (
    <div className="flex flex-col flex-nowrap overflow-y-auto">
      <table className="  text-sm  border border-darkGrayOutline border-collapse table-fixed w-full">
        {!!url?.searchParams.size && (
          <>
            <thead className="bg-secDark">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border border-darkGrayOutline py-1 px-2"
                >
                  Query String Parameters
                </td>
              </tr>
            </thead>
            <tbody>
              {Array.from(url.searchParams).map((param) => {
                return (
                  <tr
                    key={param[0]}
                    className="  text-sm  border -b border-darkGrayOutline"
                  >
                    <td className="  text-sm  border  border-darkGrayOutline font-bold align-top py-1 px-2 break-all">
                      {param[0]}
                    </td>
                    <td className="  text-sm  border  border-darkGrayOutline break-all align-top py-1 px-2">
                      {param[1]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </>
        )}
        {!!json && (
          <>
            <thead className="bg-secDark">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border  border-darkGrayOutline py-1 px-2 bg-secDark font-bold"
                >
                  Body Payload
                </td>
              </tr>
            </thead>
            <tr>
              <td colSpan={2}>
                <textarea
                  rows={10}
                  className="w-full bg-inputBackground p-2 text-xs break-all h-full outline-none font-mono"
                  value={JSON.stringify(json, null, 2)}
                ></textarea>
              </td>
            </tr>
          </>
        )}
        {!!formData && (
          <>
            <thead className="bg-secDark">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border  border-darkGrayOutline py-1 px-2 bg-secDark font-bold"
                >
                  Form Data
                </td>
              </tr>
            </thead>
            <tr>
              <td colSpan={2}>
                <textarea
                  rows={10}
                  className="w-full bg-inputBackground p-2 text-xs break-all h-full outline-none font-mono"
                  value={formData.toString()}
                ></textarea>
              </td>
            </tr>
          </>
        )}
        {!json && !!data?.requestBody && (
          <>
            <thead className="bg-secDark">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border  border-darkGrayOutline py-1 px-2 bg-secDark font-bold"
                >
                  Body
                </td>
              </tr>
            </thead>
            <tr>
              <td colSpan={2}>
                <textarea
                  rows={6}
                  className="w-full bg-inputBackground p-2 text-xs break-all h-full outline-none font-mono"
                  value={data?.requestBody}
                ></textarea>
              </td>
            </tr>
          </>
        )}
      </table>
    </div>
  );
}

function WebResponse(props: Props): ReactElement {
  const data = useRequest(props.requestId);
  const [response, setResponse] = useState<Response | null>(null);
  const [json, setJSON] = useState<any | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [formData, setFormData] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (data?.formData) {
      const params = new URLSearchParams();
      Object.entries(data.formData).forEach(([key, values]) => {
        values.forEach((v) => params.append(key, v));
      });
      setFormData(params);
    }
  }, [data?.formData]);

  const replay = useCallback(async () => {
    if (!data) return null;

    const options = {
      method: data.method,
      headers: data.requestHeaders.reduce(
        // @ts-ignore
        (acc: { [key: string]: string }, h: chrome.webRequest.HttpHeader) => {
          if (typeof h.name !== 'undefined' && typeof h.value !== 'undefined') {
            acc[h.name] = h.value;
          }
          return acc;
        },
        {},
      ),
      body: data?.requestBody,
    };

    if (formData) {
      options.body = formData.toString();
    }

    // @ts-ignore
    const resp = await fetch(data.url, options);
    setResponse(resp);

    const contentType =
      resp?.headers.get('content-type') || resp?.headers.get('Content-Type');

    if (contentType?.includes('application/json')) {
      resp.json().then((json) => {
        if (json) {
          setJSON(json);
        }
      });
    } else if (contentType?.includes('text')) {
      resp.text().then((_text) => {
        if (_text) {
          setText(_text);
        }
      });
    } else if (contentType?.includes('image')) {
      resp.blob().then((blob) => {
        if (blob) {
          setImg(URL.createObjectURL(blob));
        }
      });
    } else {
      resp
        .blob()
        .then((blob) => blob.text())
        .then((_text) => {
          if (_text) {
            setText(_text);
          }
        });
    }
  }, [data, formData]);

  return (
    <div className="flex flex-col flex-nowrap overflow-y-auto">
      {!response && (
        <div className="p-2 m-4">
          <button
            onClick={replay}
            className="cursor-pointer flex items-center gap-2 bg-buttonLight hover:bg-buttonLightHover text-buttonLightText text-sm font-medium py-[6px] px-6 rounded-lg"
          >
            Fetch Response
          </button>
        </div>
      )}
      <table className="  text-sm  border  border-darkGrayOutline border-collapse table-fixed w-full">
        {!!response?.headers && (
          <>
            <thead className="bg-slate-200">
              <tr>
                <td
                  colSpan={2}
                  className=" text-sm  border border-darkGrayOutline py-1 px-2 bg-buttonLight font-bold"
                >
                  Headers
                </td>
              </tr>
            </thead>
            <tbody>
              {Array.from(response.headers.entries()).map(([name, value]) => {
                return (
                  <tr className="  text-sm  border -b border-slate-200">
                    <td className="  text-sm  border  border-darkGrayOutline font-bold align-top py-1 px-2 whitespace-nowrap">
                      {name}
                    </td>
                    <td className="  text-sm  border  border-darkGrayOutline break-all align-top py-1 px-2">
                      {value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </>
        )}
        {!!json && (
          <>
            <thead className="bg-secDark">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border  border-darkGrayOutline py-1 px-2 bg-secDark font-bold"
                >
                  <button
                    className="cursor-pointer right-2 bg-buttonLight text-white px-6 py-[6px] my-2 text-xs rounded mr-2"
                    // className="cursor-pointer flex items-center gap-2 bg-buttonLight hover:bg-buttonLightHover text-buttonLightText text-sm font-medium py-[6px] px-6 rounded-lg"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(json, null, 2),
                      );
                    }}
                  >
                    Copy
                  </button>
                  JSON
                </td>
              </tr>
            </thead>
            <tr>
              <td colSpan={2} className="relative">
                <textarea
                  rows={16}
                  className="w-full bg-inputBackground p-2 text-xs break-all h-full outline-none font-mono"
                  value={JSON.stringify(json, null, 2)}
                  readOnly
                ></textarea>
              </td>
            </tr>
          </>
        )}
        {!!text && (
          <>
            <thead className="bg-slate-200">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border  border-darkGrayOutline py-1 px-2"
                >
                  <button
                    className=" right-2 bg-slate-500 text-white px-2 py-1 text-xs rounded"
                    onClick={() => {
                      navigator.clipboard.writeText(text);
                    }}
                  >
                    Copy
                  </button>
                  Text
                </td>
              </tr>
            </thead>
            <tr>
              <td colSpan={2}>
                <textarea
                  rows={16}
                  className="w-full bg-slate-100 text-slate-600 p-2 text-xs break-all h-full outline-none font-mono"
                  value={text}
                ></textarea>
              </td>
            </tr>
          </>
        )}
        {!!img && (
          <>
            <thead className="bg-slate-200">
              <tr>
                <td
                  colSpan={2}
                  className="  text-sm  border  border-darkGrayOutline py-1 px-2"
                >
                  Img
                </td>
              </tr>
            </thead>
            <tr>
              <td className="bg-slate-100" colSpan={2}>
                <img src={img} />
              </td>
            </tr>
          </>
        )}
      </table>
    </div>
  );
}

function RequestHeaders(props: Props): ReactElement {
  const data = useRequest(props.requestId);

  return (
    <div className="flex flex-col flex-nowrap overflow-y-auto">
      <table className="  text-sm  border  border-darkGrayOutline border-collapse table-fixed">
        <thead className="bg-slate-200">
          <tr>
            <td
              colSpan={2}
              className="  text-sm  border border-darkGrayOutline py-1 px-2 bg-buttonLight font-bold"
            >
              General
            </td>
          </tr>
        </thead>
        <tbody>
          <tr className="  text-sm  border-b border-slate-200">
            <td className="  text-sm  border  border-darkGrayOutline font-bold align-top py-1 px-2 whitespace-nowrap">
              Method
            </td>
            <td className="  text-sm  border  border-darkGrayOutline break-all align-top py-1 px-2">
              {data?.method}
            </td>
          </tr>
          <tr className="  text-sm  border -b border-slate-200">
            <td className="  text-sm  border  border-darkGrayOutline font-bold align-top py-1 px-2 whitespace-nowrap">
              Type
            </td>
            <td className="  text-sm  border  border-darkGrayOutline break-all align-top py-1 px-2">
              {data?.type}
            </td>
          </tr>
          <tr className="  text-sm  border -b border-slate-200">
            <td className="  text-sm  border  border-darkGrayOutline font-bold align-top py-1 px-2 whitespace-nowrap">
              URL
            </td>
            <td className="  text-sm  border  border-darkGrayOutline break-all align-top py-1 px-2">
              {data?.url}
            </td>
          </tr>
        </tbody>
        <thead className="bg-slate-200">
          <tr>
            <td
              colSpan={2}
              className="  text-sm  border  border-darkGrayOutline py-1 px-2 bg-buttonLight font-bold"
            >
              Headers
            </td>
          </tr>
        </thead>
        <tbody className="">
          {data?.requestHeaders?.map((h) => (
            <tr key={h.name} className="  text-sm  border -b border-slate-200">
              <td className="  text-sm  border  border-darkGrayOutline font-bold align-top py-1 px-2 whitespace-nowrap">
                {h.name}
              </td>
              <td className="  text-sm  border  border-darkGrayOutline break-all align-top py-1 px-2">
                {h.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
