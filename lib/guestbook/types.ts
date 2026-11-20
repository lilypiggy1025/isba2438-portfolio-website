export type CreateGuestbookInput = { name: string; message: string };
// Updates replace both editable fields while preserving identity and creation time.
export type UpdateGuestbookInput = CreateGuestbookInput;
export type GuestbookEntry = CreateGuestbookInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
