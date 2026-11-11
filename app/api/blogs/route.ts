import { blogStore } from "@/lib/blog/storage";
import { validateBlog } from "@/lib/blog/validation";

export async function GET() {
  try {
    return Response.json({ ok: true, posts: await blogStore.list() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ ok: false, message: "Could not load blog posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Send valid JSON." }, { status: 400 });
  }

  const result = validateBlog(body);
  if (!result.valid) {
    return Response.json(
      { ok: false, message: "Check the fields below.", errors: result.errors },
      { status: 400 },
    );
  }

  try {
    const post = await blogStore.save(result.values);
    return Response.json({ ok: true, post }, {
      status: 201,
      headers: { Location: "/blogs/" + post.slug },
    });
  } catch {
    return Response.json({ ok: false, message: "Could not save the post. Please try again." }, { status: 500 });
  }
}
