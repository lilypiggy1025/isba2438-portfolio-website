import { requireContactAdmin, protectedError, protectedHeaders } from "@/lib/contact/auth";
import { projectStore } from "@/lib/projects/storage";
import { validateProject } from "@/lib/projects/validation";

export async function GET() {
  try {
    return Response.json({ ok: true, projects: await projectStore.list() }, { headers: protectedHeaders });
  } catch {
    return protectedError("Could not load projects.", 500);
  }
}

export async function POST(request: Request) {
  const denied = requireContactAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return protectedError("Send valid JSON.", 400);
  }
  const result = validateProject(body);
  if (!result.valid) {
    return Response.json({ ok: false, message: "Please correct the fields below.", errors: result.errors }, {
      status: 400, headers: protectedHeaders,
    });
  }
  try {
    const project = await projectStore.create(result.values);
    return Response.json({ ok: true, project }, {
      status: 201, headers: { ...protectedHeaders, Location: `/api/projects/${project.slug}` },
    });
  } catch {
    return protectedError("Could not save the project.", 500);
  }
}
