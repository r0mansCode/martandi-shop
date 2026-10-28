# Martand Shop — Project Plan

Status: phase 0 (local part), 1 and 2 done. Cart store (localStorage) and header badge exist; cart page, popover and checkout are phase 3. Last updated 2026-10-07.

Implementation notes:
- Next.js 16.4 with **Cache Components disabled**: Amplify Hosting officially documents support up to Next.js 15, so we use the previous caching model (static pages + `revalidatePath`/`revalidateTag`), which Amplify handles. Verify with an early Amplify deploy.
- Mock data: 139 products (137 visible, 2 drafts) in 13 categories, generated from the provided photos into `data/seed/*.json`; photos renamed to `public/products/<slug>.<ext>`. Local DB copy lives in `.data/db.json` (`npm run db:reset` to reseed).

## 1. Decisions

| Topic | Decision |
|---|---|
| Market | Latvia only, EUR only, Latvian language only (strings in one dictionary file so more languages can be added later) |
| Products | Alcohol now, possibly snacks later. < 50 products, may grow to ~100 |
| Variants | Yes (e.g. 0,7 l / 1 l). Each variant has its own price |
| Inventory | Not tracked |
| Fulfilment | **Pickup only**, no shipping, no shipping fees. Location: Krustpils iela 58, Rīga, LV-1057 (same as the legal address) |
| Pickup hours | Placeholder: Mon–Fri 10:00–20:00, Sat 10:00–18:00, Sun closed (in config, easy to change) |
| Age check | No site-wide popup. A required 18+ checkbox at checkout, plus ID shown at pickup. Notice in cart/checkout/email/invoice |
| Payment | Always bank transfer against an emailed PDF invoice. Due in **14 days**. Stripe later |
| Buyers | Guest checkout only. Private or company buyer (company details printed on the invoice) |
| Invoice | PDFKit, Roboto Regular/Bold (copied from ohmycrisp `public/fonts/`), attached to the Resend email. Number format `MRT-YYYY-NNNNN` |
| Admin auth | Amazon Cognito (self-signup off, TOTP MFA) |
| DB | DynamoDB in production. **Mock repositories first** |
| Hosting | AWS Amplify Hosting (SSR) + Route 53 DNS |
| Tracking | None (no Meta Pixel / GA) → no cookie banner needed |

## 2. Stack

- Next.js (App Router, TypeScript), SCSS modules (`*.module.scss`, tokens as CSS custom properties in `globals.scss`, mixins in `src/styles/_mixins.scss`), no UI component library
- Fonts via `next/font` (latin-ext subset for Latvian diacritics)
- Resend + React Email for emails; PDFKit for invoices (`serverExternalPackages: ["pdfkit"]`, Node runtime only)
- DynamoDB (on-demand) via AWS SDK v3; S3 + CloudFront for product images
- Cognito for admin auth
- GitHub → Amplify CI/CD

Estimated running cost: ~€1–5/month + domain.

## 3. Rendering strategy

| Kind | Pages | How |
|---|---|---|
| Static + on-demand revalidation | Home, category, product, info pages | Pre-rendered; admin saves call `revalidateTag` for affected pages |
| Static shell + client island | Cart | Cart lives in localStorage; tiny client component |
| Server Action | Checkout submit | Validates, re-prices server-side, creates order, sends invoice |
| Dynamic (SSR) | Thank-you page, all admin | `noindex`; admin auth re-checked on every page and action |

Performance budget: Lighthouse ≥ 95 on mobile, minimal client JS (cart, variant picker, mobile menu, gallery only), no third-party scripts.

## 4. Data model (mocks mirror this exactly)

**Category**: `id, slug, name, description, sortOrder`

**Product**
- `id, slug, name, description, categoryId`
- `images[]` (url, alt)
- `status: draft | published`
- `badge?` (e.g. "Jaunums", "Populārs")
- Optional attributes: `abv?` (alcohol %), `country?`, `producer?`; abv is optional so non-alcohol items (snacks) work
- `isAlcohol: boolean` (drives the pickup/18+ requirements)
- `variants[]`: `id, label ("0,7 l"), priceCents (incl. VAT), active`
- `createdAt, updatedAt`

**Order**
- `id, invoiceNumber, createdAt, dueDate (createdAt + 14 days)`
- `status: awaiting_payment → paid → ready_for_pickup → collected | cancelled`
- `customer: { name, email, phone }`
- `buyerType: private | company`
- `company?: { name, regNo, vatNo?, legalAddress }`
- `items[]`: snapshot `{ productId, variantId, name, variantLabel, unitPriceCents, qty }`
- `totals: { netCents, vatCents, grossCents }` (VAT 21%, computed once from gross, in integer cents)
- `ageConfirmedAt`
- `pickupLocation` (snapshot)
- `paymentMethod: bank_transfer` (`stripe` later), `paymentStatus`
- `paidAt?, readyAt?, collectedAt?, cancelledAt?`

**Counter**: `INVOICE#YYYY → lastNumber` (atomic increment; gapless sequence)

### Data access layer
`ProductRepo`, `CategoryRepo`, `OrderRepo`, `CounterRepo` interfaces with two implementations:
- `mock`: JSON file on disk (persists across dev restarts), seeded with sample data
- `dynamo`: single-table DynamoDB (`src/server/db/dynamo.ts`, key layout in `dynamo-items.ts`). Table `martandi-shop-prod` in eu-north-1, GSI `GSI1`. Seed with `npm run db:seed:dynamo` (needs `DYNAMODB_TABLE`, `DYNAMODB_REGION`, `AWS_PROFILE`)
Product images: private S3 bucket `martandi-shop-images` (eu-north-1, uploads under `products/`) served through CloudFront `d3km0y3qcm4oz.cloudfront.net` (distribution `E1IUIIRH4OS5AM`, origin access control). IAM policy `martandi-shop-images-write` (Put/Delete on `products/*`) is attached to the `martandi-shop-compute` role and the `martandi-shop-local` user; bucket CORS allows `PUT` from localhost:3000 and the Amplify domain.

Selected via `DATA_SOURCE=mock|dynamo`. **Mock mode is local-only**: Amplify has no persistent disk.

## 5. Page map

| Route | Purpose |
|---|---|
| `/` | Hero band with category tiles, featured products, pickup info banner |
| `/katalogs` / `/katalogs/[kategorija]` | Grid + filters (country, producer, abv range) + sort, filtered client-side |
| `/produkts/[slug]` | Gallery, variant picker, add to cart, pickup notice, details |
| `/grozs` | Cart |
| `/noformet` | Checkout |
| `/paldies/[orderId]` | Confirmation + bank details |
| `/sanemsana`, `/noteikumi`, `/privatuma-politika`, `/par-mums` | Static info |
| `/admin/login` | Cognito + MFA |
| `/admin` | Orders list (filter by status) |
| `/admin/pasutijumi/[id]` | Order detail, status changes, download/resend invoice |
| `/admin/produkti`, `/admin/produkti/[id]`, `/admin/kategorijas` | CRUD |
| `sitemap.xml`, `robots.txt` | Generated; robots disallows `/admin`, `/noformet`, `/paldies`, `/api` |

## 6. Order & invoice flow

1. Client sends **only** `{ variantId, qty }[]` + customer data. Never prices.
2. Server: validate (zod), honeypot + rate limit, require `ageConfirmed` if any alcohol item.
3. Server loads variants, computes totals in cents, gets next invoice number from the counter.
4. Save order (`awaiting_payment`, due in 14 days).
5. `renderInvoicePdf(order)` → Buffer (reusable by admin download/resend).
6. Resend email: summary, bank details, payment reference = invoice number, due date, pickup address/hours, "bring ID" notice, PDF attached.
7. Admin marks **paid** → confirmation email. Admin marks **ready for pickup** → pickup email. Then **collected**.
8. Overdue unpaid orders are flagged in admin (manual cancel for now; auto-cancel can be added later).

### Invoice PDF layout (based on ohmycrisp `api/payment-invoice/route.ts`)
Header with logo → "Rēķins" → buyer block (private or company: name, reg. no., VAT no., legal address) and seller block (company name, reg. no., VAT no., address, bank, IBAN) → line table (product + variant, qty, unit price excl. VAT, line total excl. VAT) → total excl. VAT, PVN 21%, **amount to pay** → invoice number, date, due date, payment note → pickup notice.

### Fixes compared to ohmycrisp
- Server-side pricing (ohmycrisp trusts client `price`/`finalPrice`)
- Sequential, collision-free invoice numbers (ohmycrisp: random 4 digits)
- Integer-cent VAT math (ohmycrisp: per-line floats)
- No second `req.json()` in the error path
- PDF generation extracted into a reusable module
- `serverExternalPackages` (not the deprecated experimental key)

## 7. Admin security

- Cognito user pool, self-signup disabled, one or more admin users, TOTP MFA required
- Session in HttpOnly, Secure, SameSite=Lax cookie
- Middleware only redirects for UX; **every admin page and Server Action calls `requireAdmin()`** (defends against middleware-bypass bugs like CVE-2025-29927)
- `noindex` on admin; robots disallow; rate limiting on login
- Least-privilege IAM role for the SSR compute: only this table and this bucket
- Image uploads via presigned S3 URLs with content-type and size limits

## 8. SEO

`generateMetadata` per page (title, description, canonical, Open Graph), `sitemap.ts` from the DB, `robots.ts`, Product JSON-LD with `AggregateOffer` over variants, BreadcrumbList JSON-LD, `lang="lv"`, Latvian slugs, semantic HTML, optimized images with alt text.

## 9. Design system (reference: Faire web on Mobbin)

Reference screens:
- Product page: https://mobbin.com/screens/df14d5be-5a4c-4355-9f96-29c79f3a5dd3
- Cart: https://mobbin.com/screens/d784eaae-7bc2-4c3e-8a9e-e68612734f28
- Checkout: https://mobbin.com/screens/e1317887-fff6-4f31-bc2b-38c14f8e9082
- Home: https://mobbin.com/screens/f6352ef8-0262-4a31-9a20-c0f2383d7f91
- Category menu: https://mobbin.com/screens/eec80858-a07b-4aaa-8813-cb168b555f53

**Typography**: light high-contrast serif for page titles, product names and section headings (e.g. Newsreader); clean sans for UI and body (e.g. Inter). Both latin-ext, self-hosted via `next/font`. Letter-spaced uppercase wordmark logo.

**Color tokens (starting point)**
- Background `#FFFFFF`, text `#333333`, muted text `#757575`, borders `#E5E5E5`
- Primary button: solid charcoal `#333333`, white text, square corners
- Secondary button: white with 1px charcoal border
- Accent (badges, highlights): rust `#A0461E`
- Info panels: warm beige `#F5F0EA`
- Hero band: olive `#5C5945`; promo band: deep maroon `#4E1A10`
- Announcement bar: near-black `#333333` with white text

**Shapes**: sharp/2px radius on buttons and cards, pill-shaped search input, 1px hairline dividers, generous whitespace.

**Components**
- **Announcement bar**: "Saņemšana tikai veikalā — Krustpils iela 58, Rīga · ar personu apliecinošu dokumentu"
- **Header**: wordmark · "Visas kategorijas" dropdown · pill search (client-side over a small static product index) · cart icon with count badge. Second row: category links
- **Product card**: square image on light-gray tile, badge top-left, price, 2-line name clamp, "2 tilpumi" variant count, optional abv · country meta line. 4 columns desktop / 2 mobile. (No hearts, ratings, MSRP)
- **Product page**: 2×2 image grid (mobile: CSS scroll-snap carousel, no JS library) · badge · serif title · price · variant boxes (square toggles like Faire's size picker) · quantity select · full-width charcoal "Pievienot grozam" · beige info panel replacing Faire's shipping box: pickup address, hours, ID requirement · details list (abv, country, producer) · description
- **Added-to-cart popover**: top-right panel with item, qty, price, "Uz grozu" button
- **Category page**: left filter column (category, country, producer, abv) · sort dropdown · grid
- **Cart**: items list left, summary box right (subtotal, PVN, total, "Noformēt pasūtījumu"), sticky bottom bar on mobile, pickup notice
- **Checkout**: minimal header (logo only). Left: contact, private/company toggle → company fields, pickup info (read-only), payment = bank transfer (single option), 18+ checkbox, terms. Right: order summary + "Pasūtīt" button
- **Admin**: same tokens, utilitarian tables and forms

**Not copied from Faire**: wishlists, ratings, notifications, accounts, brand pages, wholesale/MSRP, promo popups.

## 10. Phases

| # | Phase | Deliverable |
|---|---|---|
| 0 | Setup | Next.js + SCSS + fonts + tokens, GitHub repo, Amplify app, Route 53 domain |
| 1 | Data layer + mocks | Types, repo interfaces, JSON mock implementation, seed data (sample products/categories, placeholder images) |
| 2 | Storefront | Layout/header/footer, home, category with filters, product page with variant picker, search |
| 3 | Cart + checkout | localStorage cart, popover, cart page, checkout Server Action, honeypot + rate limit |
| 4 | Invoice + email | `renderInvoicePdf` (Roboto), React Email templates, Resend domain DNS records in Route 53 |
| 5 | Admin | Cognito + MFA, `requireAdmin`, product/variant/category CRUD with image upload, order management, revalidation |
| 6 | SEO + legal | sitemap, robots, metadata, JSON-LD, terms/privacy/pickup pages |
| 7 | DynamoDB + launch | Dynamo repos, IAM, env vars, production smoke test, Lighthouse pass |

## 11. Seller details (invoice)

| Field | Value |
|---|---|
| Company | SIA "Martandi" |
| Legal address | Krustpils iela 58, Rīga, Latvija, LV-1057 |
| Reg. Nr. | 40103844462 |
| PVN Nr. | LV40103844462 |
| Bank | AS "Citadele Banka" |
| SWIFT | PARXLV22 |
| IBAN | LV41PARX0016378160001 |

Stored in a single config module (`src/config/seller.ts`), not hard-coded in the PDF code. The invoice shows both Reg. Nr. and PVN Nr., with the 21% PVN breakdown. Pickup address = legal address.

## 12. Product mocks

Generated in phase 1 from the photos in `product-photos/` (143 files). Each photo is identified (brand/product from file name or image) and turned into a product with plausible random data: Latvian description, price, abv, country, producer.

- **Categories (draft)**: Sarkanvīns, Baltvīns, Rozā vīns, Dzirkstošie vīni, Viskijs, Konjaks un brendijs, Tekila, Rums, Degvīns, Liķieri, Bezalkoholiskie
- **Variants** where the photos support it (e.g. Thomas Henry 0,2 l / 0,75 l, bottle vs 3 l bag-in-box), otherwise a single variant
- **Non-alcohol items** (Thomas Henry tonics, ginger beer) get `isAlcohol: false`, so the snacks/non-alcohol path is tested from day one
- Some products marked `draft` and some with badges, to exercise admin and UI states
- Photos moved to `public/products/` with slug-based names (S3 in production)

Photo notes: mixed formats (white-background JPEGs, transparent PNGs), max ~500px. Cards use a light tile with `mix-blend-mode: multiply` so white backgrounds blend in; 500px is enough for cards and the product page at normal size, but not for zoom. Higher-resolution photos can replace them later through the admin.

## 13. Open items (not blocking)

- Logo and real product photos
- Confirm with the licence holder/accountant: Latvian alcohol sale hours and whether online order + store pickup counts as distance selling
- Real pickup hours (placeholder used)
