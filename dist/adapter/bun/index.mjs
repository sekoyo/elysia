import{ WebStandardAdapter }from"../web-standard/index.mjs";
import{ parseSetCookies }from"../web-standard/handler.mjs";
import{ createNativeStaticHandler }from"./handler.mjs";
import{ serializeCookie }from"../../cookies.mjs";
import{ isProduction, ValidationError }from"../../error.mjs";
import{
  getSchemaValidator,
  hasHeaderShorthand,
  isNotEmpty,
  isNumericString,
  randomId
}from"../../utils.mjs";
import{
  createHandleWSResponse,
  createWSMessageParser,
  ElysiaWS,
  websocket
}from"../../ws/index.mjs";
const BunAdapter = {
  ...WebStandardAdapter,
  name: "bun",
  handler: {
    ...WebStandardAdapter.handler,
    createNativeStaticHandler
  },
  composeHandler: {
    ...WebStandardAdapter.composeHandler,
    headers: hasHeaderShorthand ? "c.headers = c.request.headers.toJSON()\n" : "c.headers = {}\nfor (const [key, value] of c.request.headers.entries())c.headers[key] = value\n"
  },
  listen(app) {
    return (options, callback) => {
      if (typeof Bun === "undefined")
        throw new Error(
          ".listen() is designed to run on Bun only. If you are running Elysia in other environment please use a dedicated plugin or export the handler via Elysia.fetch"
        );
      app.compile();
      if (typeof options === "string") {
        if (!isNumericString(options))
          throw new Error("Port must be a numeric value");
        options = parseInt(options);
      }
      const fetch = app.fetch;
      const serve = typeof options === "object" ? {
        development: !isProduction,
        reusePort: true,
        ...app.config.serve || {},
        ...options || {},
        // @ts-ignore
        static: app.router.static.http.static,
        websocket: {
          ...app.config.websocket || {},
          ...websocket || {}
        },
        fetch,
        // @ts-expect-error private property
        error: app.outerErrorHandler
      } : {
        development: !isProduction,
        reusePort: true,
        ...app.config.serve || {},
        // @ts-ignore
        static: app.router.static.http.static,
        websocket: {
          ...app.config.websocket || {},
          ...websocket || {}
        },
        port: options,
        fetch,
        // @ts-expect-error private property
        error: app.outerErrorHandler
      };
      app.server = Bun?.serve(serve);
      if (app.event.start)
        for (let i = 0; i < app.event.start.length; i++)
          app.event.start[i].fn(app);
      if (callback) callback(app.server);
      process.on("beforeExit", () => {
        if (app.server) {
          app.server.stop();
          app.server = null;
          if (app.event.stop)
            for (let i = 0; i < app.event.stop.length; i++)
              app.event.stop[i].fn(app);
        }
      });
      app.promisedModules.then(() => {
        Bun?.gc(false);
      });
    };
  },
  ws(app, path, options) {
    const { parse, body, response, ...rest } = options;
    const validateMessage = getSchemaValidator(body, {
      // @ts-expect-error private property
      modules: app.definitions.typebox,
      // @ts-expect-error private property
      models: app.definitions.type,
      normalize: app.config.normalize
    });
    const validateResponse = getSchemaValidator(response, {
      // @ts-expect-error private property
      modules: app.definitions.typebox,
      // @ts-expect-error private property
      models: app.definitions.type,
      normalize: app.config.normalize
    });
    app.route(
      "$INTERNALWS",
      path,
      async (context) => {
        const server = app.getServer();
        const { set, path: path2, qi, headers, query, params } = context;
        context.validator = validateResponse;
        if (options.upgrade) {
          if (typeof options.upgrade === "function") {
            const temp = options.upgrade(context);
            if (temp instanceof Promise) await temp;
          } else if (options.upgrade)
            Object.assign(
              set.headers,
              options.upgrade
            );
        }
        if (set.cookie && isNotEmpty(set.cookie)) {
          const cookie = serializeCookie(set.cookie);
          if (cookie) set.headers["set-cookie"] = cookie;
        }
        if (set.headers["set-cookie"] && Array.isArray(set.headers["set-cookie"]))
          set.headers = parseSetCookies(
            new Headers(set.headers),
            set.headers["set-cookie"]
          );
        const handleResponse = createHandleWSResponse(validateResponse);
        const parseMessage = createWSMessageParser(parse);
        let _id;
        if (server?.upgrade(context.request, {
          headers: isNotEmpty(set.headers) ? set.headers : void 0,
          data: {
            ...context,
            get id() {
              if (_id) return _id;
              return _id = randomId();
            },
            validator: validateResponse,
            ping(data) {
              options.ping?.(data);
            },
            pong(data) {
              options.pong?.(data);
            },
            open(ws) {
              handleResponse(
                ws,
                options.open?.(
                  new ElysiaWS(ws, context)
                )
              );
            },
            message: async (ws, _message) => {
              const message = await parseMessage(ws, _message);
              if (validateMessage?.Check(message) === false)
                return void ws.send(
                  new ValidationError(
                    "message",
                    validateMessage,
                    message
                  ).message
                );
              handleResponse(
                ws,
                options.message?.(
                  new ElysiaWS(
                    ws,
                    context,
                    message
                  ),
                  message
                )
              );
            },
            drain(ws) {
              handleResponse(
                ws,
                options.drain?.(
                  new ElysiaWS(ws, context)
                )
              );
            },
            close(ws, code, reason) {
              handleResponse(
                ws,
                options.close?.(
                  new ElysiaWS(ws, context),
                  code,
                  reason
                )
              );
            }
          }
        }))
          return;
        set.status = 400;
        return "Expected a websocket connection";
      },
      {
        ...rest,
        websocket: options
      }
    );
  }
};
export {
  BunAdapter
};
