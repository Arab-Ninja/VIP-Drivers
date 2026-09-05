# VIP Drivers

Private chauffeur service for Brussels. Clients book transfers and hourly hire
with a live price, pay online, and follow their ride through
**pending → confirmed → completed**. Partner chauffeurs claim available rides
and track their earnings. Administrators run the whole business from an admin
panel.

Built as one Next.js application that installs on a phone as a PWA, so the web
app and the mobile app are the same codebase.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL and AUTH_SECRET
npm run db:push                # create the tables
npm run db:seed -- --demo      # fleet, settings, and demo accounts
npm run dev                    # http://localhost:3000
```

`npm run db:seed` on its own loads only the fleet and site settings, which is
what you want against production. `--demo` additionally creates sign-in
accounts and sample bookings:

| Account | Email | Role |
| --- | --- | --- |
| Administration | `admin@vipdrivers.be` | admin |
| Marc Lefebvre | `driver@vipdrivers.be` | approved chauffeur |
| Sofia Renard | `driver2@vipdrivers.be` | chauffeur awaiting approval |
| Claire Dubois | `client@vipdrivers.be` | client |

All four use the password `VipDrivers2026!` unless you set `SEED_PASSWORD`.
**Never run `--demo` against a production database.**

---

## How pricing works

Every amount in the system is an integer number of euro cents. Money is never
held as a float, so nothing can drift by a cent between the quote, the Stripe
charge and the invoice.

**Transfer** — charged per kilometre of the actual driven route, including any
intermediate stops.

**Hourly hire (mise à disposition)** — charged per retained hour. Distance is
not measured and does not affect the price.

Both are then floored by the vehicle's minimum fare, any configured surcharges
are added, and Belgian VAT on passenger transport (6%) is applied last:

```
metered   = distance_km × rate_per_km        (or hours × rate_per_hour)
base      = max(metered, vehicle_minimum)
htva      = base + night + weekend + stop fees
vat       = htva × 6%
total     = htva + vat
```

The fleet ships with these rates, all VAT-exclusive and all editable from
**Admin → Vehicles**:

| Vehicle | Per km | Per hour | Minimum per ride |
| --- | --- | --- | --- |
| Mercedes-Benz Classe E (2026) | 3.00 € | 80 € | 80 € |
| Mercedes-Benz Classe V (2026) | 3.50 € | 90 € | 90 € |
| Mercedes-Benz Classe S (2026) | 4.00 € | 110 € | 110 € |

Night, weekend and per-stop surcharges all default to **zero**, so the quoted
price is exactly rate × quantity until you deliberately switch one on in
**Admin → Settings**. Night and weekend windows are evaluated in Brussels local
time, not the server's, so they stay correct across daylight saving.

The price shown to a client and the price they are charged are produced by the
same server-side function from the same inputs. Nothing about the price is ever
read from the browser.

---

## The booking lifecycle

| Status | Meaning |
| --- | --- |
| **Pending** | The client confirmed their selection. Payment outstanding. |
| **Confirmed** | Payment received. The ride is live and claimable by a chauffeur. |
| **Completed** | The ride has been carried out. |
| **Cancelled** | Called off by the client or an administrator. |

Confirmation is driven by the Stripe **webhook**, not by the browser returning
to the success page. A client who pays and immediately closes the tab is still
recorded correctly, and nobody can confirm a booking by visiting a URL.

**Only one chauffeur can ever hold a ride.** That is enforced by a conditional
`UPDATE … WHERE driver_id IS NULL`, not by application logic, so it holds even
when two drivers tap at the same instant on different servers. `npm test`
proves it with eight concurrent claims against a real database.

---

## Roles

**Clients** browse the fleet, book, pay, follow their rides and manage their
profile.

**Chauffeurs** apply through `/driver/apply`, which creates a partner profile
in `pending`. Once an administrator approves it they see **Available rides** —
confirmed rides no one has taken — can claim one, mark it completed, and track
their earnings with the commission split shown line by line. The default
commission is 20% and is adjustable per driver.

**Administrators** reach every page on the site plus `/admin`: KPIs and a
revenue chart, every booking with filters and search, assigning or moving a
chauffeur, forcing a status, editing a ride or overriding its price, messaging
a client, approving and suspending drivers, blocking clients, full fleet and
price management, the contact inbox, and the pricing rules and company details.

The first administrator is created by listing an email in `ADMIN_EMAILS`; that
account is promoted on its next sign-in.

---

## Environment

The application boots and is genuinely usable with only `DATABASE_URL` and
`AUTH_SECRET`. Every integration below is optional, and each one that is
missing degrades to a signposted fallback rather than an error. **Admin →
Settings** shows which are live on the running deployment.

| Variable | Unlocks | Without it |
| --- | --- | --- |
| `DATABASE_URL` | everything | required |
| `AUTH_SECRET` | sessions | required in production |
| `ADMIN_EMAILS` | the first admin account | no way to reach `/admin` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google sign-in | email + password only |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | card, Apple Pay, Google Pay | demo payment, if enabled |
| `MAPBOX_TOKEN` | best-quality address search and routing | keyless OpenStreetMap |
| `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push notifications | in-app notifications only |
| `RESEND_API_KEY` | transactional email | messages stored and shown in the admin panel |

See `.env.example` for the full list with comments.

### About the map providers

With no `MAPBOX_TOKEN`, address autocomplete falls back to **Nominatim** and
routing to **OSRM** — both keyless OpenStreetMap services. This is why the app
measures real Belgian routes the moment it is deployed, before you have signed
up for anything. They are community-run with published rate limits and are
meant for evaluation; add a Mapbox token (free tier, no credit card) before
taking real traffic. If both are unreachable the app falls back to a
straight-line estimate and labels the price as estimated in the UI.

The Mapbox token is a **server** variable. All map calls are proxied through
`/api/geo/*`, so the token never reaches a browser.

---

## Deploying

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full walkthrough: Neon
database, Vercel, Google OAuth, Stripe keys and webhook, Mapbox, push keys and
a custom domain.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Test suite (pricing + database integration) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:push` | Apply migrations |
| `npm run db:seed` | Fleet and settings (safe to re-run) |
| `npm run db:seed -- --demo` | Also demo accounts and sample bookings |
| `npm run db:studio` | Drizzle Studio, a database browser |

Set `NEXT_DIST_DIR=.next-build` when building while a dev server is running, so
the two do not share an output directory.

---

## Layout

```
src/
├── app/                 routes (App Router)
│   ├── actions/         server actions: booking, payment, admin, driver, auth
│   ├── api/             geo proxy, quote, Stripe webhook, Auth.js
│   ├── admin/           admin panel
│   ├── driver/          partner area
│   ├── account/         client area
│   └── booking/         booking flow and confirmation
├── components/          UI, grouped by area
├── db/                  Drizzle schema, client, seed
├── i18n/                French and English dictionaries
├── lib/                 pricing engine, auth, settings, env, Stripe, email
└── server/              data access: bookings, drivers, fleet, admin, routing
```

The pricing engine (`src/lib/pricing.ts`) is pure and has no imports from the
rest of the app, which is what makes it exhaustively testable.

---

## Tests

```bash
npm test
```

- `src/lib/pricing.test.ts` — the fare rules: both services, each vehicle's
  real rates, the minimum-fare floor, rounding to whole cents, commission
  splits, and the Brussels night and weekend windows across DST.
- `src/server/bookings.test.ts` — runs against a real Postgres: concurrent ride
  claims, completion permissions, and idempotent Stripe webhook handling.

The integration tests need `DATABASE_URL` to point at a database with the
schema applied. They create and remove their own rows.
