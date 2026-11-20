# Liwen Chen — Creative Portfolio

Santa Clara University · ISBA 2438 · Assignment 2, Parts 1 and 2 · Midterm Expanded Portfolio (`midterm`)

## Project Overview

A personal portfolio built with Next.js 16.4.6 App Router, React 19.3.0, TypeScript, and CSS Modules, with Tailwind CSS available in the existing setup. The Midterm extends Assignment 2 with browser-persisted Favorites, a full-CRUD Guestbook, and Blog, Project, and Contact management. Photography, sage-green accents, cream paper surfaces, and scrapbook details connect the pages visually.

## Implemented Pages

| Route | Purpose |
| --- | --- |
| `/` | Interactive homepage with a mouse-following photo trail |
| `/about-me` | Personal profile |
| `/projects` | Backend-driven project listing |
| `/projects/creative-space` | Original photography gallery and keyboard-accessible lightbox |
| `/projects/inspiration-board` | Original editorial photography collage |
| `/projects/[slug]` | Project details, including a scrapbook layout for newly created standard projects |
| `/blogs` | Creative Journal listing |
| `/blogs/[slug]` | Individual article with Edit and Delete controls |
| `/admin/blogs` | Blog publishing form; publishing requires an administrator session |
| `/my-favorites` | Browser-local Movies, Books, Music, and Websites collection |
| `/my-guestbook` | Visitor guestbook with create, read, edit, and delete |
| `/contact-me` | Assignment 2 Part 2 contact form using the JSON API |
| `/contact-me-server-form` | Assignment 2 Part 1 contact form using a Server Action |
| `/admin/contacts` | Administrator login and protected submission management |
| `/admin/projects` | Shared administrator login and project management |
| `/my-notes` | Compatibility redirect to `/my-favorites` |

## Midterm Features

### Favorites

Favorites have a required title and category, plus an optional description. Users can create, view, edit, and delete records. The client component saves JSON under `liwen-portfolio:my-favorites:v1` in browser LocalStorage and restores it after refresh.

Missing keys and empty arrays show an empty state. Malformed JSON, invalid records, or unavailable storage display English errors. Loading failures disable saving and preserve stored data. Failed writes retain the draft and previous collection. Favorites belong to the current browser and origin; clearing browser data removes them. The previous My Notes storage key is preserved separately.

### Guestbook

Visitors can create, view, edit, and delete entries containing a name and message. `Guestbook.tsx` owns form state and API requests, passing entry data, callbacks, and pending state through props to the reusable `GuestbookEntry.tsx` child.

The API validates names up to 60 characters and messages up to 500 characters, then persists entries with IDs and timestamps in server-side JSON. Inline errors, loading and empty states, success feedback, and delete confirmation support the workflow. Guestbook CRUD is public, including editing and deleting visitor entries. Successful creation logs the generated entry ID and HTTP status 201 without logging submitted content.

### Blogs, Projects, and Contact CRUD

- **Blogs** support public listing/detail reads and administrator-authorized creation, updates, and deletion. Editing retains the original slug and creation timestamp. Sign in through an administrator login page before using `/admin/blogs` or article management controls.
- **Projects** support public reads and administrator-authorized creation, updates, and deletion. Existing gallery/collage layouts and image collections are preserved. New projects use the standard detail layout. Management selects existing local public images. Updates preserve slugs, layout types, and creation timestamps.
- **Contact** retains both public submission forms and their shared validation/storage. Administrators can list, read, edit, and delete submissions separately at `/admin/contacts`. Submission IDs and creation timestamps survive edits.

Contact and Project management share the same administrator session used for Blog mutations. Authentication is enforced on the server before protected data access or mutation. Signed sessions expire after one hour and use HttpOnly, SameSite=Strict cookies, with Secure enabled in production. Authenticated mutations also require a matching Origin. Logout clears the browser cookie; a copied stateless token remains valid until expiry or secret rotation.

## APIs and Data Flow

| Endpoint | Methods | Access |
| --- | --- | --- |
| `/api/blogs` | GET, POST | GET public; POST administrator |
| `/api/blogs/[slug]` | PUT, DELETE | Administrator |
| `/api/projects` | GET, POST | GET public; POST administrator |
| `/api/projects/[slug]` | GET, PUT, DELETE | GET public; mutations administrator |
| `/api/guestbook` | GET, POST | Public |
| `/api/guestbook/[id]` | GET, PUT, DELETE | Public |
| `/api/contacts` | GET, POST | GET administrator; POST public |
| `/api/contacts/[id]` | GET, PUT, DELETE | Administrator |
| `/api/contact` | POST | Public compatibility alias |
| `/api/contact-admin/session` | POST, DELETE | Same-origin login and logout |

Successful creation returns HTTP 201, reads and updates return 200, and deletion returns 204 with no body. APIs use 400 for invalid input, 401 for denied protected access, 404 for missing records, and generic 500 responses for storage failures.

Favorites flow from the client component directly to browser LocalStorage. Guestbook and management interfaces send requests to Route Handlers, which validate input and call shared storage modules under `lib/`. Public Project pages and Blog detail pages read those stores on the server. The Part 1 Contact Server Action calls the Contact store directly.

| Server-side file | Records |
| --- | --- |
| `data/blog-posts.json` | Blog articles |
| `data/projects.json` | Projects |
| `data/guestbook-entries.json` | Guestbook entries |
| `data/contact-submissions.json` | Contact submissions |

Stores serialize mutations within each store instance and write through unique temporary files followed by atomic rename. Missing Blog, Guestbook, and Contact files start empty. Missing Project storage uses the original two project seeds, which are included in the first persisted mutation. An existing empty Projects array remains empty. Malformed storage is rejected without overwriting it.

## Running Locally

Use Node.js with native TypeScript type stripping and `node:module` registration hooks for the tests. The project has been tested with Node.js v26.13.0 and npm.

From the repository root, install dependencies and start development mode.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. For administrator operations, configure `CONTACT_ADMIN_SECRET` in the ignored `.env.local` file using a securely generated random value of at least 32 characters. Keep it server-side. Restart the development server after configuring it, then sign in at `/admin/contacts` or `/admin/projects` using that value. Use the same browser and hostname for Blog management. Missing or insufficient configuration denies administrator access. No credentials are included in this repository.

Available package scripts are `npm run dev`, `npm run lint`, `npm run build`, and `npm run start`. To run the production server, complete the build first.

```bash
npm run build
npm run start
```

## Testing and Validation

```bash
node --test tests/*.test.mjs
npm run lint
npx tsc --noEmit --incremental false
```

The current suite has **38 passing automated tests**. ESLint, TypeScript, and whitespace checks passed. Tests cover isolated JSON persistence, validation, CRUD APIs, administrator sessions and Origin protection, project seed/dynamic-route behavior, and Favorites parsing and mocked component feedback. Component/source checks supplement API tests; they do not replace browser interaction testing. Backend tests use temporary storage, and Favorites tests use isolated browser-API mocks.

After the final Blog POST authorization change, the project owner confirmed two successful Mac production builds with Next.js 16.4.6 and generation of all 23 static pages. Builds inside the restricted Codex environment encountered a separate Turbopack local-port-binding restriction. Node tests may emit non-failing module-type warnings.

## Storage, Privacy, and Deployment

Runtime JSON files and their temporary files are excluded by `.gitignore`, along with environment files, `node_modules`, and `.next`. Local submissions and posts are intentionally absent from a fresh clone. Keep Contact personal information and administrator credentials out of commits, screenshots, and deployment archives.

Server-side JSON persistence requires a writable, persistent filesystem and a Node.js runtime. Serverless filesystems may be ephemeral, and process-local queues do not coordinate independent processes or deployment instances. Durable multi-instance hosting requires suitable persistent storage and concurrency handling. Production administrator login requires HTTPS for Secure cookies.

## MIT License

Licensed under the [MIT License](LICENSE). Copyright (c) 2026 LIWEN CHEN. The bundled Pinyon Script font retains its separate license in `public/fonts/PinyonScript-OFL.txt`.
