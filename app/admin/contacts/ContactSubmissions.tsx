"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ContactSubmission } from "@/lib/contact/storage";
import { validateContact, type ContactValues, type FieldErrors } from "@/lib/contact/validation";
import styles from "./contacts.module.css";

const emptyValues: ContactValues = { name: "", email: "", message: "" };
const fields = ["name", "email", "message"] as const;
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default function ContactSubmissions() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [entries, setEntries] = useState<ContactSubmission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<ContactValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const busy = useRef(false);
  const editor = useRef<HTMLFormElement>(null);

  function returnToLogin() {
    setAuthenticated(false);
    setEntries([]);
    setStatus("");
    setError("Your session has expired or access was denied. Please sign in again.");
  }

  async function loadEntries(signal?: AbortSignal): Promise<boolean> {
    const response = await fetch("/api/contacts", { cache: "no-store", credentials: "same-origin", signal });
    if (signal?.aborted) return false;
    if (response.status === 401) {
      setAuthenticated(false);
      setEntries([]);
      return false;
    }
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Could not load contact submissions.");
    if (signal?.aborted) return false;
    setEntries(result.submissions);
    setAuthenticated(true);
    return true;
  }

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      try {
        await loadEntries(controller.signal);
      } catch {
        if (!controller.signal.aborted) setError("Could not load contact submissions. Please sign in to try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void checkSession();
    return () => controller.abort();
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    form.reset();
    if (!data.get("password")) {
      setError("Please enter the administrator password.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/contact-admin/session", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.get("password") }),
      });
      data.delete("password");
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Could not sign in. Please try again.");
      if (await loadEntries()) setStatus("Signed in successfully.");
      else returnToLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally {
      data.delete("password");
      busy.current = false;
      setPending(false);
    }
  }

  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/contact-admin/session", { method: "DELETE", credentials: "same-origin" });
      if (response.status !== 204 && response.status !== 401) throw new Error("Could not sign out. Please try again.");
      setAuthenticated(false);
      setEntries([]);
      setEditingId(null);
      setValues(emptyValues);
      setErrors({});
      setStatus("Signed out.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !editingId) return;
    const result = validateContact(values);
    setErrors(result.errors);
    setStatus("");
    if (!result.valid) {
      const firstInvalid = fields.find((field) => result.errors[field]);
      editor.current?.querySelector<HTMLElement>(`#contact-edit-${firstInvalid}`)?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/contacts/${encodeURIComponent(editingId)}`, {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.values),
      });
      if (response.status === 401) { returnToLogin(); return; }
      const feedback = await response.json();
      if (!response.ok || !feedback.ok) {
        setErrors(feedback.errors ?? {});
        throw new Error(feedback.message || "Could not save the submission. Please try again.");
      }
      setEntries((previous) => previous.map((entry) => entry.id === editingId ? feedback.submission : entry));
      setEditingId(null);
      setValues(emptyValues);
      setStatus("Submission updated.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the submission. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function deleteEntry(entry: ContactSubmission) {
    if (busy.current || !window.confirm(`Delete the submission from ${entry.name}?`)) return;
    busy.current = true;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/contacts/${encodeURIComponent(entry.id)}`, { method: "DELETE", credentials: "same-origin" });
      if (response.status === 401) { returnToLogin(); return; }
      if (response.status !== 204) {
        const feedback = await response.json();
        throw new Error(feedback.message || "Could not delete the submission. Please try again.");
      }
      setEntries((previous) => previous.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) { setEditingId(null); setValues(emptyValues); setErrors({}); }
      setStatus("Submission deleted.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the submission. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <div className={styles.manager} aria-busy={loading || pending}>
    <p role="alert" className={styles.error}>{error}</p>
    <p role="status" className={styles.status}>{status}</p>
    {loading ? <p role="status">Checking administrator session…</p> : !authenticated ?
      <form className={styles.panel} onSubmit={login} noValidate>
        <h2>Administrator sign in</h2>
        <label htmlFor="admin-password">Administrator password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
        <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form> : <>
        <div className={styles.toolbar}><p>{entries.length} {entries.length === 1 ? "submission" : "submissions"}</p><button type="button" disabled={pending} onClick={logout}>Logout</button></div>
        {editingId && <form ref={editor} className={styles.panel} onSubmit={save} noValidate>
          <h2>Edit submission</h2>
          <fieldset disabled={pending}>
            {fields.map((field) => <div key={field}>
              <label htmlFor={`contact-edit-${field}`}>{field[0].toUpperCase() + field.slice(1)}</label>
              {field === "message" ? <textarea id={`contact-edit-${field}`} rows={6} required value={values[field]}
                aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}
                onChange={(event) => setValues((previous) => ({ ...previous, [field]: event.target.value }))} /> :
                <input id={`contact-edit-${field}`} type={field === "email" ? "email" : "text"} required value={values[field]}
                  aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}
                  onChange={(event) => setValues((previous) => ({ ...previous, [field]: event.target.value }))} />}
              {errors[field] && <p id={`${field}-error`} className={styles.error}>{errors[field]}</p>}
            </div>)}
            <div className={styles.actions}><button type="submit">{pending ? "Saving…" : "Save changes"}</button><button type="button" onClick={() => { setEditingId(null); setValues(emptyValues); setErrors({}); }}>Cancel</button></div>
          </fieldset>
        </form>}
        {entries.length === 0 && <p className={styles.panel}>No contact submissions yet.</p>}
        <div className={styles.list}>{entries.map((entry) => <article className={styles.panel} key={entry.id}>
          <h2>{entry.name}</h2>
          <p><a href={`mailto:${entry.email}`}>{entry.email}</a></p>
          <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>
          <p className={styles.message}>{entry.message}</p>
          <div className={styles.actions}>
            <button type="button" disabled={pending} aria-label={`Edit submission from ${entry.name}`} onClick={() => {
              setEditingId(entry.id); setValues({ name: entry.name, email: entry.email, message: entry.message }); setErrors({}); setError(""); setStatus("");
            }}>Edit</button>
            <button type="button" disabled={pending} aria-label={`Delete submission from ${entry.name}`} onClick={() => deleteEntry(entry)}>Delete</button>
          </div>
        </article>)}</div>
      </>}
  </div>;
}
