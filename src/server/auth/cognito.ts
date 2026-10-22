import { CognitoJwtVerifier } from "aws-jwt-verify";
import { site } from "@/config/site";

// Cognito managed login (OAuth 2.0 authorization code + PKCE) for the admin area.
// No "server-only" here because src/proxy.ts imports it; it still only runs on the server.

/** Cognito user pool group whose members may use /admin. */
export const ADMIN_GROUP = "admin";

/** Session cookies are scoped to /admin so the storefront never sends them. */
export const COOKIE = {
  access: "admin_at",
  refresh: "admin_rt",
  /** state + PKCE verifier + return path, set by /api/auth/login, read by /api/auth/callback. */
  oauth: "admin_oauth",
} as const;

export const ADMIN_PATH = "/admin";
export const CALLBACK_PATH = "/api/auth/callback";

/** Refresh token lifetime; keep in sync with the app client's setting in Cognito. */
export const REFRESH_TOKEN_SECONDS = 12 * 60 * 60;

export const secureCookies = process.env.NODE_ENV === "production";

function config() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const domain = process.env.COGNITO_DOMAIN?.replace(/\/+$/, "");
  if (!userPoolId || !clientId || !domain) {
    throw new Error("Admin login needs COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID and COGNITO_DOMAIN.");
  }
  return { userPoolId, clientId, domain };
}

const redirectUri = () => new URL(CALLBACK_PATH, site.url).toString();

let verifier: ReturnType<typeof createVerifier> | null = null;
function createVerifier() {
  const { userPoolId, clientId } = config();
  return CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access", groups: ADMIN_GROUP });
}

/** Verifies signature, expiry, client and the admin group. Throws if any check fails. */
export function verifyAdminToken(accessToken: string) {
  verifier ??= createVerifier();
  return verifier.verify(accessToken);
}

/** Expiry from the token payload without verifying it; only used to decide when to refresh. */
export function tokenExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export async function createPkce() {
  const verifierValue = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifierValue))),
  );
  return { verifier: verifierValue, challenge, state: base64url(crypto.getRandomValues(new Uint8Array(16))) };
}

export function authorizeUrl(state: string, challenge: string) {
  const { clientId, domain } = config();
  const url = new URL(`${domain}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    scope: "openid email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url;
}

export function logoutUrl() {
  const { clientId, domain } = config();
  const url = new URL(`${domain}/logout`);
  url.search = new URLSearchParams({ client_id: clientId, logout_uri: new URL("/", site.url).toString() }).toString();
  return url;
}

export type TokenSet = { access_token: string; expires_in: number; refresh_token?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const { clientId, domain } = config();
  // Confidential clients authenticate with their secret; public clients rely on PKCE alone.
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }
  const res = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ client_id: clientId, ...params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Cognito token endpoint returned ${res.status}: ${await res.text()}`);
  return res.json();
}

export const exchangeCode = (code: string, codeVerifier: string) =>
  tokenRequest({ grant_type: "authorization_code", code, code_verifier: codeVerifier, redirect_uri: redirectUri() });

export const refreshTokens = (refreshToken: string) =>
  tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

/** Only same-site /admin paths are allowed as post-login destinations. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith(`${ADMIN_PATH}`) && !next.startsWith("//") ? next : ADMIN_PATH;
}
