"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var handler_exports = {};
__export(handler_exports, {
  createStaticHandler: () => createStaticHandler,
  errorToResponse: () => errorToResponse,
  handleSet: () => handleSet,
  mapCompactResponse: () => mapCompactResponse,
  mapEarlyResponse: () => mapEarlyResponse,
  mapResponse: () => mapResponse,
  mergeResponseWithSetHeaders: () => mergeResponseWithSetHeaders,
  parseSetCookies: () => parseSetCookies,
  streamResponse: () => streamResponse
});
module.exports = __toCommonJS(handler_exports);
var import_utils = require("../../utils");
var import_cookies = require("../../cookies");
var import_error = require("../../error");
const handleFile = (response, set2) => {
  const size = response.size;
  if (!set2 && size || size && set2 && set2.status !== 206 && set2.status !== 304 && set2.status !== 412 && set2.status !== 416) {
    if (set2) {
      if (set2.headers instanceof Headers) {
        let setHeaders = {
          "accept-ranges": "bytes",
          "content-range": `bytes 0-${size - 1}/${size}`,
          "transfer-encoding": "chunked"
        };
        if (import_utils.hasHeaderShorthand)
          setHeaders = set2.headers.toJSON();
        else {
          setHeaders = {};
          for (const [key, value] of set2.headers.entries())
            if (key in set2.headers) setHeaders[key] = value;
        }
        return new Response(response, {
          status: set2.status,
          headers: setHeaders
        });
      }
      if ((0, import_utils.isNotEmpty)(set2.headers))
        return new Response(response, {
          status: set2.status,
          headers: Object.assign(
            {
              "accept-ranges": "bytes",
              "content-range": `bytes 0-${size - 1}/${size}`,
              "transfer-encoding": "chunked"
            },
            set2.headers
          )
        });
    }
    return new Response(response, {
      headers: {
        "accept-ranges": "bytes",
        "content-range": `bytes 0-${size - 1}/${size}`,
        "transfer-encoding": "chunked"
      }
    });
  }
  return new Response(response);
};
const parseSetCookies = (headers, setCookie) => {
  if (!headers) return headers;
  headers.delete("set-cookie");
  for (let i = 0; i < setCookie.length; i++) {
    const index = setCookie[i].indexOf("=");
    headers.append(
      "set-cookie",
      `${setCookie[i].slice(0, index)}=${setCookie[i].slice(index + 1) || ""}`
    );
  }
  return headers;
};
const handleStream = async (generator, set2, request) => {
  let init = generator.next();
  if (init instanceof Promise) init = await init;
  if (init.done) {
    if (set2) return mapResponse(init.value, set2, request);
    return mapCompactResponse(init.value, request);
  }
  return new Response(
    new ReadableStream({
      async start(controller) {
        let end = false;
        request?.signal?.addEventListener("abort", () => {
          end = true;
          try {
            controller.close();
          } catch {
          }
        });
        if (init.value !== void 0 && init.value !== null) {
          if (typeof init.value === "object")
            try {
              controller.enqueue(
                // @ts-expect-error this is a valid operation
                Buffer.from(JSON.stringify(init.value))
              );
            } catch {
              controller.enqueue(
                // @ts-expect-error this is a valid operation
                Buffer.from(init.value.toString())
              );
            }
          else
            controller.enqueue(
              // @ts-expect-error this is a valid operation
              Buffer.from(init.value.toString())
            );
        }
        for await (const chunk of generator) {
          if (end) break;
          if (chunk === void 0 || chunk === null) continue;
          if (typeof chunk === "object")
            try {
              controller.enqueue(
                // @ts-expect-error this is a valid operation
                Buffer.from(JSON.stringify(chunk))
              );
            } catch {
              controller.enqueue(
                // @ts-expect-error this is a valid operation
                Buffer.from(chunk.toString())
              );
            }
          else
            controller.enqueue(
              // @ts-expect-error this is a valid operation
              Buffer.from(chunk.toString())
            );
          await new Promise(
            (resolve) => setTimeout(() => resolve(), 0)
          );
        }
        try {
          controller.close();
        } catch {
        }
      }
    }),
    {
      ...set2,
      headers: {
        // Manually set transfer-encoding for direct response, eg. app.handle, eden
        "transfer-encoding": "chunked",
        "content-type": "text/event-stream; charset=utf-8",
        ...set2?.headers
      }
    }
  );
};
async function* streamResponse(response) {
  const body = response.body;
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  } finally {
    reader.releaseLock();
  }
}
const handleSet = (set2) => {
  if (typeof set2.status === "string") set2.status = import_utils.StatusMap[set2.status];
  if (set2.cookie && (0, import_utils.isNotEmpty)(set2.cookie)) {
    const cookie = (0, import_cookies.serializeCookie)(set2.cookie);
    if (cookie) set2.headers["set-cookie"] = cookie;
  }
  if (set2.headers["set-cookie"] && Array.isArray(set2.headers["set-cookie"])) {
    set2.headers = parseSetCookies(
      new Headers(set2.headers),
      set2.headers["set-cookie"]
    );
  }
};
const mergeResponseWithSetHeaders = (response, set2) => {
  if (response.status !== set2.status && set2.status !== 200 && (response.status <= 300 || response.status > 400))
    response = new Response(response.body, {
      headers: response.headers,
      status: set2.status
    });
  let isCookieSet = false;
  if (set2.headers instanceof Headers)
    for (const key of set2.headers.keys()) {
      if (key === "set-cookie") {
        if (isCookieSet) continue;
        isCookieSet = true;
        for (const cookie of set2.headers.getSetCookie())
          response.headers.append("set-cookie", cookie);
      } else response.headers.append(key, set2.headers?.get(key) ?? "");
    }
  else
    for (const key in set2.headers)
      response.headers.append(key, set2.headers[key]);
  return response;
};
const mapResponse = (response, set2, request) => {
  if ((0, import_utils.isNotEmpty)(set2.headers) || set2.status !== 200 || set2.cookie) {
    handleSet(set2);
    switch (response?.constructor?.name) {
      case "String":
        return new Response(response, set2);
      case "Array":
      case "Object":
        return Response.json(response, set2);
      case "ElysiaFile":
        return handleFile(response.value);
      case "Blob":
        return handleFile(response, set2);
      case "ElysiaCustomStatusResponse":
        set2.status = response.code;
        return mapResponse(
          response.response,
          set2,
          request
        );
      case "ReadableStream":
        if (!set2.headers["content-type"]?.startsWith(
          "text/event-stream"
        ))
          set2.headers["content-type"] = "text/event-stream; charset=utf-8";
        request?.signal?.addEventListener(
          "abort",
          {
            handleEvent() {
              if (request?.signal && !request?.signal?.aborted)
                response.cancel();
            }
          },
          {
            once: true
          }
        );
        return new Response(response, set2);
      case void 0:
        if (!response) return new Response("", set2);
        return Response.json(response, set2);
      case "Response":
        response = mergeResponseWithSetHeaders(
          response,
          set2
        );
        if (response.headers.get("transfer-encoding") === "chunked")
          return handleStream(
            streamResponse(response),
            set2,
            request
          );
        return response;
      case "Error":
        return errorToResponse(response, set2);
      case "Promise":
        return response.then(
          (x) => mapResponse(x, set2, request)
        );
      case "Function":
        return mapResponse(response(), set2, request);
      case "Number":
      case "Boolean":
        return new Response(
          response.toString(),
          set2
        );
      case "Cookie":
        if (response instanceof import_cookies.Cookie)
          return new Response(response.value, set2);
        return new Response(response?.toString(), set2);
      case "FormData":
        return new Response(response, set2);
      default:
        if (response instanceof Response) {
          response = mergeResponseWithSetHeaders(
            response,
            set2
          );
          if (response.headers.get(
            "transfer-encoding"
          ) === "chunked")
            return handleStream(
              streamResponse(response),
              set2,
              request
            );
          return response;
        }
        if (response instanceof Promise)
          return response.then((x) => mapResponse(x, set2));
        if (response instanceof Error)
          return errorToResponse(response, set2);
        if (response instanceof import_error.ElysiaCustomStatusResponse) {
          set2.status = response.code;
          return mapResponse(
            response.response,
            set2,
            request
          );
        }
        if (typeof response?.next === "function")
          return handleStream(response, set2, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapResponse(x, set2));
        if (typeof response?.toResponse === "function")
          return mapResponse(response.toResponse(), set2);
        if ("charCodeAt" in response) {
          const code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set2.headers["Content-Type"])
              set2.headers["Content-Type"] = "application/json";
            return new Response(
              JSON.stringify(response),
              set2
            );
          }
        }
        return new Response(response, set2);
    }
  }
  if (
    // @ts-expect-error
    typeof response?.next === "function" || response instanceof ReadableStream || response instanceof Response && response.headers.get("transfer-encoding") === "chunked"
  )
    return handleStream(response, set2, request);
  return mapCompactResponse(response, request);
};
const mapEarlyResponse = (response, set2, request) => {
  if (response === void 0 || response === null) return;
  if ((0, import_utils.isNotEmpty)(set2.headers) || set2.status !== 200 || set2.cookie) {
    handleSet(set2);
    switch (response?.constructor?.name) {
      case "String":
        return new Response(response, set2);
      case "Array":
      case "Object":
        return Response.json(response, set2);
      case "ElysiaFile":
        return handleFile(response.value);
      case "Blob":
        return handleFile(response, set2);
      case "ElysiaCustomStatusResponse":
        set2.status = response.code;
        return mapEarlyResponse(
          response.response,
          set2,
          request
        );
      case "ReadableStream":
        if (!set2.headers["content-type"]?.startsWith(
          "text/event-stream"
        ))
          set2.headers["content-type"] = "text/event-stream; charset=utf-8";
        request?.signal?.addEventListener(
          "abort",
          {
            handleEvent() {
              if (request?.signal && !request?.signal?.aborted)
                response.cancel();
            }
          },
          {
            once: true
          }
        );
        return new Response(response, set2);
      case void 0:
        if (!response) return;
        return Response.json(response, set2);
      case "Response":
        response = mergeResponseWithSetHeaders(
          response,
          set2
        );
        if (response.headers.get("transfer-encoding") === "chunked")
          return handleStream(
            streamResponse(response),
            set2,
            request
          );
        return response;
      case "Promise":
        return response.then(
          (x) => mapEarlyResponse(x, set2)
        );
      case "Error":
        return errorToResponse(response, set2);
      case "Function":
        return mapEarlyResponse(response(), set2);
      case "Number":
      case "Boolean":
        return new Response(
          response.toString(),
          set2
        );
      case "FormData":
        return new Response(response);
      case "Cookie":
        if (response instanceof import_cookies.Cookie)
          return new Response(response.value, set2);
        return new Response(response?.toString(), set2);
      default:
        if (response instanceof Response) {
          response = mergeResponseWithSetHeaders(
            response,
            set2
          );
          if (response.headers.get(
            "transfer-encoding"
          ) === "chunked")
            return handleStream(
              streamResponse(response),
              set2,
              request
            );
          return response;
        }
        if (response instanceof Promise)
          return response.then((x) => mapEarlyResponse(x, set2));
        if (response instanceof Error)
          return errorToResponse(response, set2);
        if (response instanceof import_error.ElysiaCustomStatusResponse) {
          set2.status = response.code;
          return mapEarlyResponse(
            response.response,
            set2,
            request
          );
        }
        if (typeof response?.next === "function")
          return handleStream(response, set2, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapEarlyResponse(x, set2));
        if (typeof response?.toResponse === "function")
          return mapEarlyResponse(response.toResponse(), set2);
        if ("charCodeAt" in response) {
          const code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set2.headers["Content-Type"])
              set2.headers["Content-Type"] = "application/json";
            return new Response(
              JSON.stringify(response),
              set2
            );
          }
        }
        return new Response(response, set2);
    }
  } else
    switch (response?.constructor?.name) {
      case "String":
        return new Response(response);
      case "Array":
      case "Object":
        return Response.json(response, set2);
      case "ElysiaFile":
        return handleFile(response.value);
      case "Blob":
        return handleFile(response, set2);
      case "ElysiaCustomStatusResponse":
        set2.status = response.code;
        return mapEarlyResponse(
          response.response,
          set2,
          request
        );
      case "ReadableStream":
        request?.signal?.addEventListener(
          "abort",
          {
            handleEvent() {
              if (request?.signal && !request?.signal?.aborted)
                response.cancel();
            }
          },
          {
            once: true
          }
        );
        return new Response(response, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8"
          }
        });
      case void 0:
        if (!response) return new Response("");
        return new Response(JSON.stringify(response), {
          headers: {
            "content-type": "application/json"
          }
        });
      case "Response":
        if (response.headers.get("transfer-encoding") === "chunked")
          return handleStream(
            streamResponse(response)
          );
        return response;
      case "Promise":
        return response.then((x) => {
          const r = mapEarlyResponse(x, set2);
          if (r !== void 0) return r;
        });
      case "Error":
        return errorToResponse(response, set2);
      case "Function":
        return mapCompactResponse(response(), request);
      case "Number":
      case "Boolean":
        return new Response(response.toString());
      case "Cookie":
        if (response instanceof import_cookies.Cookie)
          return new Response(response.value, set2);
        return new Response(response?.toString(), set2);
      case "FormData":
        return new Response(response);
      default:
        if (response instanceof Response) return response;
        if (response instanceof Promise)
          return response.then((x) => mapEarlyResponse(x, set2));
        if (response instanceof Error)
          return errorToResponse(response, set2);
        if (response instanceof import_error.ElysiaCustomStatusResponse) {
          set2.status = response.code;
          return mapEarlyResponse(
            response.response,
            set2,
            request
          );
        }
        if (typeof response?.next === "function")
          return handleStream(response, set2, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapEarlyResponse(x, set2));
        if (typeof response?.toResponse === "function")
          return mapEarlyResponse(response.toResponse(), set2);
        if ("charCodeAt" in response) {
          const code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set2.headers["Content-Type"])
              set2.headers["Content-Type"] = "application/json";
            return new Response(
              JSON.stringify(response),
              set2
            );
          }
        }
        return new Response(response);
    }
};
const mapCompactResponse = (response, request) => {
  switch (response?.constructor?.name) {
    case "String":
      return new Response(response);
    case "Object":
    case "Array":
      return Response.json(response);
    case "ElysiaFile":
      return handleFile(response.value);
    case "Blob":
      return handleFile(response);
    case "ElysiaCustomStatusResponse":
      return mapResponse(
        response.response,
        {
          status: response.code,
          headers: {}
        }
      );
    case "ReadableStream":
      request?.signal?.addEventListener(
        "abort",
        {
          handleEvent() {
            if (request?.signal && !request?.signal?.aborted)
              response.cancel();
          }
        },
        {
          once: true
        }
      );
      return new Response(response, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8"
        }
      });
    case void 0:
      if (!response) return new Response("");
      return new Response(JSON.stringify(response), {
        headers: {
          "content-type": "application/json"
        }
      });
    case "Response":
      if (response.headers.get("transfer-encoding") === "chunked")
        return handleStream(streamResponse(response));
      return response;
    case "Error":
      return errorToResponse(response);
    case "Promise":
      return response.then(
        (x) => mapCompactResponse(x, request)
      );
    // ? Maybe response or Blob
    case "Function":
      return mapCompactResponse(response(), request);
    case "Number":
    case "Boolean":
      return new Response(response.toString());
    case "FormData":
      return new Response(response);
    default:
      if (response instanceof Response) return response;
      if (response instanceof Promise)
        return response.then(
          (x) => mapCompactResponse(x, request)
        );
      if (response instanceof Error)
        return errorToResponse(response);
      if (response instanceof import_error.ElysiaCustomStatusResponse)
        return mapResponse(
          response.response,
          {
            status: response.code,
            headers: {}
          }
        );
      if (typeof response?.next === "function")
        return handleStream(response, void 0, request);
      if (typeof response?.then === "function")
        return response.then((x) => mapResponse(x, set));
      if (typeof response?.toResponse === "function")
        return mapCompactResponse(response.toResponse());
      if ("charCodeAt" in response) {
        const code = response.charCodeAt(0);
        if (code === 123 || code === 91) {
          return new Response(JSON.stringify(response), {
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
      }
      return new Response(response);
  }
};
const errorToResponse = (error, set2) => new Response(
  JSON.stringify({
    name: error?.name,
    message: error?.message,
    cause: error?.cause
  }),
  {
    status: set2?.status !== 200 ? set2?.status ?? 500 : 500,
    headers: set2?.headers
  }
);
const createStaticHandler = (handle, hooks, setHeaders = {}) => {
  if (typeof handle === "function") return;
  const response = mapResponse(handle, {
    headers: setHeaders
  });
  if (!hooks.parse?.length && !hooks.transform?.length && !hooks.beforeHandle?.length && !hooks.afterHandle?.length)
    return response.clone.bind(response);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStaticHandler,
  errorToResponse,
  handleSet,
  mapCompactResponse,
  mapEarlyResponse,
  mapResponse,
  mergeResponseWithSetHeaders,
  parseSetCookies,
  streamResponse
});
