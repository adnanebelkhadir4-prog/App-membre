import type { RequestHandler, Request as ExpressRequest, Response as ExpressResponse } from "express";

/**
 * Runs an existing Express RequestHandler (e.g. handleLogin, handleRegister
 * from server/routes/auth.ts) against a real, native Netlify Functions v2
 * Request object -- WITHOUT going through serverless-http.
 *
 * Why this exists: on this project, the classic Express-wrapped-in-
 * serverless-http Netlify Function (netlify/functions/api.ts) has been
 * observed to occasionally deliver a mangled req.body -- a JSON string
 * "shattered" into an object with numeric keys ('0','1','2',...), one
 * character per key, instead of the parsed object. Netlify Functions v2
 * gives us a standards-compliant Fetch API Request instead, whose
 * `.text()`/`.json()` are always correct -- there is no event-simulation
 * layer in between that can corrupt the body. We read the body correctly
 * here, then hand it to the EXISTING, already-correct handler logic
 * unchanged, via a minimal fake Express req/res.
 *
 * The handler must only use req.body/req.headers/req.query/req.params and
 * respond via res.status(...).json(...) -- which is the case for every
 * handler in server/routes/auth.ts.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function runExpressHandler(handler: RequestHandler, webRequest: Request): Promise<Response> {
  // Handle CORS preflight requests (sent by browsers/WebViews before a
  // cross-origin POST with a JSON body). Without this, requests coming
  // from the packaged APK (origin capacitor://localhost / https://localhost)
  // are blocked by the browser before they even reach the logic below --
  // this is invisible on the Netlify web build because there the app and
  // the API share the same origin, so no preflight is ever triggered.
  if (webRequest.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let body: unknown;

  if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
    const rawText = await webRequest.text();
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        return jsonResponse(400, { error: "Corps de requête JSON invalide." });
      }
    }
  }

  const headers: Record<string, string> = {};
  webRequest.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const url = new URL(webRequest.url);

  const fakeReq = {
    body,
    headers,
    method: webRequest.method,
    query: Object.fromEntries(url.searchParams),
    params: {},
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as ExpressRequest;

  let statusCode = 200;
  let responseBody: unknown;

  const fakeRes = {
    status(code: number) {
      statusCode = code;
      return fakeRes;
    },
    json(payload: unknown) {
      responseBody = payload;
      return fakeRes;
    },
    send(payload: unknown) {
      responseBody = payload;
      return fakeRes;
    },
    set() {
      return fakeRes;
    },
    setHeader() {
      return fakeRes;
    },
    type() {
      return fakeRes;
    },
    sendStatus(code: number) {
      statusCode = code;
      responseBody = undefined;
      return fakeRes;
    },
    end() {
      return fakeRes;
    },
  } as unknown as ExpressResponse;

  try {
    await handler(fakeReq, fakeRes, () => {});
  } catch (error) {
    console.error("[runExpressHandler] handler threw:", error);
    return jsonResponse(500, { error: "حدث خطأ في الاتصال، حاول مجددًا" });
  }

  return jsonResponse(statusCode, responseBody);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body !== undefined ? JSON.stringify(body) : null, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}
