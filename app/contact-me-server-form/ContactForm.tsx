"use client";

import { useActionState } from "react";
import { submitContact, type FormState } from "./actions";
import styles from "./page.module.css";

const initial: FormState = { status: "idle", message: "", values: { name: "", email: "", message: "" }, errors: {} };

export default function ContactForm() {
  const [state, action, pending] = useActionState(async (previous: FormState, data: FormData): Promise<FormState> => {
    try { return await submitContact(previous, data); }
    catch { return { ...previous, status: "failure", message: "The submission could not reach the server. Please try again." }; }
  }, initial);
  return <form action={action} noValidate className={styles.form} aria-labelledby="contact-heading">
    <h1 id="contact-heading" className={styles.heading}>Contact Me</h1>
    <div aria-live="polite" aria-atomic="true">
      {state.message && <p role={state.status === "success" ? "status" : "alert"} className={state.status === "success" ? styles.success : styles.error}>{state.message}</p>}
    </div>
    {(["name", "email", "message"] as const).map((field) => <div key={field} className={styles.field}>
      <label htmlFor={field}>{field[0].toUpperCase() + field.slice(1)}</label>
      {field === "message" ? <textarea id={field} name={field} rows={6} defaultValue={state.values[field]} required aria-invalid={Boolean(state.errors[field])} aria-describedby={state.errors[field] ? `${field}-error` : undefined} /> : <input id={field} name={field} type={field === "email" ? "email" : "text"} autoComplete={field} defaultValue={state.values[field]} required aria-invalid={Boolean(state.errors[field])} aria-describedby={state.errors[field] ? `${field}-error` : undefined} />}
      {state.errors[field] && <p id={`${field}-error`} className={styles.error}>{state.errors[field]}</p>}
    </div>)}
    <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send Message →"}</button>
  </form>;
}
