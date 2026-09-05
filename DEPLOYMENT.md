# Deploying VIP Drivers

A step-by-step guide to putting the app online at a permanent URL you can open
from your phone at any time, then connecting each service.

Everything here uses free tiers. Nothing in **Part 1** or **Part 2** asks for a
credit card, and at the end of Part 2 you have a working site with real
addresses, real distances and real prices.

---

## Part 1 — Database (10 minutes, free, no card)

1. Go to **[neon.com](https://neon.com)** and sign up with GitHub.
2. **Create a project**. Name it `vip-drivers`, region **Europe (Frankfurt)** —
   the closest to Brussels.
3. On the project dashboard, copy the **Connection string**. Make sure the
   **Pooled connection** toggle is on. It looks like:

   ```
   postgresql://neondb_owner:xxxx@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

Keep this tab open — you paste that string in Part 2.

> The pooled string matters. Serverless functions open and close connections
> constantly and the unpooled endpoint will run out.

---

## Part 2 — Put the site online (10 minutes, free, no card)

1. Go to **[vercel.com](https://vercel.com)** and sign up with GitHub.
2. **Add New → Project**, choose the `VIP-Drivers` repository, and pick the
   branch you want to deploy.
3. Vercel detects Next.js on its own. Leave every build setting alone.
4. Open **Environment Variables** and add these three:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the pooled Neon string from Part 1 |
   | `AUTH_SECRET` | run `openssl rand -base64 32` and paste the result |
   | `ADMIN_EMAILS` | your email address |

5. Click **Deploy** and wait about a minute.

> Optional: under **Settings → Functions**, set the region to **Frankfurt
> (fra1)**. It is the closest to Brussels and shaves latency off every page.
> The default works fine, so skip it if the option is not offered on your plan.

### Create the tables and load the fleet

On your own computer, in the project folder:

```bash
# Point at the Neon database (same pooled string)
echo 'DATABASE_URL="postgresql://…?sslmode=require"' > .env.local

npm install
npm run db:push     # creates the tables
npm run db:seed     # loads the three Mercedes and the site settings
```

> Do **not** pass `--demo` here. That flag creates sign-in accounts with a
> shared password and belongs only on your own machine.

### Become the administrator

Open your Vercel URL, create an account with the email you put in
`ADMIN_EMAILS`, then sign out and back in. That second sign-in promotes you to
administrator and `/admin` appears in the menu.

**You now have a working site.** Addresses autocomplete, distances are real,
prices are correct, and bookings flow through pending → confirmed → completed.
Payment is simulated until you finish Part 4.

Every push to your branch redeploys automatically.

---

## Part 3 — Google sign-in (10 minutes, free)

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)** and
   create a project called `VIP Drivers`.
2. **APIs & Services → OAuth consent screen**. Choose **External**, fill in the
   app name, your support email and developer email. Save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**
   - Authorised JavaScript origins: `https://your-app.vercel.app`
   - Authorised redirect URI:
     `https://your-app.vercel.app/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**.
5. In Vercel → **Settings → Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `AUTH_GOOGLE_ID` | the client ID |
   | `AUTH_GOOGLE_SECRET` | the client secret |

6. **Deployments → ⋯ → Redeploy.**

To add a custom domain later, add its origin and redirect URI here too.

---

## Part 4 — Payments (20 minutes, free in test mode)

Stripe covers credit card, **Apple Pay** and **Google Pay** through one
integration. The wallets appear by themselves on devices that support them.

### Test mode first

1. Sign up at **[stripe.com](https://stripe.com)**. You do not need a verified
   business to use test mode.
2. Make sure the dashboard's **Test mode** switch is on.
3. **Developers → API keys**, copy the **Secret key** (`sk_test_…`) and the
   **Publishable key** (`pk_test_…`).
4. In Vercel, add:

   | Name | Value |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | `sk_test_…` |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |

### The webhook — this is the important part

The webhook is what actually confirms a booking. Without it a client can pay
and the booking stays pending.

1. **Developers → Webhooks → Add endpoint.**
2. Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
4. Create the endpoint, then copy its **Signing secret** (`whsec_…`).
5. In Vercel add `STRIPE_WEBHOOK_SECRET` = `whsec_…`, and redeploy.

### Try it

Book a ride and pay with Stripe's test card:

```
Card    4242 4242 4242 4242
Expiry  any future date
CVC     any 3 digits
```

The booking should flip to **Confirmed** within a second or two, and appear on
the drivers' available-rides board.

### Going live

Once your company is verified in Stripe, switch the dashboard out of test mode,
create the webhook again on the live endpoint, and replace all three variables
with their `sk_live_` / `pk_live_` / `whsec_` equivalents. Also set
`DEMO_PAYMENTS=false` so a booking can never be confirmed without a real
payment.

To enable **Apple Pay**, register your domain under **Settings → Payments →
Payment method domains** in Stripe. Nothing changes in the code.

---

## Part 5 — Better maps (5 minutes, free, no card)

The app works without this, using OpenStreetMap. Mapbox gives noticeably better
Belgian address autocomplete and is worth adding before real customers arrive.

1. Sign up at **[account.mapbox.com](https://account.mapbox.com)**. The free
   tier covers 100,000 searches and 100,000 route calculations a month and does
   not ask for a card.
2. Copy your **Default public token**.
3. In Vercel, add `MAPBOX_TOKEN` = that token, and redeploy.

> Add it as `MAPBOX_TOKEN`, not `NEXT_PUBLIC_MAPBOX_TOKEN`. The app proxies
> every map call through its own server precisely so the token is never exposed
> in a browser where someone could copy it and spend your quota.

---

## Part 6 — Push notifications (5 minutes, free)

Push is what tells chauffeurs a new ride is available, and clients that a
chauffeur has been assigned.

```bash
npx web-push generate-vapid-keys
```

Add all three to Vercel and redeploy:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the public key |
| `VAPID_PRIVATE_KEY` | the private key |
| `VAPID_SUBJECT` | `mailto:your@email.com` |

Each user then switches notifications on from their profile page. Push requires
HTTPS, which Vercel provides automatically.

On iPhone, the site must be added to the home screen first (**Share → Add to
Home Screen**); iOS only delivers push to installed web apps.

---

## Part 7 — Email (optional, 5 minutes, free)

Without this, contact messages and booking notifications are still stored and
visible in the admin panel — nothing is lost, they just are not emailed.

1. Sign up at **[resend.com](https://resend.com)** (3,000 emails/month free).
2. Create an API key.
3. In Vercel add:

   | Name | Value |
   | --- | --- |
   | `RESEND_API_KEY` | your key |
   | `EMAIL_FROM` | `VIP Drivers <bookings@yourdomain.be>` |
   | `OPERATIONS_EMAIL` | where new bookings should be announced |

Verify your domain in Resend before using your own address in `EMAIL_FROM`.

---

## Part 8 — Your own domain (15 minutes)

1. Vercel → **Settings → Domains → Add**, enter e.g. `vipdrivers.be`.
2. Vercel shows the DNS records to create at your registrar. Add them.
3. HTTPS is issued automatically once DNS propagates.
4. Set `NEXT_PUBLIC_APP_URL` to `https://vipdrivers.be` and redeploy.
5. Update the redirect URI in Google (Part 3) and the webhook URL in Stripe
   (Part 4) to the new domain.

---

## Installing it as a phone app

The site is a PWA, so it installs from the browser with no app store.

**iPhone** — open the site in Safari, tap **Share**, then **Add to Home
Screen**.

**Android** — open in Chrome, tap the **⋮** menu, then **Install app**.

It then behaves like a native app: its own icon, full screen with no browser
chrome, and push notifications.

### Real App Store and Play Store apps

When you want listings in the stores, the same codebase can be wrapped with
[Capacitor](https://capacitorjs.com) — no rewrite. You will need an Apple
Developer account (99 €/year) and a Google Play account (25 € once). Because
the app is already installable and push-capable, this is packaging work rather
than a second product.

---

## Day-to-day

**Change prices** — Admin → Vehicles. Takes effect on the next quote; existing
bookings keep the price they were made at.

**Add a vehicle** — Admin → Vehicles → Add. Give it a slug, rates, capacity and
image URLs. Untick "visible on the site" to prepare it privately.

**Approve a chauffeur** — Admin → Chauffeurs. Only approved partners can claim
rides. You can set a different commission per driver on the same screen.

**Surcharges** — Admin → Settings. Night, weekend and per-stop fees are all 0%
by default, so nothing is added to a quote until you set one.

**Back up the database** — Neon keeps point-in-time history on the free tier.
For your own copy: `pg_dump "$DATABASE_URL" > backup.sql`.

---

## Troubleshooting

**Bookings stay "pending" after paying.** The webhook is not arriving. Check
Stripe → Developers → Webhooks → your endpoint → recent deliveries. A 400 means
`STRIPE_WEBHOOK_SECRET` does not match the endpoint's signing secret; a 503
means `STRIPE_SECRET_KEY` is missing on the deployment.

**`/admin` is missing from the menu.** Your email must be in `ADMIN_EMAILS`
(comma-separated, no spaces), and you must sign out and back in — the role is
read at sign-in.

**Google sign-in returns a redirect_uri_mismatch.** The URI in Google Cloud
must match exactly, including `https://` and the `/api/auth/callback/google`
path, with no trailing slash.

**Addresses do not autocomplete.** Type at least 3 characters. Without a Mapbox
token the app uses OpenStreetMap, which rate-limits to one request per second,
so results take a moment. Adding `MAPBOX_TOKEN` fixes both the speed and the
quality.

**"Too many connections" from the database.** You are using the unpooled Neon
string. Switch to the pooled one (its host contains `-pooler`).

**The Vercel build fails.** The build must never need your runtime secrets —
it compiles the code, it does not run your app. If a build error mentions a
missing environment variable, that is a bug rather than a configuration
problem: the app is written so that `next build` succeeds with no variables at
all, and a missing one surfaces as a clear error on the first request instead.
Open the full build log, and check the failing step is not something else
entirely (a TypeScript error, or a dependency that failed to install).

**Everything 500s right after deploying.** The build succeeds without
environment variables, so the first sign that one is missing is at runtime.
Open **Vercel → your deployment → Runtime Logs**; the error names the exact
variable. `DATABASE_URL` and `AUTH_SECRET` are the two the app cannot run
without. After adding a variable you must **redeploy** — existing deployments
keep the values they were built with.

**A price looks wrong.** Open the booking: the full breakdown is stored on it,
showing the metered fare, any minimum-fare adjustment, each surcharge and the
VAT, as they were at the moment of booking.
