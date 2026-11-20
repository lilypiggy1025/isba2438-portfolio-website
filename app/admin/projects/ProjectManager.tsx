"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project, ProjectInput } from "@/lib/projects/types";
import { validateProject, type ProjectErrors } from "@/lib/projects/validation";
import styles from "./projects.module.css";

const emptyValues: ProjectInput = { title: "", subtitle: "", description: "", image: "", icon: "" };
const fields = ["title", "subtitle", "description", "image"] as const;
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default function ProjectManager({ initialAuthenticated, images }: { initialAuthenticated: boolean; images: string[] }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [loading, setLoading] = useState(initialAuthenticated);
  const [pending, setPending] = useState(false);
  const [entries, setEntries] = useState<Project[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [values, setValues] = useState<ProjectInput>(emptyValues);
  const [errors, setErrors] = useState<ProjectErrors>({});
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
    const response = await fetch("/api/projects", { cache: "no-store", credentials: "same-origin", signal });
    if (signal?.aborted) return false;
    if (response.status === 401) {
      setAuthenticated(false);
      setEntries([]);
      return false;
    }
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Could not load projects.");
    if (signal?.aborted) return false;
    setEntries(result.projects);
    setAuthenticated(true);
    return true;
  }

  useEffect(() => {
    if (!initialAuthenticated) return;
    const controller = new AbortController();
    async function checkSession() {
      try {
        await loadEntries(controller.signal);
      } catch {
        if (!controller.signal.aborted) setError("Could not load projects. Please sign in to try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void checkSession();
    return () => controller.abort();
  }, [initialAuthenticated]);

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
      setEditingSlug(null);
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
    if (busy.current) return;
    const existing = entries.find((entry) => entry.slug === editingSlug);
    const result = validateProject(values, existing?.layout);
    setErrors(result.errors);
    setStatus("");
    if (!result.valid) {
      const firstInvalid = fields.find((field) => result.errors[field]);
      editor.current?.querySelector<HTMLElement>(`#project-edit-${firstInvalid}`)?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(editingSlug ? `/api/projects/${encodeURIComponent(editingSlug)}` : "/api/projects", {
        method: editingSlug ? "PUT" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.values),
      });
      if (response.status === 401) { returnToLogin(); return; }
      const feedback = await response.json();
      if (!response.ok || !feedback.ok) {
        setErrors(feedback.errors ?? {});
        throw new Error(feedback.message || "Could not save the project. Please try again.");
      }
      setEntries((previous) => editingSlug ? previous.map((entry) => entry.slug === editingSlug ? feedback.project : entry) : [...previous, feedback.project]);
      router.refresh();
      setEditingSlug(null);
      setValues(emptyValues);
      setStatus(editingSlug ? "Project updated." : "Project created.");
      try { await loadEntries(); } catch { setError("Project saved, but the list could not be refreshed. Reload the page to retry."); }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the project. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function deleteEntry(entry: Project) {
    if (busy.current || !window.confirm(`Delete “${entry.title}”? This removes the project from its public page.`)) return;
    busy.current = true;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(entry.slug)}`, { method: "DELETE", credentials: "same-origin" });
      if (response.status === 401) { returnToLogin(); return; }
      if (response.status !== 204) {
        const feedback = await response.json();
        throw new Error(feedback.message || "Could not delete the project. Please try again.");
      }
      setEntries((previous) => previous.filter((item) => item.slug !== entry.slug));
      if (editingSlug === entry.slug) { setEditingSlug(null); setValues(emptyValues); setErrors({}); }
      setStatus("Project deleted.");
      router.refresh();
      try { await loadEntries(); } catch { setError("Project deleted, but the list could not be refreshed. Reload the page to retry."); }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the project. Please try again.");
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
        <div className={styles.toolbar}><p>{entries.length} {entries.length === 1 ? "project" : "projects"}</p><button type="button" disabled={pending} onClick={logout}>Logout</button></div>
        <form ref={editor} className={styles.panel} onSubmit={save} noValidate>
          <h2>{editingSlug ? "Edit project" : "Create project"}</h2>
          <fieldset disabled={pending || loading}>
            {fields.map((field) => <div key={field}>
              <label htmlFor={`project-edit-${field}`}>{field === "image" ? "Cover image" : field[0].toUpperCase() + field.slice(1)}{field === "subtitle" ? " (optional)" : ""}</label>
              {field === "image" ? <select id="project-edit-image" required value={values.image}
                aria-invalid={Boolean(errors.image)} aria-describedby={errors.image ? "image-error" : undefined}
                onChange={(event) => setValues((previous) => ({ ...previous, image: event.target.value }))}>
                <option value="">Select a local image</option>
                {values.image && !images.includes(values.image) && <option value={values.image}>{values.image} (current image)</option>}
                {images.map((image) => <option key={image} value={image}>{image}</option>)}
              </select> : field === "description" ? <textarea id="project-edit-description" rows={6} value={values.description} maxLength={10000}
                aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}
                onChange={(event) => setValues((previous) => ({ ...previous, description: event.target.value }))} /> :
                <input id={`project-edit-${field}`} required={field === "title"} maxLength={field === "title" ? 120 : 200} value={values[field]}
                  aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}
                  onChange={(event) => setValues((previous) => ({ ...previous, [field]: event.target.value }))} />}
              {errors[field] && <p id={`${field}-error`} className={styles.error}>{errors[field]}</p>}
            </div>)}
            {images.length === 0 && <p>No local cover images were found.</p>}
            <div className={styles.actions}><button type="submit">{pending ? "Saving…" : editingSlug ? "Save changes" : "Create project"}</button>{editingSlug && <button type="button" onClick={() => { setEditingSlug(null); setValues(emptyValues); setErrors({}); }}>Cancel</button>}</div>
          </fieldset>
        </form>
        {entries.length === 0 && <p className={styles.panel}>No projects yet.</p>}
        <div className={styles.list}>{entries.map((entry) => <article className={styles.panel} key={entry.slug}>
          <h2>{entry.title}</h2>
          {entry.subtitle && <p>{entry.subtitle}</p>}
          <p><Link href={`/projects/${entry.slug}`} prefetch={false}>View public project</Link></p>
          {(entry.slug === "creative-space" || entry.slug === "inspiration-board") && entry.createdAt === "1970-01-01T00:00:00.000Z"
            ? <p>Original project</p>
            : <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>}
          <p className={styles.message}>{entry.description || "No description."}</p>
          <p>Cover image — {entry.image}</p>
          <p>Layout — {entry.layout}</p>
          <div className={styles.actions}>
            <button type="button" disabled={pending || loading} aria-label={`Edit ${entry.title}`} onClick={() => {
              setEditingSlug(entry.slug);
              setValues({ title: entry.title, subtitle: entry.subtitle ?? "", description: entry.description ?? "", image: entry.image, icon: entry.icon ?? "" });
              setErrors({}); setError(""); setStatus("");
              editor.current?.querySelector<HTMLInputElement>("#project-edit-title")?.focus();
            }}>Edit</button>
            <button type="button" disabled={pending || loading} aria-label={`Delete ${entry.title}`} onClick={() => deleteEntry(entry)}>Delete</button>
          </div>
        </article>)}</div>
      </>}
  </div>;
}
