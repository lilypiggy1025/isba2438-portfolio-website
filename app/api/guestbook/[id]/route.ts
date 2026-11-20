import { guestbookStore } from "@/lib/guestbook/storage";
import { validateGuestbook } from "@/lib/guestbook/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const entry = await guestbookStore.find(id);
    if (!entry) return Response.json({ ok: false, message: "Guestbook entry not found." }, { status: 404 });
    return Response.json({ ok: true, entry }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, message: "Could not load the guestbook entry." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Send valid JSON." }, { status: 400 });
  }
  const result = validateGuestbook(body);
  if (!result.valid) {
    return Response.json({ ok: false, message: "Please correct the fields below.", errors: result.errors }, { status: 400 });
  }
  try {
    const { id } = await params;
    const entry = await guestbookStore.update(id, result.values);
    if (!entry) return Response.json({ ok: false, message: "Guestbook entry not found." }, { status: 404 });
    return Response.json({ ok: true, entry });
  } catch {
    return Response.json({ ok: false, message: "Could not save the guestbook entry." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!await guestbookStore.delete(id)) {
      return Response.json({ ok: false, message: "Guestbook entry not found." }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ ok: false, message: "Could not delete the guestbook entry." }, { status: 500 });
  }
}
