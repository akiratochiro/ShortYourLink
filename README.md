# ShortYourLink

A full-stack URL shortener with click analytics, built as a portfolio project to demonstrate practical proficiency in **TypeScript, Next.js, Docker, and testing practices**.

**Live demo:** [shortyourlink.onrender.com](https://shortyourlink.onrender.com)

> Note: the live demo runs on Render's free tier, so the first request after a period of inactivity may take 30–60 seconds while the service wakes up.

---

## What it does

- Paste a long URL, get a short one back (e.g. `shortyourlink.onrender.com/aB3xY9`)
- Visiting a short link redirects to the original URL and logs a click (timestamp, referrer, user agent)
- A dashboard lists every link you've created, with a live click count per link
- No login required — each visitor is identified by an anonymous session cookie, so you only ever see your own links

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict, end-to-end typing) |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Validation | Zod |
| Styling | Tailwind CSS v4 |
| Testing | Jest (unit + integration) |
| Containerization | Docker + Docker Compose (multi-stage build) |
| Deployment | Render (app) + Neon (production database) |

## Architecture

```
app/
  page.tsx                       Landing page (Server Component)
  dashboard/page.tsx             Links + click stats (Server Component)
  [slug]/route.ts                Redirect handler (GET) + click logging
  api/links/route.ts             POST (create link), GET (list links)
lib/
  prisma.ts                      Prisma Client singleton
  slug.ts                        Unique slug generation
  validation.ts                  Zod schemas
  session.ts                     Anonymous session (cookie) logic
components/
  LinkForm.tsx                   Client Component — create link form
  LinkList.tsx                   Client Component — dashboard list
tests/
  slug.test.ts                   Unit tests (mocked Prisma)
  validation.test.ts             Unit tests
  api/links.test.ts              Integration tests (real test database)
prisma/
  schema.prisma
  migrations/
docker-compose.yml
Dockerfile
```

### Key architectural choices

**Server Components fetch data directly.** `dashboard/page.tsx` queries Prisma directly instead of calling its own `/api/links` route — no point in a server-to-server HTTP round trip when the data fetching can happen where the page is rendered. The `/api/links` route exists for the client-side form (`LinkForm.tsx`), which runs in the browser and genuinely needs an HTTP endpoint.

**Anonymous sessions via signed cookie, no auth.** A UUID is generated on first visit and stored in an `httpOnly`, `sameSite=lax` cookie. This scopes links to a visitor without the overhead of a full auth system, which was intentionally out of scope for this MVP.

**Slug generation avoids visually ambiguous characters** (no `0/O`, `1/l/I`) and validates uniqueness against the database with a bounded retry loop, rather than trusting randomness alone.

**URL validation rejects non-`http(s)` protocols.** Zod's built-in `.url()` validator accepts any valid URI scheme, including `javascript:` — since short links are used in a redirect (`NextResponse.redirect`), unrestricted schemes would open the door to URL scheme injection. A `.refine()` step restricts input to `http://` and `https://` only.

## Getting started locally

**Prerequisites:** Node 20+, Docker Desktop, Git.

```bash
git clone https://github.com/YOUR_USERNAME/ShortYourLink.git
cd ShortYourLink
npm install
```

Create a `.env` file:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/shortyourlink"
```

Start the local Postgres container and apply migrations:

```bash
docker-compose up -d db
npx prisma migrate deploy
```

Run the app:

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Running everything in Docker (app + database)

```bash
docker-compose up --build
```

This builds the application image (multi-stage `Dockerfile`) and runs it alongside Postgres, applying pending migrations automatically on container start — no local Node installation required.

## Testing

```bash
npm test
```

The suite includes:
- **Unit tests** (`lib/slug.ts`, `lib/validation.ts`) — Prisma is mocked, no database required
- **Integration tests** (`app/api/links/route.ts`) — run against a real, isolated test database using [`next-test-api-route-handler`](https://github.com/Xunnamius/next-test-api-route-handler), since Route Handlers using `cookies()` require Next.js's internal request context

To run integration tests locally, create a separate test database and point Jest at it via `.env.test`:

```bash
docker exec -it short-your-link-db-1 psql -U postgres -c "CREATE DATABASE shortyourlink_test;"
```

```
# .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/shortyourlink_test"
```

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/shortyourlink_test" npx prisma migrate deploy
npm test
```

## Deployment

The application is deployed on **Render** (Docker-based Web Service), while the production database runs on **Neon** — a serverless Postgres provider.

**Why Neon instead of Render's own PostgreSQL?** Render's free-tier PostgreSQL databases expire 30 days after creation and are permanently deleted after a grace period. For a publicly linked portfolio project that people may revisit weeks or months later, that's a poor fit. Neon's free tier has no such expiration (databases "scale to zero" after inactivity and wake up automatically on the next connection, adding a small delay but never data loss). Swapping the database provider required no code changes — just a different `DATABASE_URL`, since Prisma talks to any standard PostgreSQL-compatible endpoint.

The `Dockerfile` runs `prisma migrate deploy` on container start, so schema changes are applied automatically on every deploy.

## What's intentionally out of the MVP

These were deliberate scope decisions, not oversights:

- Real authentication (email/password or OAuth)
- Custom slugs
- QR code generation
- Link expiration
- Data export (CSV/PDF)

## Notable technical decisions & trade-offs

A few non-obvious choices made along the way, documented here since the *why* is often more interesting than the *what* in an interview setting:

- **Downgraded from Prisma 7 to Prisma 6.** Prisma 7 (released days before this project started) moved datasource configuration out of `schema.prisma` and into a separate `prisma.config.ts`, requiring explicit driver adapters. That's a reasonable direction for the ecosystem, but it added configuration overhead disconnected from what this project is meant to demonstrate. Prisma 6 keeps the classic, widely-documented workflow.
- **`nanoid@3` instead of `nanoid@4+`.** Versions 4 and above ship as ESM-only, which breaks Jest's default CommonJS module resolution for anything under `node_modules`. Rather than adding `transformIgnorePatterns` configuration to work around it, pinning to v3 (which ships both formats) avoids the extra moving part.
- **`node:20-slim` instead of `node:20-alpine` for the Docker image.** Alpine's smaller footprint comes with more friction around Prisma's native query engine binaries; `slim` trades some image size for fewer platform-specific surprises.

## License

MIT