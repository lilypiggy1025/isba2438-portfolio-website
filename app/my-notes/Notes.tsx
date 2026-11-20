"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./notes.module.css";

const STORAGE_KEY = "liwen-portfolio:my-notes:v1";
type Note = { id: string; title: string; content: string };

function parseNotes(raw: string | null): Note[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Invalid notes collection.");
  const ids = new Set<string>();
  for (const note of data) {
    if (!note || typeof note !== "object" || typeof note.id !== "string" ||
      !note.id || ids.has(note.id) || typeof note.title !== "string" ||
      !note.title.trim() || typeof note.content !== "string" || !note.content.trim()) {
      throw new Error("Invalid note data.");
    }
    ids.add(note.id);
  }
  return data;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setNotes(parseNotes(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setLoadFailed(true);
        setError("Saved notes could not be loaded. Storage may be unavailable or the saved data may be invalid. Your stored data has been preserved. Correct it and refresh to try again.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function persist(nextNotes: Note[], message: string): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
      setNotes(nextNotes);
      setError("");
      setStatus(message);
      return true;
    } catch {
      setStatus("");
      setError("This change could not be saved. Browser storage may be full or unavailable. Your previously saved notes and current draft have been kept. Please try again.");
      return false;
    }
  }

  function clearDraft() {
    setFieldErrors({ title: "", content: "" });
    setTitle("");
    setContent("");
    setEditingId(null);
  }

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || loadFailed) return;
    const errors = {
      title: title.trim() ? "" : "Please enter a title.",
      content: content.trim() ? "" : "Please enter your note.",
    };
    setFieldErrors(errors);
    if (errors.title || errors.content) {
      setStatus("");
      if (errors.title) titleInput.current?.focus();
      else contentInput.current?.focus();
      return;
    }
    const note = { id: editingId ?? window.crypto.randomUUID(), title: title.trim(), content: content.trim() };
    const nextNotes = editingId ? notes.map((item) => item.id === editingId ? note : item) : [note, ...notes];
    if (persist(nextNotes, editingId ? "Note updated." : "Note saved.")) clearDraft();
  }

  function deleteNote(note: Note) {
    if (!window.confirm(`Delete “${note.title}”?`)) return;
    if (persist(notes.filter((item) => item.id !== note.id), "Note deleted.")) {
      if (editingId === note.id) clearDraft();
      titleInput.current?.focus();
    }
  }

  return <div className={styles.workspace}>
    <section className={styles.paper} aria-labelledby="note-editor-heading">
      <h2 id="note-editor-heading">{editingId ? "Edit your note" : "Capture a thought"}</h2>
      <form onSubmit={saveNote} noValidate className={styles.form}>
        <fieldset disabled={!ready || loadFailed}>
          <label htmlFor="note-title">Title</label>
          <input
            ref={titleInput}
            id="note-title"
            required
            value={title}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "note-title-error" : undefined}
            onChange={(event) => {
              setTitle(event.target.value);
              if (event.target.value.trim()) setFieldErrors((errors) => ({ ...errors, title: "" }));
            }}
          />
          {fieldErrors.title && <p id="note-title-error" role="alert" className={styles.fieldError}>{fieldErrors.title}</p>}
          <label htmlFor="note-content">Your note</label>
          <textarea
            ref={contentInput}
            id="note-content"
            required
            rows={7}
            value={content}
            aria-invalid={Boolean(fieldErrors.content)}
            aria-describedby={fieldErrors.content ? "note-content-error" : undefined}
            onChange={(event) => {
              setContent(event.target.value);
              if (event.target.value.trim()) setFieldErrors((errors) => ({ ...errors, content: "" }));
            }}
          />
          {fieldErrors.content && <p id="note-content-error" role="alert" className={styles.fieldError}>{fieldErrors.content}</p>}
          <div className={styles.actions}>
            <button type="submit">{editingId ? "Save changes" : "Save note"}</button>
            {editingId && <button type="button" className={styles.secondary} onClick={clearDraft}>Cancel editing</button>}
          </div>
        </fieldset>
      </form>
      <p role="alert" className={styles.error}>{error}</p>
      <p role="status" className={styles.status}>{status}</p>
    </section>
    <section aria-labelledby="saved-notes-heading" className={styles.collection}>
      <h2 id="saved-notes-heading">My little collection</h2>
      {!ready && <p role="status">Loading your notes…</p>}
      {ready && !loadFailed && notes.length === 0 && <p className={styles.empty}>A fresh page awaits. Save your first thought to begin.</p>}
      <div className={styles.list}>
        {notes.map((note) => <article key={note.id} className={styles.note}>
          <h3>{note.title}</h3>
          <p>{note.content}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} aria-label={`Edit ${note.title}`} onClick={() => {
              setFieldErrors({ title: "", content: "" });
              setEditingId(note.id);
              setTitle(note.title);
              setContent(note.content);
              setStatus("");
              titleInput.current?.focus();
            }}>Edit</button>
            <button type="button" className={styles.secondary} aria-label={`Delete ${note.title}`} onClick={() => deleteNote(note)}>Delete</button>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
