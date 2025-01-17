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
var dynamic_handle_exports = {};
__export(dynamic_handle_exports, {
  createDynamicErrorHandler: () => createDynamicErrorHandler,
  createDynamicHandler: () => createDynamicHandler
});
module.exports = __toCommonJS(dynamic_handle_exports);
var import_error = require("./error");
var import_fast_querystring = require("./fast-querystring");
var import_utils = require("./utils");
var import_cookies = require("./cookies");
var import_value = require("@sinclair/typebox/value");
const injectDefaultValues = (typeChecker, obj) => {
  for (const [key, keySchema] of Object.entries(
    // @ts-expect-error private
    typeChecker.schema.properties
  )) {
    obj[key] ??= keySchema.default;
  }
};
const createDynamicHandler = (app) => {
  const { mapResponse, mapEarlyResponse } = app["~adapter"].handler;
  return async (request) => {
    const url = request.url, s = url.indexOf("/", 11), qi = url.indexOf("?", s + 1), path = qi === -1 ? url.substring(s) : url.substring(s, qi);
    const set = {
      cookie: {},
      status: 200,
      headers: {}
    };
    const context = Object.assign(
      {},
      // @ts-expect-error
      app.singleton.decorator,
      {
        set,
        // @ts-expect-error
        store: app.singleton.store,
        request,
        path,
        qi,
        redirect: import_utils.redirect
      }
    );
    try {
      if (app.event.request)
        for (let i = 0; i < app.event.request.length; i++) {
          const onRequest = app.event.request[i].fn;
          let response2 = onRequest(context);
          if (response2 instanceof Promise) response2 = await response2;
          response2 = mapEarlyResponse(response2, set);
          if (response2) return context.response = response2;
        }
      const handler = app.router.dynamic.find(request.method, path) ?? app.router.dynamic.find("ALL", path);
      if (!handler) throw new import_error.NotFoundError();
      const { handle, hooks, validator, content } = handler.store;
      let body;
      if (request.method !== "GET" && request.method !== "HEAD") {
        if (content) {
          switch (content) {
            case "application/json":
              body = await request.json();
              break;
            case "text/plain":
              body = await request.text();
              break;
            case "application/x-www-form-urlencoded":
              body = (0, import_fast_querystring.parseQuery)(await request.text());
              break;
            case "application/octet-stream":
              body = await request.arrayBuffer();
              break;
            case "multipart/form-data":
              body = {};
              const form = await request.formData();
              for (const key of form.keys()) {
                if (body[key]) continue;
                const value = form.getAll(key);
                if (value.length === 1) body[key] = value[0];
                else body[key] = value;
              }
              break;
          }
        } else {
          let contentType = request.headers.get("content-type");
          if (contentType) {
            const index = contentType.indexOf(";");
            if (index !== -1)
              contentType = contentType.slice(0, index);
            context.contentType = contentType;
            if (hooks.parse)
              for (let i = 0; i < hooks.parse.length; i++) {
                const hook = hooks.parse[i].fn;
                let temp = hook(context, contentType);
                if (temp instanceof Promise) temp = await temp;
                if (temp) {
                  body = temp;
                  break;
                }
              }
            delete context.contentType;
            if (body === void 0) {
              switch (contentType) {
                case "application/json":
                  body = await request.json();
                  break;
                case "text/plain":
                  body = await request.text();
                  break;
                case "application/x-www-form-urlencoded":
                  body = (0, import_fast_querystring.parseQuery)(await request.text());
                  break;
                case "application/octet-stream":
                  body = await request.arrayBuffer();
                  break;
                case "multipart/form-data":
                  body = {};
                  const form = await request.formData();
                  for (const key of form.keys()) {
                    if (body[key]) continue;
                    const value = form.getAll(key);
                    if (value.length === 1)
                      body[key] = value[0];
                    else body[key] = value;
                  }
                  break;
              }
            }
          }
        }
      }
      context.body = body;
      context.params = handler?.params || void 0;
      context.query = qi === -1 ? {} : (0, import_fast_querystring.parseQuery)(url.substring(qi + 1));
      context.headers = {};
      for (const [key, value] of request.headers.entries())
        context.headers[key] = value;
      const cookieMeta = Object.assign(
        {},
        app.config?.cookie,
        // @ts-expect-error
        validator?.cookie?.config
      );
      const cookieHeaderValue = request.headers.get("cookie");
      context.cookie = await (0, import_cookies.parseCookie)(
        context.set,
        cookieHeaderValue,
        cookieMeta ? {
          secrets: cookieMeta.secrets !== void 0 ? typeof cookieMeta.secrets === "string" ? cookieMeta.secrets : cookieMeta.secrets.join(",") : void 0,
          sign: cookieMeta.sign === true ? true : cookieMeta.sign !== void 0 ? typeof cookieMeta.sign === "string" ? cookieMeta.sign : cookieMeta.sign.join(",") : void 0
        } : void 0
      );
      const headerValidator = validator?.createHeaders?.();
      if (headerValidator)
        injectDefaultValues(headerValidator, context.headers);
      const paramsValidator = validator?.createParams?.();
      if (paramsValidator)
        injectDefaultValues(paramsValidator, context.params);
      const queryValidator = validator?.createQuery?.();
      if (queryValidator)
        injectDefaultValues(queryValidator, context.query);
      if (hooks.transform)
        for (let i = 0; i < hooks.transform.length; i++) {
          const hook = hooks.transform[i];
          const operation = hook.fn(context);
          if (hook.subType === "derive") {
            if (operation instanceof Promise)
              Object.assign(context, await operation);
            else Object.assign(context, operation);
          } else if (operation instanceof Promise) await operation;
        }
      if (validator) {
        if (headerValidator) {
          const _header = structuredClone(context.headers);
          for (const [key, value] of request.headers)
            _header[key] = value;
          if (validator.headers.Check(_header) === false)
            throw new import_error.ValidationError(
              "header",
              validator.headers,
              _header
            );
        } else if (validator.headers?.Decode)
          context.headers = validator.headers.Decode(context.headers);
        if (paramsValidator?.Check(context.params) === false) {
          throw new import_error.ValidationError(
            "params",
            validator.params,
            context.params
          );
        } else if (validator.params?.Decode)
          context.params = validator.params.Decode(context.params);
        if (queryValidator?.Check(context.query) === false)
          throw new import_error.ValidationError(
            "query",
            validator.query,
            context.query
          );
        else if (validator.query?.Decode)
          context.query = validator.query.Decode(context.query);
        if (validator.createCookie?.()) {
          let cookieValue = {};
          for (const [key, value] of Object.entries(context.cookie))
            cookieValue[key] = value.value;
          if (validator.cookie.Check(cookieValue) === false)
            throw new import_error.ValidationError(
              "cookie",
              validator.cookie,
              cookieValue
            );
          else if (validator.cookie?.Decode)
            cookieValue = validator.cookie.Decode(
              cookieValue
            );
        }
        if (validator.createBody?.()?.Check(body) === false)
          throw new import_error.ValidationError("body", validator.body, body);
        else if (validator.body?.Decode)
          context.body = validator.body.Decode(body);
      }
      if (hooks.beforeHandle)
        for (let i = 0; i < hooks.beforeHandle.length; i++) {
          const hook = hooks.beforeHandle[i];
          let response2 = hook.fn(context);
          if (hook.subType === "resolve") {
            if (response2 instanceof import_error.ElysiaCustomStatusResponse) {
              const result = mapEarlyResponse(
                response2,
                context.set
              );
              if (result)
                return context.response = result;
            }
            if (response2 instanceof Promise)
              Object.assign(context, await response2);
            else Object.assign(context, response2);
            continue;
          } else if (response2 instanceof Promise)
            response2 = await response2;
          if (response2 !== void 0) {
            ;
            context.response = response2;
            if (hooks.afterHandle)
              for (let i2 = 0; i2 < hooks.afterHandle.length; i2++) {
                let newResponse = hooks.afterHandle[i2].fn(
                  context
                );
                if (newResponse instanceof Promise)
                  newResponse = await newResponse;
                if (newResponse) response2 = newResponse;
              }
            const result = mapEarlyResponse(response2, context.set);
            if (result) return context.response = result;
          }
        }
      let response = typeof handle === "function" ? handle(context) : handle;
      if (response instanceof Promise) response = await response;
      if (hooks.afterHandle)
        if (!hooks.afterHandle.length) {
          const status = response instanceof import_error.ElysiaCustomStatusResponse ? response.code : set.status ? typeof set.status === "string" ? import_utils.StatusMap[set.status] : set.status : 200;
          const responseValidator = validator?.createResponse?.()?.[status];
          if (responseValidator?.Check(response) === false)
            throw new import_error.ValidationError(
              "response",
              responseValidator,
              response
            );
          else if (responseValidator?.Decode)
            response = responseValidator.Decode(response);
        } else {
          ;
          context.response = response;
          for (let i = 0; i < hooks.afterHandle.length; i++) {
            let newResponse = hooks.afterHandle[i].fn(
              context
            );
            if (newResponse instanceof Promise)
              newResponse = await newResponse;
            const result = mapEarlyResponse(
              newResponse,
              context.set
            );
            if (result !== void 0) {
              const responseValidator = (
                // @ts-expect-error
                validator?.response?.[result.status]
              );
              if (responseValidator?.Check(result) === false)
                throw new import_error.ValidationError(
                  "response",
                  responseValidator,
                  result
                );
              else if (responseValidator?.Decode)
                response = responseValidator.Decode(response);
              return context.response = result;
            }
          }
        }
      if (context.set.cookie && cookieMeta?.sign) {
        const secret = !cookieMeta.secrets ? void 0 : typeof cookieMeta.secrets === "string" ? cookieMeta.secrets : cookieMeta.secrets[0];
        if (cookieMeta.sign === true)
          for (const [key, cookie] of Object.entries(
            context.set.cookie
          ))
            context.set.cookie[key].value = await (0, import_utils.signCookie)(
              cookie.value,
              "${secret}"
            );
        else {
          const properties = validator?.cookie?.schema?.properties;
          for (const name of cookieMeta.sign) {
            if (!(name in properties)) continue;
            if (context.set.cookie[name]?.value) {
              context.set.cookie[name].value = await (0, import_utils.signCookie)(
                context.set.cookie[name].value,
                secret
              );
            }
          }
        }
      }
      return mapResponse(context.response = response, context.set);
    } catch (error) {
      const reportedError = error instanceof import_value.TransformDecodeError && error.error ? error.error : error;
      return app.handleError(context, reportedError);
    } finally {
      if (app.event.afterResponse)
        for (const afterResponse of app.event.afterResponse)
          await afterResponse.fn(context);
    }
  };
};
const createDynamicErrorHandler = (app) => {
  const { mapResponse } = app["~adapter"].handler;
  return async (context, error) => {
    const errorContext = Object.assign(context, { error, code: error.code });
    errorContext.set = context.set;
    if (app.event.error)
      for (let i = 0; i < app.event.error.length; i++) {
        const hook = app.event.error[i];
        let response = hook.fn(errorContext);
        if (response instanceof Promise) response = await response;
        if (response !== void 0 && response !== null)
          return context.response = mapResponse(
            response,
            context.set
          );
      }
    return new Response(
      typeof error.cause === "string" ? error.cause : error.message,
      {
        headers: context.set.headers,
        status: error.status ?? 500
      }
    );
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createDynamicErrorHandler,
  createDynamicHandler
});
