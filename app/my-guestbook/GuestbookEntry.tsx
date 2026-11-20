import type { GuestbookEntry as Entry } from "@/lib/guestbook/types";
import styles from "./guestbook.module.css";

type Props = {
  entry: Entry;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  disabled: boolean;
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default function GuestbookEntry({ entry, onEdit, onDelete, disabled }: Props) {
  return <article className={styles.card}>
    <h3>{entry.name}</h3>
    <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>
    <p className={styles.message}>{entry.message}</p>
    <div className={styles.actions}>
      <button type="button" disabled={disabled} onClick={() => onEdit(entry)} aria-label={`Edit entry by ${entry.name}`}>Edit</button>
      <button type="button" disabled={disabled} onClick={() => onDelete(entry)} aria-label={`Delete entry by ${entry.name}`}>Delete</button>
    </div>
  </article>;
}
