import { test } from "node:test";
import assert from "node:assert/strict";
import { basicAuthMiddleware } from "../server/basicAuth";

function mockRes() {
  const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined };
  res.set = (k: string, v: string) => (res.headers[k] = v);
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body: string) => (res.body = body);
  return res;
}

test("basicAuthMiddleware is a no-op when no credentials are configured", () => {
  const mw = basicAuthMiddleware(undefined, undefined);
  let called = false;
  mw({ headers: {} } as any, mockRes(), () => (called = true));
  assert.equal(called, true);
});

test("basicAuthMiddleware rejects requests with no Authorization header when configured", () => {
  const mw = basicAuthMiddleware("josh", "secret");
  const res = mockRes();
  let called = false;
  mw({ headers: {} } as any, res, () => (called = true));
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test("basicAuthMiddleware rejects wrong credentials", () => {
  const mw = basicAuthMiddleware("josh", "secret");
  const res = mockRes();
  const header = "Basic " + Buffer.from("josh:wrong").toString("base64");
  let called = false;
  mw({ headers: { authorization: header } } as any, res, () => (called = true));
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test("basicAuthMiddleware accepts correct credentials", () => {
  const mw = basicAuthMiddleware("josh", "secret");
  const res = mockRes();
  const header = "Basic " + Buffer.from("josh:secret").toString("base64");
  let called = false;
  mw({ headers: { authorization: header } } as any, res, () => (called = true));
  assert.equal(called, true);
});
