# ShortYourLink

A full-stack URL shortener with click analytics, built as a portfolio project to demonstrate practical proficiency in **TypeScript, Next.js, Docker, and testing practices**.

**Live demo:** [shortyourlink.onrender.com](https://shortyourlink.onrender.com)

![Coverage](https://img.shields.io/badge/coverage-86%25-green) <sub>(statements, `lib/` + route handlers — static badge, updated by hand; see [Testing](#testing))</sub>

> Note: the live demo runs on Render's free tier, so the first request after a period of inactivity may take 30–60 seconds while the service wakes up.



<p align="center">
  <img src="docs/screenshots/landing.png" alt="ShortYourLink landing page" width="48%">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard with links and click counts" width="48%">
</p>


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
| Observability | Sentry (`@sentry/nextjs`, error capture only, optional) + `GET /api/health` |
| Testing | Jest (unit + integration) + Playwright (E2E) |
| Containerization | Docker + Docker Compose (multi-stage build) |
| Deployment | Render (app) + Neon (production database) |

## Architecture

```
app/
  page.tsx                       Landing page (Server Component)
  dashboard/page.tsx             Links + click stats, paginated (Server Component)
  [slug]/route.ts                Redirect handler (GET) + click logging
  api/links/route.ts             POST (create link), GET (list links, paginated)
  api/links/[id]/route.ts        DELETE (remove a link, owner-checked)
  api/health/route.ts            GET health check (app + database)
  global-error.tsx               Root error boundary, reports to Sentry
instrumentation.ts               Server-side Sentry init + onRequestError hook
instrumentation-client.ts        Browser-side Sentry init
sentry.server.config.ts          Sentry server options (DSN from env)
lib/
  prisma.ts                      Prisma Client singleton
  slug.ts                        Unique slug generation
  validation.ts                  Zod schemas
  session.ts                     Anonymous session (cookie) logic
  rate-limit.ts                  In-memory rate limiter (fixed window)
  client-ip.ts                   Client IP extraction (x-forwarded-for)
  url-safety.ts                  Private/loopback host blocking (SSRF guard)
  malicious-domains.ts           URLhaus blocklist check (best-effort)
  links-pagination.ts            Cursor-based pagination, shared by dashboard + API
  click-stats.ts                 Daily click aggregation (raw SQL, on demand)
components/
  LinkForm.tsx                   Client Component — create link form
  LinkList.tsx                   Client Component — dashboard list, pagination nav, delete
  Sparkline.tsx                  Presentational — inline SVG bar chart, no charting lib
tests/
  slug.test.ts                   Unit tests (mocked Prisma)
  validation.test.ts             Unit tests
  rate-limit.test.ts             Unit tests
  url-safety.test.ts             Unit tests
  malicious-domains.test.ts      Unit tests
  click-stats.test.ts            Unit tests (mocked Prisma)
  client-ip.test.ts              Unit tests
  session.test.ts                Integration tests — cookie creation/reuse (real test database)
  api/links.test.ts              Integration tests — create, list, pagination, session isolation (real test database)
  api/links-id.test.ts           Integration tests — delete, ownership checks (real test database)
  api/redirect.test.ts           Integration tests — redirect, 404, click logging (real test database)
  api/health.test.ts             Integration tests — 200 when DB is up, 503 (no driver details leaked) when not
e2e/
  create-visit-and-track.spec.ts Playwright — create link → visit → dashboard click count
prisma/
  schema.prisma
  migrations/
docker-compose.yml
Dockerfile
playwright.config.ts
```

### Key architectural choices

**Server Components fetch data directly.** `dashboard/page.tsx` calls the same `lib/links-pagination.ts` and `lib/click-stats.ts` helpers that `GET /api/links` uses, instead of fetching its own API route — no point in a server-to-server HTTP round trip when the data fetching can happen where the page is rendered. The `/api/links` route exists for the client-side form (`LinkForm.tsx`) and the delete button (`LinkList.tsx`), which run in the browser and genuinely need an HTTP endpoint.

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

### Environment variables

Only `DATABASE_URL` is required. See [`.env.example`](.env.example) for the full list.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SENTRY_DSN` | no | Server-side error reporting (Route Handlers, Server Components) |
| `NEXT_PUBLIC_SENTRY_DSN` | no | Browser-side error reporting (Client Components). Inlined at **build** time |

Without the Sentry variables the SDK initializes as a no-op: nothing is sent, nothing breaks, and local dev/tests behave exactly as before.

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
- **Unit tests** (`lib/slug.ts`, `lib/validation.ts`, `lib/rate-limit.ts`, `lib/url-safety.ts`, `lib/malicious-domains.ts`, `lib/click-stats.ts`, `lib/client-ip.ts`) — Prisma (and, where relevant, `fetch`) is mocked, no database required
- **Integration tests** (`app/api/links/route.ts`, `app/api/links/[id]/route.ts`, `app/[slug]/route.ts`, `lib/session.ts`) — run against a real, isolated test database using [`next-test-api-route-handler`](https://github.com/Xunnamius/next-test-api-route-handler), since Route Handlers using `cookies()` require Next.js's internal request context. This includes the redirect handler (successful redirect + `Location`, 404 on unknown slug, click logging with referrer/user-agent, click counting per slug) and session isolation (two anonymous sessions never see each other's links, in both directions).

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

### Coverage

```bash
npm run test:coverage
```

Runs the same suite with coverage collection turned on. `jest.config.ts` scopes coverage to `lib/**/*.ts` and `app/**/route.ts` — the logic actually exercised by this Jest suite — and excludes React components and pages (`components/`, `app/**/page.tsx`), whose flows are covered by the E2E suite below instead of by component tests; including them here would just show as permanently uncovered without reflecting a real gap. `lib/prisma.ts` is excluded too (a trivial singleton, nothing to gate).

The current numbers (measured on this commit, not guessed): **85.66% statements, 78.75% branches, 81.25% functions, 85.88% lines**. `coverageThreshold` in `jest.config.ts` is set a few points below that (80/70/75/80) as a regression floor, not an aspirational target — see the trade-offs section for why some files (the two rate-limited routes, `lib/malicious-domains.ts`) are deliberately short of 100% and why that's fine. The badge at the top of this README is a static image (`shields.io`), updated by hand after a meaningful change — see the trade-offs section for why, given there's no CI yet.

### End-to-end (Playwright)

```bash
npx playwright install chromium   # once, downloads the browser binary
npm run test:e2e
```

Covers the full flow through a real browser: paste a URL on the landing page → get a short link → visit it and land on the original URL → check the dashboard shows the link with the click counted. No mocks — it drives an actual `next dev` server (started automatically by Playwright, see `playwright.config.ts`) against the **same test database** as the Jest integration tests (`.env.test`), so the setup above must be done first. Not wired into CI yet (nothing runs it automatically) — see the trade-offs section for the reasoning and for an important safety detail about which database it targets.

## Deployment

The application is deployed on **Render** (Docker-based Web Service), while the production database runs on **Neon** — a serverless Postgres provider.

**Why Neon instead of Render's own PostgreSQL?** Render's free-tier PostgreSQL databases expire 30 days after creation and are permanently deleted after a grace period. For a publicly linked portfolio project that people may revisit weeks or months later, that's a poor fit. Neon's free tier has no such expiration (databases "scale to zero" after inactivity and wake up automatically on the next connection, adding a small delay but never data loss). Swapping the database provider required no code changes — just a different `DATABASE_URL`, since Prisma talks to any standard PostgreSQL-compatible endpoint.

The `Dockerfile` runs `prisma migrate deploy` on container start, so schema changes are applied automatically on every deploy.

### Observability

**Error tracking.** [Sentry](https://sentry.io) (free tier) captures unhandled exceptions on both sides: `instrumentation.ts` hooks Next's `onRequestError` for Route Handlers and Server Components, and `instrumentation-client.ts` + `app/global-error.tsx` cover the browser and render errors in Client Components. It is error capture only — tracing, replay and PII are off — and the existing `console` logs are untouched. To enable it, create a Sentry project and set the DSN variables above. On Render, `NEXT_PUBLIC_SENTRY_DSN` must be set before the build (the `Dockerfile` accepts it as a build arg). Browser events are sent through a same-origin `/monitoring` tunnel, so the CSP's `connect-src 'self'` stays as strict as before.

**Health check.** `GET /api/health` reports whether the app is up and whether Postgres answers a `SELECT 1` (5s timeout):

```
200 {"status":"ok","database":"ok"}
503 {"status":"error","database":"unreachable"}
```

Point an external monitor (e.g. UptimeRobot's free tier) or Render's *Health Check Path* setting at it. The 503 body is deliberately generic; the underlying error is logged server-side only. Note that on Neon's free tier each check wakes the database, so a short polling interval keeps it from scaling to zero.

## What's intentionally out of the MVP

These were deliberate scope decisions, not oversights:

- Real authentication (email/password or OAuth)
- Custom slugs
- QR code generation
- Link expiration
- Data export (CSV/PDF)

## Roadmap / Next steps

Directions for the product and architecture beyond the MVP gaps above, in no particular order and with no dates:

- **Richer analytics** — referrer and device/browser breakdowns, unique-vs-repeat visitors, and coarse geography, all derivable from the click data already stored plus a small amount of user-agent parsing.
- **Documented public API** — an OpenAPI spec for `/api/links`, API keys, and per-key rate limits, so links can be created programmatically.
- **Shared rate limiting** — move `lib/rate-limit.ts` from the in-memory `Map` to a Redis-backed counter behind the same `checkRateLimit` interface, which is what horizontal scaling would require.
- **CI pipeline** — run lint, Jest, and Playwright on every push, and replace the static coverage badge with a self-updating one.
- **Nonce-based CSP** — drop `'unsafe-inline'` from `script-src` via a `proxy.ts`, at the cost of dynamic rendering for the landing page.
- **Click data retention and scale** — pruning or rolling up old clicks, and moving to pre-aggregated daily stats if on-demand aggregation ever becomes the bottleneck.
- **Tracing** — enable Sentry performance tracing or OpenTelemetry once there is real traffic worth profiling.

## Notable technical decisions & trade-offs

A few non-obvious choices made along the way, documented here since the *why* is often more interesting than the *what* in an interview setting:

- **Downgraded from Prisma 7 to Prisma 6.** Prisma 7 (released days before this project started) moved datasource configuration out of `schema.prisma` and into a separate `prisma.config.ts`, requiring explicit driver adapters. That's a reasonable direction for the ecosystem, but it added configuration overhead disconnected from what this project is meant to demonstrate. Prisma 6 keeps the classic, widely-documented workflow.
- **`nanoid@3` instead of `nanoid@4+`.** Versions 4 and above ship as ESM-only, which breaks Jest's default CommonJS module resolution for anything under `node_modules`. Rather than adding `transformIgnorePatterns` configuration to work around it, pinning to v3 (which ships both formats) avoids the extra moving part.
- **`node:20-slim` instead of `node:20-alpine` for the Docker image.** Alpine's smaller footprint comes with more friction around Prisma's native query engine binaries; `slim` trades some image size for fewer platform-specific surprises.
- **In-memory rate limiting instead of Redis.** The Render deployment runs a single instance, so a fixed-window counter kept in a module-level `Map` (`lib/rate-limit.ts`) needs no extra infrastructure and costs nothing. The trade-off is explicit: limits are per-instance, not global, so this stops working correctly the moment the app scales horizontally (each instance would enforce its own limit, multiplying the effective ceiling). That's an acceptable trade for a portfolio project and a well-understood one to point out in an interview — the fix, if it were ever needed, is swapping the `Map` for a Redis-backed counter behind the same `checkRateLimit` interface. Creation (`POST /api/links`) is limited both by IP (10/min — can't be bypassed by clearing cookies) and by the existing anonymous session cookie (5/min — a tighter, complementary layer so one abusive visitor on a shared IP, e.g. a corporate NAT, doesn't lock out everyone behind it). The redirect handler (`GET /[slug]`) is limited by IP *and* slug together, at a higher threshold (30/min), since legitimate clicks on a popular link can burst.
- **SSRF/phishing mitigation is intentionally best-effort, not a reputation service.** Two independent, documented layers, both easy to reason about and to explain the limits of:
  1. `lib/url-safety.ts` rejects `localhost`, loopback, RFC 1918 private ranges, link-local addresses (including the `169.254.169.254` cloud metadata IP), and `.local`/`.internal` hostnames — synchronously, at validation time, with no DNS lookup. That's a conscious gap: a public domain that *resolves* to a private IP (DNS rebinding) slips through, since closing that fully would require resolving DNS at creation time and re-validating at redirect time (the answer can change in between) — disproportionate effort for a project with no real traffic to defend.
  2. `lib/malicious-domains.ts` checks the target hostname against [URLhaus](https://urlhaus.abuse.ch/) (abuse.ch's free, no-API-key malware/phishing feed), cached in memory for 6h and refreshed lazily. It fails open on purpose: if the feed can't be fetched, link creation is never blocked because a third-party outage isn't this app's problem to enforce. This only catches domains already reported to URLhaus — no zero-day phishing detection, no crawling, no scoring. Both limitations are called out in the code comments, not just here.
- **Security headers (`next.config.ts`) use a CSP tuned to what actually ships**, not a generic template — though "what actually ships" turned out to include something not obvious from reading the app's own code. Because `next/font/google` self-hosts fonts at build time and the app has no `dangerouslySetInnerHTML` or third-party embeds, `style-src`/`font-src` stay at `'self'` in production (`'unsafe-inline'` for styles is dev-only, for Fast Refresh's injected `<style>` tags). `script-src`, however, needs `'unsafe-inline'` in **both** environments: the App Router injects its own inline `<script>` tags for hydration (the serialized RSC payload) on every page, dev or prod, regardless of anything this app's code does. The first version of this CSP didn't allow that, and `curl` — the only thing used to validate it at the time — couldn't have caught it, because `curl` doesn't execute JavaScript or enforce CSP; it only checks that headers exist. The break was invisible until the E2E suite below ran an actual browser against the app: React never finished hydrating, so the create-link form silently did nothing (worse, a bare `<form>` with no JS attached does a native GET submit, which *looked* like the page just reloading, not an error). The textbook fix is a nonce-based CSP (documented in Next's own CSP guide) generated per-request by a `proxy.ts`, which avoids `'unsafe-inline'` entirely — but it requires opting every page that needs the nonce into dynamic rendering (the landing page is static today) and a new piece of request-time infrastructure, for a portfolio app with no real attack surface for injected-script XSS (no `dangerouslySetInnerHTML`, no unescaped user HTML anywhere — React's default escaping is already doing the actual work here). `'unsafe-inline'` on `script-src` alone was the proportionate fix; the rest of the policy (`object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`) is untouched. `X-Frame-Options: DENY` stays alongside `frame-ancestors 'none'` for older browsers that don't read CSP. Separately: `components/Sparkline.tsx` sizes its bars with SVG geometry attributes (`x`/`y`/`width`/`height`) instead of inline `style="height: …"`, since an inline `style` *attribute* is still governed by `style-src` (which has no `'unsafe-inline'` in production) — SVG presentation attributes aren't CSS and aren't covered by that directive at all.
- **Cursor-based pagination, not offset/`skip`.** `lib/links-pagination.ts` anchors each page on a real link `id` (`cursor: { id }, skip: 1`) rather than a page number. With offset pagination, a link created by the same visitor while they're on page 2 shifts every row after it by one position, so the next `skip: 10` either repeats or skips a row depending on timing — a real risk here since link creation is unthrottled by the dashboard itself. Cursor pagination is immune to that because it's anchored to a row, not a position. The one deliberate gap: if the link used as a page's boundary cursor gets deleted (the new `DELETE` endpoint makes this newly possible) mid-navigation, Prisma can't find that anchor row and returns an empty page instead of failing — `dashboard/page.tsx` detects "empty page, but a cursor was given" and shows a "go back to the start" message instead of the misleading "you have no links yet" empty state. A cursor *stack* that could always recover the exact previous page was considered and rejected as unnecessary complexity for a list a visitor is very unlikely to have 50+ tabs deep into. Going backward reuses the same `getLinksPage()` call with a negative Prisma `take` (documented, standard cursor-pagination technique) instead of tracking visited cursors in the URL. `GET /api/links` accepts the identical `cursor`/`direction` query params (validated by the same `linksQuerySchema`) as the dashboard, and its response shape changed from a bare array to `{ links, nextCursor, prevCursor }` — a deliberate breaking change to that route's contract, reflected in the updated assertions in `tests/api/links.test.ts`.
- **Click aggregation: on-demand raw SQL, not a materialized table.** The alternative — a `DailyClickStat` table updated on every click insert (or recomputed by a scheduled job) — trades a slow read for a slower, riskier write path: every click insert would need a second write (or a cron job introducing staleness and a new moving part to deploy on Render, which has no built-in scheduler on the free tier). For the traffic this project actually sees, `SELECT date_trunc('day', "timestamp"), COUNT(*) ... GROUP BY` runs in single-digit milliseconds against the new `Click_linkId_timestamp_idx` composite index (see migration below), so there's no real read-latency problem to solve by pre-aggregating. Prisma's `groupBy` can't express `date_trunc` (it only groups by literal columns, not expressions), so this is one of the few places in the app using `$queryRaw` — parameterized through Prisma's tagged template, not string concatenation. `lib/click-stats.ts` batches all links on a dashboard page into one query (`linkId IN (...)`) instead of one query per link, and fills days with zero clicks client-side so `components/Sparkline.tsx` never has to reason about gaps.
- **Link delete is a hard delete, not a soft delete (`deletedAt`).** Soft delete means every existing read path — the dashboard list, `GET /api/links`, the redirect handler, the slug-uniqueness check in `lib/slug.ts`, and now the click aggregation — has to remember to filter out soft-deleted rows, and forgetting it in just one of those is a silent bug (a "deleted" link that still redirects, or still counts toward someone's click stats). Hard delete has no such failure mode: `prisma.link.delete()` reuses the `onDelete: Cascade` already declared on `Click.link` (no schema change needed for this one), so a link and its click history disappear together, atomically, in every place at once. Since there's no "trash" or "recover" UI in scope, keeping soft-deleted history around wouldn't be exercised by anything — it'd be complexity paid for upfront with no feature behind it. `DELETE /api/links/[id]` also returns a uniform `404` for both "link doesn't exist" and "link exists but belongs to another session," rather than `403` for the latter — a `403` would confirm to any visitor that a given link `id` exists at all, a small but avoidable enumeration leak given links are addressed by guessable-ish `cuid`s rather than a per-owner index.

- **`lib/session.ts` is tested through a throwaway probe handler, not a real route.** `getSessionId`/`getOrCreateSessionId` call `cookies()` from `next/headers`, which only works inside a request context — there is no way to call them from a plain Jest unit test. Rather than add a dedicated `app/api/_debug/session` endpoint to the app just so tests have something to import (permanent production surface for a test-only need), `tests/session.test.ts` defines a minimal `{ GET }` handler object inline and hands it straight to `next-test-api-route-handler`, which accepts any object shaped like a route module — it doesn't have to come from a file under `app/`. Same tool, same pattern as every other integration test here, no new route.
- **Playwright over Cypress for E2E.** Both are reasonable choices; Playwright won for three concrete reasons for this app specifically: first-party TypeScript and a built-in test runner (`@playwright/test`), so no separate assertion library or config to wire up; the `webServer` option starts (and tears down) `next dev` automatically, matching Next.js's own documented Playwright setup; and this app's redirect flow genuinely navigates cross-origin (short link → the original URL, e.g. `example.com`), which Playwright handles as a normal navigation, where Cypress historically needs `cy.origin()` workarounds for cross-origin assertions.
- **The E2E run found a real bug the rest of the suite couldn't see.** `curl`, used to validate the CSP headers when they were first added, doesn't execute JavaScript — it never noticed that `script-src` was silently blocking Next's own hydration scripts and breaking every interactive element in the app. Playwright, driving a real Chromium, surfaced it on the first run. Covered in detail in the CSP bullet above; kept here too because it's the strongest argument in this README for *why* E2E tests earn their cost on top of Jest's integration tests: they're the only layer that actually renders the page in a real browser with real security headers enforced.
- **E2E targets the same test database as the Jest integration suite (`.env.test`), on purpose, and always starts a fresh server for it.** Introducing a third database just for Playwright would be one more thing to provision and document for no real benefit — `.env.test` is already isolated from both the local dev database and (critically) production. `playwright.config.ts` sets `reuseExistingServer: false` unconditionally, even locally: Playwright's default local behavior is to reuse whatever dev server is already listening on the port, and this project's own `.env` happens to point `next dev` at the **production Neon database** by default. If a stray `npm run dev` were already running when `npm run test:e2e` starts, silently reusing it would mean E2E test data — link creates, clicks — lands in production. `reuseExistingServer: false` costs a few seconds of cold start per run in exchange for eliminating that risk entirely; a real incident during this project's development (caught and cleaned up manually) is exactly why this isn't a hypothetical concern. E2E test data does still accumulate in `shortyourlink_test` across repeated runs (each run gets a fresh anonymous session, so old rows don't affect assertions, but nothing prunes them) — an occasional `TRUNCATE "Click", "Link"` against the test database is the manual cleanup, same as any other test-database housekeeping.
- **Coverage is scoped to `lib/**/*.ts` and `app/**/route.ts`, not the whole repo.** This Jest suite has zero component tests (`LinkForm.tsx`, `LinkList.tsx`, `Sparkline.tsx`) and zero tests of `page.tsx`/`layout.tsx` — that surface is covered by the Playwright E2E suite instead. Including untested UI files in the coverage number wouldn't reflect a real gap to close, just permanently dilute the percentage. The measured baseline this round, before picking a threshold, was 82.8% statements; after closing a couple of legitimately-easy gaps found while measuring (`lib/client-ip.ts` had no dedicated test at all, `lib/url-safety.ts`'s IPv6 branches and `lib/rate-limit.ts`'s header-building helper were untested), it's **85.66%**. Two files stay well below that on purpose, not from neglect: `app/[slug]/route.ts` and `app/api/links/route.ts` both have a rate-limiting branch gated by `isRateLimitEnabled()` (`NODE_ENV !== "test"`), so it's structurally unreachable in Jest — the limiter itself is fully covered in isolation (`tests/rate-limit.test.ts`). `lib/malicious-domains.ts` sits at 55%, because its `getMaliciousDomains()` also short-circuits under `NODE_ENV=test` before ever touching the network, by design — same reasoning as the rate limiter, and the parsing logic it depends on (`parseHostfileToDomains`) is separately covered. `coverageThreshold` in `jest.config.ts` (80/70/75/80) sits a few points under the real, current numbers: a regression floor, set from what was actually measured, not a round number picked in advance.
- **Sentry for error capture, with tracing/replay/PII off and a same-origin tunnel.** The goal was visibility into silent production failures, not a full APM, so `tracesSampleRate` is `0` and nothing beyond exceptions is collected — also keeps the free-tier quota for errors. The SDK is inert without a DSN, so dev, Jest, and Docker keep working unconfigured. Browser events would normally go straight to `*.ingest.sentry.io`, which the strict `connect-src 'self'` CSP blocks; rather than widening the CSP for a third-party domain, `tunnelRoute: "/monitoring"` proxies them through the app (trade-off: a little extra traffic through the Render instance, and ad blockers that filter Sentry no longer drop events). `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time, hence the Docker build arg. A DSN is not a secret (it only permits sending events), so exposing it to the browser is by design. Handled errors (like the fetch failure message in `LinkForm`) are intentionally not reported — that would just be noise from users going offline.
- **Health check reports database reachability only, with a generic 503.** `GET /api/health` (under `/api`, matching the other endpoints and keeping it out of the `/[slug]` namespace) runs `SELECT 1` with a 5s cap, so a Neon cold start yields a clear 503 rather than a hung monitor. The response never includes the driver error, since the endpoint is public. It doesn't call the URLhaus feed or anything else external: a third-party outage shouldn't mark this app as down.
- **Coverage badge is a static `shields.io` image, updated by hand — not Codecov or Coveralls.** Both of those need a CI pipeline to upload a report to; this project doesn't have CI yet (out of scope for this round, by the user's own instruction), so wiring either one up now would mean maintaining an integration with nothing currently triggering it. A static badge (`img.shields.io/badge/coverage-86%25-green`, no token, no account, no external service polling this repo) needs nothing but remembering to edit the URL after `npm run test:coverage` shows a materially different number — the honest trade is that it can go stale if forgotten, which is disclosed right next to the badge. The natural follow-up, once CI exists, is switching to Codecov/Coveralls for a badge that updates itself on every push; not worth the setup before there's a pipeline to hang it on.

### Migrations

- `20260918142327_add_click_linkid_timestamp_index` (previous round) — replaces `Click_linkId_idx` with a composite `Click_linkId_timestamp_idx` on `(linkId, timestamp)`. It fully covers the old index's use case (leftmost-prefix rule: any query filtering on `linkId` alone still uses it) while adding support for the `WHERE linkId = ... AND timestamp >= ...` click-aggregation query.
- None this round — observability (Sentry, health check) and docs only; no schema changed.

## License

MIT