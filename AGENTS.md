<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TaviDzērieni.lv: agent guide

Read this file first. `PLAN.md` has the original design decisions and phase table. Where the two disagree, the code is right, then this file.

## Project overview

**TaviDzērieni.lv** (https://tavidzerieni.lv) is a small online shop for wine, spirits and some non-alcoholic drinks. The seller is SIA "Martandi". It has fewer than about 100 products, and many have size variants (e.g. 0,7 l / 1 l).

Business rules that shape the code:

- **Latvia only.** The whole UI, emails and the PDF are in Latvian (`lv-LV`). Prices are in EUR, timezone `Europe/Riga`.
- **Pickup only**, at Krustpils iela 58, Rīga. There is no shipping and no delivery fee. Customers show ID at pickup.
- **Alcohol:** checkout requires an 18+ checkbox when the cart has alcohol (`isAlcohol`).
- **Payment is always a bank transfer.** The customer gets a PDF invoice by email, due in 14 days. Invoice numbers are `MRT-YYYY-NNNNN`. The admin marks orders as paid by hand after checking the bank statement, and that is intended. Overdue invoices trigger nothing: no reminder, no auto-cancel.
- **Deleted invoices are treated as never used.** The next invoice continues from the highest number still in use. The accountant is fine with this, so don't "fix" it with credit notes or by forbidding gaps.
- **Buyers** can be private persons or companies. Companies give name, Reg. Nr., an optional PVN Nr. and a legal address.
- **Order statuses:** awaiting payment → paid → ready for pickup → collected (or cancelled). Each of paid, ready and collected sends the customer an email automatically. Cancelling **deliberately** sends no email.
- **Alcohol sale-hour rules** apply to pickup only, not to placing orders online. Don't block checkout by time of day.
- **Explicitly out of scope:** customer accounts, inventory tracking, Meta Pixel/GA, shipping, and Stripe/card payments. Don't design for Stripe now.
- **Seller details** (Reg./PVN Nr., IBAN, bank) live in `src/config/seller.ts`. Shop settings (VAT 21%, due days, invoice prefix, email sender, the *default* pickup hours) live in `src/config/site.ts`. Never hard-code them anywhere else.
- **Opening hours = pickup hours**, edited by the admin under „Darba laiks” (`/admin/darba-laiks`) together with an optional closure notice (one day or a date range: „… datumā(os) būsim slēgti.”). The notice shows on the storefront until its last day has passed, then hides itself. Until the admin saves, `pickup.defaultWeek` from `site.ts` is used.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js **16.4.1** App Router, Turbopack, React 19.3, TypeScript strict |
| Styling | **SCSS modules** (not Tailwind). Tokens are CSS variables in `src/app/globals.scss`, mixins in `src/styles/_mixins.scss` |
| Validation | zod 4 |
| Data | DynamoDB single table `martandi-shop-prod` (eu-north-1). Local dev uses a JSON mock store, chosen by `DATA_SOURCE=mock\|dynamo` |
| Images | S3 bucket `martandi-shop-images` behind CloudFront (`NEXT_PUBLIC_IMAGES_URL`), uploaded from the admin via presigned PUT. Seed images are in `public/products/` |
| Email | Resend (domain tavidzerieni.lv, sender `veikals@tavidzerieni.lv`). The mailbox is on Zoho Mail |
| PDF | PDFKit with Roboto from `assets/fonts/`. It is a `serverExternalPackages` entry |
| Admin auth | Cognito user pool `martandi-shop-admin`: managed login, auth code + PKCE, no self-signup. Users must be in the group **`admin`**. MFA is required; a passkey (user verification required) counts as MFA on its own, otherwise password + email code or TOTP. Admin-created users are never prompted for a passkey, so the admin header links to `/api/auth/login?atslega=1` (Cognito's `/passkeys/add`). Cognito email goes through SES (`no-reply@tavidzerieni.lv`, domain identity in eu-north-1), separate from Resend. Password recovery is admin-only, which Cognito requires for email MFA |
| Hosting | AWS Amplify app `d38a541mf8rmxo` (eu-north-1). Pushing `main` deploys automatically. The compute role is `martandi-shop-compute` |
| DNS | Route 53 hosted zone `Z0178077PFG1OW4TNS85`, with Zoho MX/SPF/DKIM/DMARC and Resend DKIM/return-path records |

## Project structure

```
src/
  app/
    (shop)/                 storefront (Latvian route names)
      page.tsx              home
      katalogs/[kategorija] catalog + category pages (static, generateStaticParams)
      produkts/[slug]       product page
      grozs/                cart
      noformet/             checkout page + actions.ts (placeOrder)
      paldies/[id]          thank-you page (force-dynamic, UUID-checked)
    admin/                  Cognito-protected admin
      produkti/             product list + [id] edit (ProductForm, ImagesField)
      kategorijas/          drag-reorder list (CategoryList), jauna/ create, [id] edit (shared CategoryForm)
      darba-laiks/          opening hours + closure notice (HoursForm)
      pasutijumi/           orders: table tab + sales-summary tab, [id] detail, [id]/rekins PDF route
      actions.ts            catalog Server Actions; pasutijumi/actions.ts for orders
      ConfirmButton.tsx     window.confirm submit button for destructive actions
    api/auth/{login,callback,logout}   Cognito OAuth flow
    api/search-index/       static JSON index for the header search
  components/               cart/, catalog/, checkout/, layout/, product/, ui/, icons.tsx
  config/                   site.ts, seller.ts (single source of business constants)
  lib/                      client-safe code: types, cart store, zod inputs, format, money, order-status, search
  server/                   server-only: db/, auth/, orders.ts, invoice-pdf.ts, email.ts, customer-emails.ts, emails/
  styles/_mixins.scss
  proxy.ts                  (Next 16's "middleware") admin redirect + token refresh
data/seed/                  categories.json, products.json (mock + Dynamo seed source)
.data/db.json               mock store, created from the seed on first use (gitignored)
assets/fonts/               Roboto for the PDF
scripts/                    seed-dynamo, migrate-images-to-s3, send-test-email (.mts, run with tsx)
amplify.yml                 build spec; copies runtime env vars into .env.production
```

## Architecture

**Rendering.** Storefront pages are static with time-based ISR: `export const revalidate = 60` in `(shop)/layout.tsx` (covers every storefront page) and in `api/search-index`. **Amplify Hosting does not support on-demand revalidation**, so `revalidatePath()` has no effect in production, and only the 60-second ISR picks up catalog edits there. Admin Server Actions still call `refreshStorefront()` (`revalidatePath("/", "layout")` + `/api/search-index`) so other hosts and local `next start` update immediately. Don't remove the `revalidate` exports.

**Category order.** `sortOrder` is written only by the drag-and-drop list (`reorderCategories`, always 1…n), except that `createCategory` appends a new category at max + 1. The edit form shows the position read-only and `saveCategory` keeps the stored value. `byCategoryOrder` (`server/db/types.ts`) breaks ties by id in both stores. **Cache Components is intentionally OFF**, because Amplify officially supports only the previous caching model. Don't enable `cacheComponents` or `"use cache"`.

**Data layer.** `src/server/db/types.ts` defines the repo interfaces: `CategoryRepo`, `ProductRepo`, `OrderRepo` (with `delete`), `CounterRepo` (`next`, plus `rewind` as a compare-and-set) and `SettingsRepo` (small key → document store, e.g. `shop-hours`; callers validate with zod). `mock.ts` and `dynamo.ts` both implement them, and `db/index.ts` picks one from `DATA_SOURCE`. Always go through `db.*`; never call DynamoDB directly from pages. The single-table key layout is documented in `dynamo-items.ts` (PK `TYPE#id`, SK `META`, GSI1 for list/slug, orders sorted by `createdAt`).

**Admin security.** `proxy.ts` only redirects and refreshes tokens, for convenience. **`requireAdmin()` (`src/server/auth/session.ts`) is the real check.** Call it at the top of every admin page, layout, route handler and Server Action.

**Cart and checkout.**
- The cart lives in `localStorage` (`martandi-cart`). `src/lib/cart.ts` is a `useSyncExternalStore` store, so components read it with `useCart()` / `useCartCount()`.
- `placeOrder` re-prices every line from the DB. If prices or availability changed it returns `cart_changed`, and the client calls `applyServerCart`. It enforces the age check, a honeypot and an in-memory rate limit (`server/rate-limit.ts`).
- `createOrder` (`server/orders.ts`) gets the invoice number from `counters.next("invoice-YYYY")`.

**Opening hours.** `lib/shop-hours.ts` holds the zod schema, day grouping („P–Pk 10:00–20:00”) and the closure sentence; `server/shop-hours.ts` reads/saves them (`getPickupInfo()` is `cache()`d per request). The shop layout passes `PickupInfo` to client components through `PickupInfoProvider`; render hours with `<PickupHours>` (or `hoursLine()` in server pages), never from config. Emails get the hours and closure; the invoice PDF gets the hours only, since it is a permanent document.

**Invoices and emails.**
- `renderInvoicePdf(order)` builds the PDF.
- `sendInvoice` / `sendStatusEmail` live in `server/customer-emails.ts`. They use Resend idempotency keys (e.g. `status-${id}-${status}`) and record `invoiceEmailedAt` / `statusEmailedAt[status]` on the order.
- Without `RESEND_API_KEY`, dev only logs the email; production throws.

**Money.** All amounts are **integer cents**. VAT is included in the price, and `splitVat(gross)` derives net and VAT once. Never do float euro arithmetic.

**Packaging deposit (depozīts).** A variant can carry `depositCents` (admin checkbox per size; default `site.defaultDepositCents` = 10). It is VAT-free (0%) and charged on top of the price, so it never goes through `splitVat`: use `orderTotals(lines)`, which returns `netCents + vatCents` for the goods plus `depositCents`, and `grossCents` = amount payable. Order items snapshot the deposit. The invoice shows it as a separate row under its product; revenue in the orders summary excludes it. A changed deposit counts as a stale cart at checkout (`cart_changed`). The cart and checkout pages also sync line prices and deposits on open from `/api/variant-prices` (static, 60 s ISR) via `useCartPriceSync`, so localStorage carts filled before a change show the right total.

**Environment on Amplify.** Console env vars exist only at build time. `amplify.yml` greps `^(DATA_SOURCE|DYNAMODB_|COGNITO_|IMAGES_|RESEND_|NEXT_PUBLIC_)` into `.env.production`. **A new runtime env var needs a matching prefix there**, or it will be undefined in production. That exact bug once stopped invoice emails.

## Coding conventions

- **Language split:** everything a shop user or admin user reads is Latvian, with correct diacritics and „…” quotes: storefront, admin UI, error and validation messages, emails, PDF, and any end-user docs. Code, identifiers, code comments and this file are English. Routes and query params are Latvian (`?zina=dzesta`, `?lejupieladet=1`).
- **Next 16 APIs:**
  - Use the global types `PageProps<"/route">`, `LayoutProps` and `RouteContext<"/route">`. `params` and `searchParams` are Promises, so `await` them.
  - Run `next typegen` (part of `npm run typecheck`) after adding routes.
  - `useSearchParams` must sit behind `<Suspense>`.
- **Server Actions:** validate with zod on the server, re-check `requireAdmin()`, and return a typed state (`FormState`, `CheckoutState`). Forms use React 19 `useActionState`. For forms that must not reset, submit object payloads through `startTransition`.
  - With `.bind()`, pass every argument explicitly (e.g. `bind(null, id, here)`), so FormData never lands in a string parameter.
  - Redirect targets from the client (`returnTo`) must be validated to stay under the expected path.
- **Boundaries:** `src/server/**` imports `"server-only"`; `src/lib/**` must stay client-safe. Business constants come from `config/`.
- **SCSS:**
  - Use one `*.module.scss` file per component or page, imported as `s`. Admin pages also import shared `../admin.module.scss` as `a`.
  - Start each file with `@use "@/styles/mixins" as *;`. Use `up(md|lg)` for breakpoints (mobile-first), plus `container`, `line-clamp(n)` and `visually-hidden`.
  - Use tokens (`var(--color-fg)`, `--radius: 2px`, …) instead of new hex values where possible. Light theme only.
  - Use `minmax(0, 1fr)` grid columns to avoid mobile overflow.
- **Design:** the look will change over time, so keep styling in tokens and modules where it's easy to restyle. The current look is quiet and Faire-like. Product photos sit on light tiles with `mix-blend-mode: multiply`. Buttons are sharp, 2px radius.
- **Admin UI:**
  - Tables use whole-row click through a stretched link: add `a.clickable` to the table and `a.rowLink` to the link, and put interactive cells above the link with `a.aboveRow`.
  - Destructive actions use `ConfirmButton`.
  - Show feedback through `?zina=` query messages (see `lib/order-messages.ts`).
- **Accessibility:** icon buttons get `aria-label` in Latvian. Live counters and status use `aria-live`. Drag-and-drop also has a keyboard path.
- **Dates:** use the helpers in `lib/format.ts` (`formatDate`, `formatDateTime`, `toDayKey`), which are always in Riga time. Don't call `Date.now()` during render; it fails the react-hooks purity lint.
- **Reusable components:** when the same UI or behaviour shows up in a second place, extract one component and use it in both, so they can't drift apart. For example, `components/cart/AddToCartButton` serves both the product cards and the product page. Keep it simple: a small prop for real differences (e.g. `size`) is fine, but don't add config objects, render props or generic abstractions for cases that don't exist yet. A one-off stays inline.
- **Comments:** explain *why*, briefly. Keep files small and focused, and don't add dependencies casually. The goal is a lightweight, fast shop.

## Development commands

```bash
npm run dev            # http://localhost:3000, DATA_SOURCE=mock by default
npm run typecheck      # next typegen && tsc --noEmit — run after every change
npm run lint
npm run build          # if it fails on fonts or odd cache errors: delete .next and retry
npm run db:reset       # wipe .data/ so the mock store re-seeds from data/seed
npm run email:test     # send a test email via Resend (needs RESEND_API_KEY in .env.local)
npm run db:seed:dynamo # seed DynamoDB from data/seed (needs AWS_PROFILE + DYNAMODB_TABLE)
npm run images:migrate # copy seed images to S3
```

The preview server config is in `.claude/launch.json` (name `dev`). Verify with typecheck, lint and the browser preview.

**Tests:** there is no test runner yet. Write tests **only for critical code**:
- money: `lib/money.ts`, `splitVat`, cents conversion, order totals
- invoice numbering: `counters.next` / `rewind`, `deleteOrder`
- checkout re-pricing and validation: `createOrder`, `checkout-input`
- security: `requireAdmin`, token verification, `returnTo` validation, rate limit

Don't write tests for UI components or styling. When a test runner is added, list its command here.

## AI instructions

1. **Verify before you finish.**
   - Run `npm run typecheck` and `npx eslint <changed paths>`.
   - For UI changes, use the `dev` preview: check behaviour with `javascript_tool`/`read_page`, take a screenshot as proof, then restore state (e.g. clear `martandi-cart`).
   - Admin pages need the user's Cognito login, so you can only confirm that signed-out visitors are redirected. Say so instead of claiming you verified them.
2. **Never commit or push until the user explicitly says so**, even after finishing a task. `main` deploys straight to production through Amplify. Only the user and agents commit, directly on `main` with no branches or PRs, and agents do it only on the user's command. Start commit messages with an imperative summary and end them with the Co-Authored-By trailer. After pushing, you can watch the Amplify job with `aws amplify list-jobs --app-id d38a541mf8rmxo --branch-name main`.
3. **Production is off-limits for reads and writes.** Don't scan or modify the production DynamoDB table, S3 objects or Cognito users unless the user asks for that specific action. Don't work around a denied permission.
4. **There is no staging environment.** The user tests live emails with their own personal addresses. Never trigger emails to real customer addresses yourself; in dev without `RESEND_API_KEY`, emails are only logged.
5. **Seed data (`data/seed/`) changes only after the user approves.** Ask first and say exactly what would change.
6. **Secrets:** never ask for or echo API keys or passwords. The user puts them in `.env.local` and the Amplify console themselves. `.env.local` is gitignored, so don't print it.
7. **New env var?** Add it to `.env.example` and make sure `amplify.yml`'s grep covers its prefix.
8. **New catalog mutation?** Call `requireAdmin()` and `refreshStorefront()`. New mutations of order data must keep the invoice counter consistent (`deleteOrder` rewinds it).
9. **Read the bundled Next docs** (`node_modules/next/dist/docs/`) before using an API you aren't sure about in Next 16. Training-data habits like `middleware.ts`, sync `params` or `next/router` are wrong here.
10. **Reference projects** the user may point to:
   - `C:\Users\koval\Documents\Repos\ohmycrisp\ohmycrisp`: storefront and invoice patterns. It uses Redux, next-intl and a Meta pixel; adapt the ideas, not those dependencies.
   - `C:\Users\koval\Documents\Repos\ohmycrisp-admin`: the admin orders layout.
11. **Keep the user informed** with short progress notes during long tasks. Talk to the user in English, in the current concise style. Latvian is for product-facing text only.
12. **Keep `PLAN.md` phase status and this file up to date** when architecture or conventions change.

## Status and open items

- **Done:** phases 0–5 and 7 (setup, data, storefront, cart/checkout, invoice + email, admin, Dynamo launch). Recent additions: a card quantity stepper, drag-reorder categories, an orders summary tab, a per-variant packaging deposit (prefilled for Thomas Henry in the seed), a shared `AddToCartButton`, and admin-editable opening hours with a closure notice.
- **Open:**
  - Phase 6, SEO + legal: sitemap, robots, JSON-LD, terms/privacy pages. Parked until the user starts it.
  - A test runner and tests for critical code (see Development commands).
  - An added-to-cart popover.
  - The Lighthouse pass.
  - A real logo and photos.
