import { NextResponse, type NextRequest } from "next/server";
import {
  CALLBACK_PATH,
  COOKIE,
  addPasskeyUrl,
  authorizeUrl,
  createPkce,
  safeNext,
  secureCookies,
} from "@/server/auth/cognito";

// Starts Cognito managed login. ?next=/admin/... is where to land after signing in.
// ?atslega=1 opens Cognito's passkey registration instead (admin-created users are never prompted).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("atslega") === "1") return NextResponse.redirect(addPasskeyUrl());

  const { verifier, challenge, state } = await createPkce();
  const next = safeNext(params.get("next"));

  const response = NextResponse.redirect(authorizeUrl(state, challenge));
  response.cookies.set(COOKIE.oauth, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: CALLBACK_PATH,
    maxAge: 10 * 60,
  });
  return response;
}
