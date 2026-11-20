import { requireContactAdmin, protectedError, protectedHeaders } from "@/lib/contact/auth";
import { contactStore } from "@/lib/contact/storage";
import { validateContact } from "@/lib/contact/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    const submission = await contactStore.find(id);
    if (!submission) return protectedError("Contact submission not found.", 404);
    return Response.json({ ok: true, submission }, { headers: protectedHeaders });
  } catch {
    return protectedError("Could not load the contact submission.", 500);
  }
}

export async function PUT(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return protectedError("Send a valid JSON object.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return protectedError("Send a valid JSON object.", 400);
  const { name, email, message } = body as Record<string, unknown>;
  const result = validateContact({ name, email, message });
  if (!result.valid) {
    return Response.json({ ok: false, message: "Please correct the fields below.", errors: result.errors }, {
      status: 400, headers: protectedHeaders,
    });
  }
  try {
    const { id } = await params;
    const submission = await contactStore.update(id, result.values);
    if (!submission) return protectedError("Contact submission not found.", 404);
    return Response.json({ ok: true, submission }, { headers: protectedHeaders });
  } catch {
    return protectedError("Could not save the contact submission.", 500);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    if (!await contactStore.delete(id)) return protectedError("Contact submission not found.", 404);
    return new Response(null, { status: 204, headers: protectedHeaders });
  } catch {
    return protectedError("Could not delete the contact submission.", 500);
  }
}
