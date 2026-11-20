"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./favorites.module.css";
import { CATEGORIES, isCategory, parseFavorites, type Favorite } from "./favorites-data";

const STORAGE_KEY = "liwen-portfolio:my-favorites:v1";
export default function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ title: "", category: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const categoryInput = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setFavorites(parseFavorites(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setLoadFailed(true);
        setError("Saved favorites could not be loaded. Storage may be unavailable or the saved data may be invalid. Your stored data has been preserved. Correct it and refresh to try again.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function persist(nextFavorites: Favorite[], message: string): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFavorites));
      setFavorites(nextFavorites);
      setError("");
      setStatus(message);
      return true;
    } catch {
      setStatus("");
      setError("This change could not be saved. Browser storage may be full or unavailable. Your previously saved favorites and current draft have been kept. Please try again.");
      return false;
    }
  }

  function clearDraft() {
    setFieldErrors({ title: "", category: "" });
    setTitle("");
    setDescription("");
    setCategory("");
    setEditingId(null);
  }

  function saveFavorite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || loadFailed) return;
    const errors = {
      title: title.trim() ? "" : "Please enter a title.",
      category: isCategory(category) ? "" : "Please select a category.",
    };
    setFieldErrors(errors);
    if (errors.title || errors.category) {
      setStatus("");
      if (errors.title) titleInput.current?.focus();
      else categoryInput.current?.focus();
      return;
    }
    if (!isCategory(category)) return;
    const favorite = { id: editingId ?? window.crypto.randomUUID(), title: title.trim(), category, description: description.trim() };
    const nextFavorites = editingId ? favorites.map((item) => item.id === editingId ? favorite : item) : [favorite, ...favorites];
    if (persist(nextFavorites, editingId ? "Favorite updated." : "Favorite saved.")) clearDraft();
  }

  function deleteFavorite(favorite: Favorite) {
    if (!window.confirm(`Delete “${favorite.title}”?`)) return;
    if (persist(favorites.filter((item) => item.id !== favorite.id), "Favorite deleted.")) {
      if (editingId === favorite.id) clearDraft();
      titleInput.current?.focus();
    }
  }

  return <div className={styles.workspace}>
    <section className={styles.paper} aria-labelledby="favorite-editor-heading">
      <h2 id="favorite-editor-heading">{editingId ? "Edit your favorite" : "Add a favorite"}</h2>
      <form onSubmit={saveFavorite} noValidate className={styles.form}>
        <fieldset disabled={!ready || loadFailed}>
          <label htmlFor="favorite-title">Title</label>
          <input
            ref={titleInput}
            id="favorite-title"
            required
            value={title}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "favorite-title-error" : undefined}
            onChange={(event) => {
              setTitle(event.target.value);
              if (event.target.value.trim()) setFieldErrors((errors) => ({ ...errors, title: "" }));
            }}
          />
          {fieldErrors.title && <p id="favorite-title-error" role="alert" className={styles.fieldError}>{fieldErrors.title}</p>}
          <label htmlFor="favorite-category">Category</label>
          <select
            ref={categoryInput}
            id="favorite-category"
            required
            value={category}
            aria-invalid={Boolean(fieldErrors.category)}
            aria-describedby={fieldErrors.category ? "favorite-category-error" : undefined}
            onChange={(event) => {
              setCategory(event.target.value);
              if (isCategory(event.target.value)) setFieldErrors((errors) => ({ ...errors, category: "" }));
            }}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          {fieldErrors.category && <p id="favorite-category-error" role="alert" className={styles.fieldError}>{fieldErrors.category}</p>}
          <label htmlFor="favorite-description">Description (optional)</label>
          <textarea
            id="favorite-description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className={styles.actions}>
            <button type="submit">{editingId ? "Save changes" : "Save favorite"}</button>
            {editingId && <button type="button" className={styles.secondary} onClick={clearDraft}>Cancel editing</button>}
          </div>
        </fieldset>
      </form>
      <p role="alert" className={styles.error}>{error}</p>
      <p role="status" className={styles.status}>{status}</p>
    </section>
    <section aria-labelledby="saved-favorites-heading" className={styles.collection}>
      <h2 id="saved-favorites-heading">My little collection</h2>
      {!ready && <p role="status">Loading your favorites…</p>}
      {ready && !loadFailed && favorites.length === 0 && <p className={styles.empty}>A fresh page awaits. Save your first favorite to begin.</p>}
      <div className={styles.list}>
        {favorites.map((favorite) => <article key={favorite.id} className={styles.favorite}>
          <h3>{favorite.title}</h3>
          <span className={styles.category}>{favorite.category}</span>
          {favorite.description && <p>{favorite.description}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} aria-label={`Edit ${favorite.title}`} onClick={() => {
              setFieldErrors({ title: "", category: "" });
              setEditingId(favorite.id);
              setTitle(favorite.title);
              setDescription(favorite.description);
              setCategory(favorite.category);
              setStatus("");
              titleInput.current?.focus();
            }}>Edit</button>
            <button type="button" className={styles.secondary} aria-label={`Delete ${favorite.title}`} onClick={() => deleteFavorite(favorite)}>Delete</button>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
