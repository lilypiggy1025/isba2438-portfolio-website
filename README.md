# Liwen Chen — Creative Portfolio

Santa Clara University · ISBA 2438 · Assignment 2, Parts 1 and 2

## Project Overview

A creative personal portfolio built with Next.js App Router, React, TypeScript, and CSS Modules, with Tailwind CSS available in the existing setup. The site combines a soft scrapbook aesthetic with photography and an interactive homepage.

## Implemented Pages

| Route | Page |
| --- | --- |
| `/` | Home |
| `/about-me` | About Me |
| `/projects` | Projects |
| `/contact-me` | Part 2 contact form using the JSON API |
| `/contact-me-server-form` | Part 1 contact form using a Server Action |
| `/admin/blogs` | Publish a blog post |
| `/blogs` | Public Creative Journal and published posts |
| `/blogs/[slug]` | Individual blog post |
| `/projects/creative-space` | Creative Space project detail |
| `/projects/inspiration-board` | Inspiration Board project detail |

Project details use `app/projects/[slug]/page.tsx`. The supported slugs are `creative-space` and `inspiration-board`; unknown slugs call `notFound()` and return a 404 page.

## Key Features

- Responsive creative portfolio interface with shared, pathname-aware navigation.
- Mouse-following homepage photo trail with reduced-motion support.
- Two distinct dynamic project detail pages, including a photography lightbox and an editorial inspiration collage.
- Server-side contact form validation with clear success, validation-error, and failure feedback.
- Local JSON storage for valid contact submissions.

## Contact Forms

- **Part 1:** `/contact-me-server-form` submits through the Next.js Server Action in `app/contact-me-server-form/actions.ts`.
- **Part 2:** The shared Contact link opens `/contact-me`. Its client form sends `name`, `email`, and `message` as JSON to `POST /api/contacts`. `POST /api/contact` is a compatibility alias for the same handler. The API returns `201` on success, `400` for invalid input, and `500` if saving fails.

Both forms use the same server-side validation and storage modules in `lib/contact/`. Valid submissions go to `data/contact-submissions.json`, with an ID and creation timestamp for each record. Invalid submissions are rejected before writing.

## Blog

- `/admin/blogs` submits a title and content to `POST /api/blogs`. A successful publish returns `201` and the new post's URL. Posts are stored in `data/blog-posts.json` with unique slugs and creation timestamps.
- `/blogs` fetches published posts through `GET /api/blogs` and shows a prompt to create the first post when the list is empty.
- `/blogs/[slug]` displays the published post for that slug. The route proxy checks unknown slugs before streaming to return HTTP `404`, and the detail page also calls `notFound()` if the post is missing.

## Running Locally

Install Node.js (tested with v26.13.0) and npm, then run from the project root:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Use **Contact** for the Part 2 form or visit `/contact-me-server-form` directly for Part 1.

The scripts defined in `package.json` are:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Attempt a production build |
| `npm run start` | Start the production server after a successful build |

## Validation and Testing

The tests import TypeScript directly and require Node.js with native TypeScript type stripping. From the project root, run:

```bash
node --test tests/*.test.mjs
npx tsc --noEmit --incremental false
npm run lint
```

The tests cover contact validation, shared persistence across both contact API routes and the Server Action, and blog API validation, persistence, retrieval, and unique slugs.

In the audit environment, Turbopack's CSS processing was denied permission to bind a local port during `npm run build`. Production build completion has yet to be verified.

## Storage and Deployment Limitations

Both stores create their JSON file on the first successful save if it is absent. JSON persistence requires a writable filesystem and a Node.js server environment. Files may be ephemeral on serverless hosts or disappear during redeployment. The process-local queue does not coordinate multiple processes or deployment instances.

This assignment's local JSON storage is not a durable multi-instance production database. A production deployment would need suitable persistent storage and cross-instance concurrency handling.

## Privacy

`.gitignore` excludes `data/contact-submissions.json`, `data/blog-posts.json`, and both stores' temporary write files. A fresh clone starts without local submissions or posts. Contact submissions must not be published, committed, included in public archives, or uploaded with deployment artifacts. Do not force-add ignored data files. Ignore rules do not remove files already tracked by Git, so review the submission file list before publishing.

Environment files, `node_modules`, and `.next` are also ignored. Keep credentials and personal submission data out of public documentation and screenshots.
