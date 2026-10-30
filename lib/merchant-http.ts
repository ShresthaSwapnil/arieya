import { NextResponse } from "next/server";

export const merchantCookieName = "arieya-merchant";

export function merchantToken(request: Request) {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)arieya-merchant=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

export function setMerchantCookie(response: NextResponse, token: string, request: Request) {
  response.cookies.set(merchantCookieName, token, {
    httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/", maxAge: 14 * 86400,
  });
}

export function clearMerchantCookie(response: NextResponse, request?: Request) {
  const isHttps = request ? new URL(request.url).protocol === "https:" : false;
  response.cookies.delete({ name: merchantCookieName, path: "/" });
  response.cookies.set(merchantCookieName, "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
