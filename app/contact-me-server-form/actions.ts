"use server";

import { validateContact, type ContactValues, type FieldErrors } from "@/lib/contact/validation";
import { contactStore } from "@/lib/contact/storage";

export type FormState = {
  status: "idle" | "invalid" | "success" | "failure";
  message: string;
  values: ContactValues;
  errors: FieldErrors;
};

export async function submitContact(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = validateContact({ name: formData.get("name"), email: formData.get("email"), message: formData.get("message") });
  if (!result.valid) return { status: "invalid", message: "Please correct the fields below. Your message has not been saved.", values: result.values, errors: result.errors };
  try {
    await contactStore.save(result.values);
    return { status: "success", message: "Thank you! Your message has been saved successfully.", values: { name: "", email: "", message: "" }, errors: {} };
  } catch {
    return { status: "failure", message: "Your message could not be saved because of a server or storage error. Please try again.", values: result.values, errors: {} };
  }
}
