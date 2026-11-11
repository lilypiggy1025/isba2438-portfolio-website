import { contactStore } from "./storage";
import { validateContact } from "./validation";

export async function postContact(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Send a valid JSON object." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ ok: false, message: "Send a valid JSON object." }, { status: 400 });
  }

  const { name, email, message } = body as Record<string, unknown>;
  const result = validateContact({ name, email, message });
  if (!result.valid) {
    return Response.json(
      { ok: false, message: "Please correct the fields below.", errors: result.errors },
      { status: 400 },
    );
  }

  try {
    await contactStore.save(result.values);
    return Response.json(
      { ok: true, message: "Thank you! Your message has been saved successfully." },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { ok: false, message: "Your message could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
