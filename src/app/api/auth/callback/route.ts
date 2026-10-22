import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import {
  ADMIN_PATH,
  CALLBACK_PATH,
  COOKIE,
  REFRESH_TOKEN_SECONDS,
  exchangeCode,
  safeNext,
  secureCookies,
  verifyAdminToken,
} from "@/server/auth/cognito";

// Cognito redirects here with ?code&state after a successful sign-in.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = parseOauthCookie(request.cookies.get(COOKIE.oauth)?.value);
  const code = params.get("code");

  if (params.get("error") || !code || !saved || saved.state !== params.get("state")) {
    return plain(400, "Pieslēgšanās neizdevās. Mēģiniet vēlreiz no /admin.");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, saved.verifier);
  } catch (error) {
    console.error("Cognito code exchange failed", error);
    return plain(502, "Pieslēgšanās neizdevās. Mēģiniet vēlreiz no /admin.");
  }
  try {
    await verifyAdminToken(tokens.access_token);
  } catch (error) {
    console.warn("Admin login rejected:", error instanceof Error ? error.message : error);
    return plain(403, "Šim lietotājam nav piekļuves administrācijai.");
  }

  // Built from the public site URL: behind Amplify's proxy, request.url is the internal localhost address.
  const response = NextResponse.redirect(new URL(safeNext(saved.next), site.url));
  response.cookies.delete({ name: COOKIE.oauth, path: CALLBACK_PATH });
  const cookie = { httpOnly: true, secure: secureCookies, sameSite: "lax", path: ADMIN_PATH } as const;
  response.cookies.set(COOKIE.access, tokens.access_token, { ...cookie, maxAge: tokens.expires_in });
  if (tokens.refresh_token) {
    response.cookies.set(COOKIE.refresh, tokens.refresh_token, { ...cookie, maxAge: REFRESH_TOKEN_SECONDS });
  }
  return response;
}

function parseOauthCookie(value: string | undefined) {
  try {
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed.state === "string" && typeof parsed.verifier === "string"
      ? (parsed as { state: string; verifier: string; next?: string })
      : null;
  } catch {
    return null;
  }
}

const plain = (status: number, text: string) =>
  new NextResponse(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
