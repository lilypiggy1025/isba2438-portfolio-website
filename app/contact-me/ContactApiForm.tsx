"use client";

import { useState, type FormEvent } from "react";
import type { FieldErrors } from "@/lib/contact/validation";
import styles from "../contact-me-server-form/page.module.css";

type Feedback = { ok: boolean; message: string; errors?: FieldErrors };

const fields = [
  { name: "name", label: "Name" },
  { name: "email", label: "Email" },
  { name: "message", label: "Message" },
] as const;

export default function ContactApiForm() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result: Feedback = await response.json();
      setFeedback(result);
      if (response.ok && result.ok) form.reset();
    } catch {
      setFeedback({ ok: false, message: "Could not complete the request. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className={styles.form} aria-labelledby="contact-heading" aria-busy={pending}>
      <h1 id="contact-heading" className={styles.heading}>Contact Me</h1>
      <div aria-live="polite" aria-atomic="true">
        {feedback && (
          <p className={feedback.ok ? styles.success : styles.error}>{feedback.message}</p>
        )}
      </div>
      {fields.map(({ name, label }) => {
        const error = feedback?.errors?.[name];
        const props = {
          id: name,
          name,
          required: true,
          disabled: pending,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? name + "-error" : undefined,
        };
        return (
          <div key={name} className={styles.field}>
            <label htmlFor={name}>{label}</label>
            {name === "message" ? (
              <textarea {...props} rows={6} />
            ) : (
              <input {...props} type={name === "email" ? "email" : "text"} autoComplete={name} />
            )}
            {error && <p id={name + "-error"} className={styles.error}>{error}</p>}
          </div>
        );
      })}
      <button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit"}</button>
    </form>
  );
}
