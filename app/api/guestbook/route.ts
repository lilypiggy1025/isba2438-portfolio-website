import { guestbookStore } from "@/lib/guestbook/storage";
import { validateGuestbook } from "@/lib/guestbook/validation";

export async function GET() {
  try {
    return Response.json({ ok: true, entries: await guestbookStore.list() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ ok: false, message: "Could not load guestbook entries." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const entry = await guestbookStore.create(result.values);
    console.log(`[Guestbook] CREATE id=${entry.id} status=201`);
    return Response.json({ ok: true, entry }, {
      status: 201,
      headers: { Location: `/api/guestbook/${entry.id}` },
    });
  } catch {
    return Response.json({ ok: false, message: "Could not save the guestbook entry." }, { status: 500 });
  }
}
