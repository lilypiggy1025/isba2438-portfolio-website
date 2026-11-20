import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_SECONDS = 3600;
const COOKIE_NAME = "contact_admin_session";
export const protectedHeaders = { "Cache-Control": "no-store" };

function adminSecret() {
  const secret = process.env.CONTACT_ADMIN_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

export function protectedError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status, headers: protectedHeaders });
}

export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export function validCredentials(value: unknown): boolean {
  const secret = adminSecret();
  if (!secret || typeof value !== "string") return false;
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(value), digest(secret));
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update("contact-admin-session:" + payload).digest("base64url");
}

export function createSessionCookie(): string {
  const secret = adminSecret();
  if (!secret) throw new Error("Contact administration is not configured.");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${expires}.${randomBytes(32).toString("base64url")}`;
  return sessionCookie(`${payload}.${signature(payload, secret)}`, SESSION_SECONDS);
}

function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(): string {
  return sessionCookie("", 0);
}

export function authorized(request: Request): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  const cookies = (request.headers.get("cookie") ?? "").split(";")
    .map((cookie) => cookie.trim()).filter((cookie) => cookie.startsWith(COOKIE_NAME + "="));
  if (cookies.length !== 1) return false;
  const token = cookies[0].slice(COOKIE_NAME.length + 1);
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
  const expires = Number(parts[0]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS) return false;
  const expected = Buffer.from(signature(`${parts[0]}.${parts[1]}`, secret));
  const supplied = Buffer.from(parts[2]);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function requireContactAdmin(request: Request): Response | undefined {
  if (!authorized(request) || (request.method !== "GET" && !sameOrigin(request))) {
    return protectedError("Administrator authentication required.", 401);
  }
}
