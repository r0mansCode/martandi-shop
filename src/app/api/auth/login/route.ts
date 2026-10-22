import { NextResponse, type NextRequest } from "next/server";
import { CALLBACK_PATH, COOKIE, authorizeUrl, createPkce, safeNext, secureCookies } from "@/server/auth/cognito";

// Starts Cognito managed login. ?next=/admin/... is where to land after signing in.
export async function GET(request: NextRequest) {
  const { verifier, challenge, state } = await createPkce();
  const next = safeNext(request.nextUrl.searchParams.get("next"));

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
