import { requireContactAdmin, protectedHeaders } from "@/lib/contact/auth";
import { blogStore } from "@/lib/blog/storage";
import { validateBlog } from "@/lib/blog/validation";

type Context = { params: Promise<{ slug: string }> };

export async function PUT(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Send valid JSON." }, { status: 400, headers: protectedHeaders });
  }

  const result = validateBlog(body);
  if (!result.valid) {
    return Response.json(
      { ok: false, message: "Check the fields below.", errors: result.errors },
      { status: 400, headers: protectedHeaders },
    );
  }

  try {
    const { slug } = await params;
    const post = await blogStore.update(slug, result.values);
    if (!post) return Response.json({ ok: false, message: "Blog post not found." }, { status: 404, headers: protectedHeaders });
    return Response.json({ ok: true, post }, { headers: protectedHeaders });
  } catch {
    return Response.json({ ok: false, message: "Could not save the post. Please try again." }, { status: 500, headers: protectedHeaders });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  try {
    const { slug } = await params;
    if (!await blogStore.delete(slug)) {
      return Response.json({ ok: false, message: "Blog post not found." }, { status: 404, headers: protectedHeaders });
    }
    return new Response(null, { status: 204, headers: protectedHeaders });
  } catch {
    return Response.json({ ok: false, message: "Could not delete the post. Please try again." }, { status: 500, headers: protectedHeaders });
  }
}
