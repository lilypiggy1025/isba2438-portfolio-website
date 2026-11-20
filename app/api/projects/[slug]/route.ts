import { requireContactAdmin, protectedError, protectedHeaders } from "@/lib/contact/auth";
import { projectStore } from "@/lib/projects/storage";
import { validateProject } from "@/lib/projects/validation";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const project = await projectStore.find(slug);
    if (!project) return protectedError("Project not found.", 404);
    return Response.json({ ok: true, project }, { headers: protectedHeaders });
  } catch {
    return protectedError("Could not load the project.", 500);
  }
}

export async function PUT(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return protectedError("Send valid JSON.", 400);
  }
  try {
    const { slug } = await params;
    const existing = await projectStore.find(slug);
    if (!existing) return protectedError("Project not found.", 404);
    const result = validateProject(body, existing.layout);
    if (!result.valid) {
      return Response.json({ ok: false, message: "Please correct the fields below.", errors: result.errors }, {
        status: 400, headers: protectedHeaders,
      });
    }
    const project = await projectStore.update(slug, result.values);
    if (!project) return protectedError("Project not found.", 404);
    return Response.json({ ok: true, project }, { headers: protectedHeaders });
  } catch {
    return protectedError("Could not save the project.", 500);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  try {
    const { slug } = await params;
    if (!await projectStore.delete(slug)) return protectedError("Project not found.", 404);
    return new Response(null, { status: 204, headers: protectedHeaders });
  } catch {
    return protectedError("Could not delete the project.", 500);
  }
}
