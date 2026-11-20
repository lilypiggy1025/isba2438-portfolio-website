import { requireContactAdmin, protectedError, protectedHeaders } from "@/lib/contact/auth";
import { contactStore } from "@/lib/contact/storage";

export { postContact as POST } from "@/lib/contact/post";

export async function GET(request: Request) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  try {
    return Response.json({ ok: true, submissions: await contactStore.list() }, { headers: protectedHeaders });
  } catch {
    return protectedError("Could not load contact submissions.", 500);
  }
}
