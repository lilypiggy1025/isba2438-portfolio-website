"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GuestbookEntry as Entry } from "@/lib/guestbook/types";
import { validateGuestbook, type GuestbookErrors } from "@/lib/guestbook/validation";
import GuestbookEntry from "./GuestbookEntry";
import styles from "./guestbook.module.css";

export default function Guestbook() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<GuestbookErrors>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const busy = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/guestbook", { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || "Could not load guestbook entries.");
        if (!controller.signal.aborted) setEntries(result.entries);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
          setError(error instanceof Error ? error.message : "Could not load guestbook entries. Please refresh to try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  function clearDraft() {
    setName("");
    setMessage("");
    setEditingId(null);
    setErrors({});
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || loading || loadFailed) return;
    const result = validateGuestbook({ name, message });
    setErrors(result.errors);
    setStatus("");
    if (!result.valid) {
      if (result.errors.name) nameInput.current?.focus();
      else messageInput.current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(editingId ? `/api/guestbook/${encodeURIComponent(editingId)}` : "/api/guestbook", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.values),
      });
      const feedback = await response.json();
      if (!response.ok || !feedback.ok) {
        setErrors(feedback.errors ?? {});
        throw new Error(feedback.message || "Could not save your entry. Please try again.");
      }
      const saved: Entry = feedback.entry;
      setEntries((previous) => editingId ? previous.map((entry) => entry.id === editingId ? saved : entry) : [saved, ...previous]);
      setStatus(editingId ? "Entry updated." : "Thank you! Your entry has been saved.");
      clearDraft();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your entry. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function deleteEntry(entry: Entry) {
    if (busy.current || !window.confirm(`Delete the entry by ${entry.name}?`)) return;
    busy.current = true;
    setPending(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch(`/api/guestbook/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      if (response.status !== 204) {
        const feedback = await response.json();
        throw new Error(feedback.message || "Could not delete the entry. Please try again.");
      }
      setEntries((previous) => previous.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) clearDraft();
      setStatus("Entry deleted.");
      nameInput.current?.focus();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the entry. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <div className={styles.workspace} aria-busy={pending || loading}>
    <section className={styles.paper} aria-labelledby="guestbook-form-heading">
      <h2 id="guestbook-form-heading">{editingId ? "Edit your entry" : "Leave a little note"}</h2>
      <form onSubmit={save} noValidate>
        <fieldset disabled={pending || loading || loadFailed}>
          <label htmlFor="guestbook-name">Name</label>
          <input id="guestbook-name" ref={nameInput} required maxLength={60} autoComplete="name" value={name}
            aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "guestbook-name-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (!validateGuestbook({ name: event.target.value, message }).errors.name) setErrors((previous) => ({ ...previous, name: undefined }));
            }} />
          {errors.name && <p id="guestbook-name-error" role="alert" className={styles.fieldError}>{errors.name}</p>}
          <label htmlFor="guestbook-message">Message</label>
          <textarea id="guestbook-message" ref={messageInput} required maxLength={500} rows={6} value={message}
            aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "guestbook-message-error" : undefined}
            onChange={(event) => {
              setMessage(event.target.value);
              if (!validateGuestbook({ name, message: event.target.value }).errors.message) setErrors((previous) => ({ ...previous, message: undefined }));
            }} />
          {errors.message && <p id="guestbook-message-error" role="alert" className={styles.fieldError}>{errors.message}</p>}
          <div className={styles.actions}>
            <button className={styles.primary} type="submit">{pending ? "Saving…" : editingId ? "Save changes" : "Sign guestbook"}</button>
            {editingId && <button type="button" onClick={clearDraft}>Cancel editing</button>}
          </div>
        </fieldset>
      </form>
      <p role="alert" className={styles.error}>{error}</p>
      {loadFailed && <p>Refresh the page to try loading the guestbook again.</p>}
      <p role="status" className={styles.status}>{status}</p>
    </section>
    <section className={styles.collection} aria-labelledby="guestbook-entries-heading">
      <h2 id="guestbook-entries-heading">Little notes from visitors</h2>
      {loading && <p role="status">Loading guestbook entries…</p>}
      {!loading && !loadFailed && entries.length === 0 && <p className={styles.empty}>A fresh page awaits. Leave the first little note.</p>}
      <div className={styles.list}>
        {entries.map((entry) => <GuestbookEntry key={entry.id} entry={entry} disabled={pending} onDelete={deleteEntry} onEdit={(selected) => {
          if (busy.current) return;
          setEditingId(selected.id);
          setName(selected.name);
          setMessage(selected.message);
          setErrors({});
          setError("");
          setStatus("");
          nameInput.current?.focus();
        }} />)}
      </div>
    </section>
  </div>;
}
