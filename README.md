# Liwen Chen — Creative Portfolio

Santa Clara University · ISBA 2438 · Assignment 2, Part 1

## Project Overview

A creative personal portfolio built with Next.js App Router, React, TypeScript, and CSS Modules, with Tailwind CSS available in the existing setup. The site combines a soft scrapbook aesthetic with photography and an interactive homepage.

## Implemented Pages

| Route | Page |
| --- | --- |
| `/` | Home |
| `/about-me` | About Me |
| `/projects` | Projects |
| `/contact-me-server-form` | Server Contact Form |
| `/projects/creative-space` | Creative Space project detail |
| `/projects/inspiration-board` | Inspiration Board project detail |

Project details use `app/projects/[slug]/page.tsx`. The supported slugs are `creative-space` and `inspiration-board`; unknown slugs call `notFound()` and return a 404 page. Part 2's `/contact-me` page and `/api/contact` endpoint are not implemented.

## Key Features

- Responsive creative portfolio interface with shared, pathname-aware navigation.
- Mouse-following homepage photo trail with reduced-motion support.
- Two distinct dynamic project detail pages, including a photography lightbox and an editorial inspiration collage.
- Server-side contact form validation with clear success, validation-error, and failure feedback.
- Local JSON storage for valid contact submissions.

## Contact Form Data Flow

Browser form → Next.js Server Action → server-side validation → local JSON storage → success or error feedback.

- `app/contact-me-server-form/actions.ts` handles submissions and returns feedback. Invalid submissions return before storage is called.
- `lib/contact/validation.ts` trims Name and Message and rejects empty or whitespace-only values. Email must contain exactly one `@`, nonempty local and domain parts, at least one domain dot, no empty domain labels, and no whitespace.
- `lib/contact/storage.ts` appends valid submissions to `data/contact-submissions.json`, relative to the project working directory. Each record includes an ID and creation timestamp. The directory and file are created on the first successful save if absent.

The storage module reads existing records, writes an updated JSON array to a temporary file, and replaces the destination atomically. A process-local queue serializes writes within one server process. The module can be reused by a future Part 2 implementation.

## Running Locally

Install Node.js and npm, then run from the project root:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` and visit `/contact-me-server-form` to use the server form.

The scripts defined in `package.json` are:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Attempt a production build |
| `npm run start` | Start the production server after a successful build |

The existing standalone tests import TypeScript directly. Running them with `node --test tests/contact.test.mjs` requires a Node.js version supporting native TypeScript type stripping; the recorded test run used Node.js 26.13.0. There is no `npm test` script.

## Validation and Testing

These are historical results, not checks rerun for this README update:

- **Recorded automated checks:** ESLint passed; `npx tsc --noEmit --incremental false` passed; both tests in `tests/contact.test.mjs` passed. Tests cover validation, concurrent saves within one store instance, preservation of existing records, malformed JSON, and filesystem failures. The test run emitted a Node.js module-format warning.
- **Recorded interaction simulation:** a 15-second photo-trail timing simulation passed. This was a logic simulation, not a browser interaction test.
- **User-reported browser checks:** a valid contact submission displayed success; empty Name, invalid Email, and empty Message each displayed validation feedback. These browser checks were reported by the user, not independently performed by Codex.
- **Recorded read-only verification:** the specified valid test record was found in the local JSON array, and no records violating the checked validation rules were found at that inspection. Private record contents are intentionally omitted here.
- **Production build limitation:** previous `npm run build` attempts failed because Turbopack CSS processing could not bind a local port (`Operation not permitted`), including retries. A successful production build has **not** been verified.

Current browser behavior, screenshots, and a successful production deployment were not independently retested for this documentation update. Historical passing checks do not establish that every subsequent revision has been tested.

## Storage and Deployment Limitations

JSON persistence requires a writable filesystem and a Node.js server environment. Files may be ephemeral on serverless hosts or disappear during redeployment. The process-local queue does not coordinate multiple processes or deployment instances.

This assignment's local JSON storage is not a durable multi-instance production database. A production deployment would need suitable persistent storage and cross-instance concurrency handling.

## Privacy

`data/contact-submissions.json` and its temporary write files are excluded by `.gitignore`. Contact submissions must not be published, committed, included in public archives, or uploaded with deployment artifacts. Do not force-add ignored data files. Ignore rules do not remove files already tracked by Git, so review the submission file list before publishing.

Environment files, `node_modules`, and `.next` are also ignored. Keep credentials and personal submission data out of public documentation and screenshots.
