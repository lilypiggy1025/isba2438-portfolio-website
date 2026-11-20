import { clearSessionCookie, createSessionCookie, protectedError, protectedHeaders, sameOrigin, validCredentials } from "@/lib/contact/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return protectedError("Administrator authentication required.", 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return protectedError("Send a valid JSON object.", 400);
  }
  const password = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).password : undefined;
  if (!validCredentials(password)) return protectedError("Administrator authentication required.", 401);
  return Response.json({ ok: true, message: "Signed in." }, {
    headers: { ...protectedHeaders, "Set-Cookie": createSessionCookie() },
  });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return protectedError("Administrator authentication required.", 401);
  return new Response(null, { status: 204, headers: { ...protectedHeaders, "Set-Cookie": clearSessionCookie() } });
}
