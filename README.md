# LearnX LMS

A full-stack learning platform built with Next.js App Router, TypeScript, MongoDB, and Stripe. Students discover courses, enroll or purchase access, watch protected lessons, and track progress. Administrators manage the catalog, lessons, media, categories, students, enrollments, and payments.

## Features

- Email/password registration and login using stable NextAuth v4, JWT sessions, and bcrypt.
- Student/admin authorization enforced in server-rendered pages **and every protected API**.
- Searchable, paginated public catalog with category and level filters.
- Draft/published courses, rich course descriptions, thumbnails, pricing, and ordered lessons.
- Direct signed Cloudinary uploads with progress, file validation, and authenticated video storage.
- Public lesson previews; expiring playback URLs for authorized lessons.
- Free enrollment and Stripe-hosted Checkout for paid courses.
- Signature-verified, idempotent webhook fulfillment and unique enrollments.
- Student dashboards, lesson completion, and curriculum-aware progress recalculation.
- Admin metrics, course editor, category management, student suspension, and accounting tables.
- Responsive layouts, accessible form labels, confirmation dialogs, loading/empty/error states, and toast feedback.

## Stack

Next.js 16 · React 19 · TypeScript 6 · Tailwind CSS 4 · MongoDB 8 · Mongoose 9 · NextAuth 4 · Stripe · Cloudinary · React Hook Form · Zod · bcryptjs · Lucide · Sonner.

The lockfile pins the installed stable dependency versions. TypeScript 6 and ESLint 9 are used because the installed Next.js lint stack is not compatible with TypeScript 7's compiler API. Authentication uses the stable NextAuth release rather than a prerelease Auth.js build.

## Quick start

Requirements: Node.js 22.12+ (Node 24 recommended), npm, MongoDB, a Cloudinary account, and Stripe **test-mode** credentials. `curl` is used only to download seed media.

```bash
npm ci
cp .env.example .env.local
# Fill in .env.local as described below.
npm run seed:assets
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the admin email and password you supplied to the seed. Register a separate student account to exercise the student journey.

Without `DATABASE_URL`, the public landing/catalog pages render an empty collection. Authentication and data-backed functionality require a working database. Cloudinary and Stripe show service errors when their credentials are missing; no fake enrollment or payment success is substituted.

## Environment variables

All variables belong in `.env.local` for local development and your hosting provider's secret/environment configuration in production. This file is ignored by Git.

| Variable                | Purpose                                                                     |
| ----------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`          | MongoDB connection URI, including database name                             |
| `AUTH_SECRET`           | Cryptographically random session-signing secret                             |
| `NEXTAUTH_URL`          | Canonical app origin, e.g. `http://localhost:3000`; use HTTPS in production |
| `STRIPE_SECRET_KEY`     | Stripe server API key; use `sk_test_…` locally                              |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this webhook endpoint/listener                           |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary product environment name                                         |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                                                          |
| `CLOUDINARY_API_SECRET` | Cloudinary server signing secret                                            |
| `SEED_ADMIN_EMAIL`      | Email for the initial administrator                                         |
| `SEED_ADMIN_PASSWORD`   | Initial admin password; at least 10 characters and at most 72 UTF-8 bytes   |

Generate `AUTH_SECRET` locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unnecessary: the app redirects to the server-created hosted Checkout URL and does not embed Stripe Elements. No database URI, session secret, Stripe secret, or Cloudinary secret is exposed to the client. Cloudinary's account name, API key, and scoped upload signature are intentionally returned only to an authenticated admin for direct uploads.

## MongoDB setup

Use MongoDB Atlas or a local MongoDB installation:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/learnx-lms
```

For Atlas, create a database user, allow your application's network access, and use the `mongodb+srv://…/learnx-lms` connection string. URL-encode special characters in database passwords.

The seed initializes the model indexes, including unique user emails, category/course slugs, `(userId, courseId)` enrollments, Stripe session IDs, and one pending checkout per student/course. Run the seed before initial use so these constraints are ready. The connection utility caches both the connection and in-flight promise across development hot reloads and recovers from failed connections.

A standalone MongoDB server is sufficient. Progress uses atomic update pipelines; payment fulfillment uses retry-safe writes rather than requiring multi-document transactions.

## Cloudinary setup and media behavior

1. Create a Cloudinary product environment and copy its cloud name, API key, and API secret into `.env.local`.
2. No unsigned upload preset is required. `/api/uploads/sign` creates signed, unique uploads only for active administrators.
3. Upload thumbnails in the course editor: JPEG, PNG, or WebP, up to 5 MB.
4. Upload lesson videos in the lesson editor: MP4, WebM, or MOV, up to 100 MB. Uploads request an MP4/H.264/AAC conversion for broad browser compatibility. Keep individual lessons below that limit and within your Cloudinary account's limits.
5. Save the lesson. The server retrieves its authenticated Cloudinary resource to verify the asset and determine duration; it does not trust a client-supplied video URL or duration.

Thumbnails use public image delivery. Videos are uploaded with **`type: authenticated`**, including preview videos. For playback, the server checks course publication, preview status, the current account, and enrollment before generating an expiring authenticated download URL with inline disposition. The browser's native video player handles responsive playback and seeking supported by Cloudinary's delivery endpoint. Playback links expire after one hour; the retry button obtains a fresh link after expiration.

Video URLs/public IDs are excluded from normal lesson projections. Protected video URLs never appear in the public course API. Authenticated playback links are bearer links valid for their short lifetime, not DRM. Do not upload paid course videos with public delivery. The application retains Cloudinary assets when content is removed, avoiding broken references; unused assets can be cleaned up in Cloudinary after reviewing references.

## Stripe setup

1. Use Stripe test mode and set `STRIPE_SECRET_KEY`.
2. Run the app and forward webhook events with the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook
```

3. Copy the listener's `whsec_…` value to `STRIPE_WEBHOOK_SECRET`, then restart Next.js.
4. Sign in as a student, open a paid sample course, and click **Buy Course**.
5. Complete Checkout with Stripe's test card `4242 4242 4242 4242`, a future expiry, and any valid CVC/postal code.
6. Check that the payment is `paid` in `/admin/payments`, the enrollment appears in `/admin/enrollments`, and the student can open the course.

For deployment, register `https://your-domain/api/payments/webhook` in Stripe and subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Use that endpoint's signing secret in production; the CLI secret is separate.

### Fulfillment flow

```text
Student → authenticated checkout API → database price validation
        → pending payment reservation → Stripe Checkout
Stripe  → signature-verified webhook → validate payment snapshot
        → paid payment record → unique enrollment
Student → success page polls enrollment → Continue Learning
```

The success URL **never grants access**. Fulfillment requires a verified event with `payment_status: paid`, matching user/course/payment metadata, session ID, amount, and currency. Duplicate webhook deliveries repair/reuse existing records. Repeated Buy clicks reuse an open session; the pending-payment unique index and Stripe idempotency key reduce duplicate checkouts. Expired sessions can be replaced. Prices are USD and stored as dollar amounts on courses; payment records store integer cents. Paid courses must be at least $0.50.

To test fulfillment, purchase an actual course through the app. A generic `stripe trigger checkout.session.completed` fixture lacks this app's payment reference and is correctly rejected. Replay a real checkout event from Stripe to test idempotency. Refund/dispute handling is outside this project's payment scope; revenue is explicitly displayed as gross before fees/refunds.

## Seed data

```bash
npm run seed:assets
npm run seed
```

The media downloader saves four Unsplash photographs and one short CC0 sample MP4 in `seed-assets/`. These files are included locally and uploaded **from disk** by the seed. Attribution and source URLs are in [`seed-assets/README.md`](seed-assets/README.md).

The seed creates:

- One admin, using environment-supplied credentials.
- Three categories.
- Four sample courses, including one free course.
- Three ordered lessons per course, with one free preview each.

The seed is additive and repeatable. It preserves existing content and does not reset an existing admin password. It refuses to promote an existing student with the same email. The sample videos are explicitly labeled **playback demonstrations**, not real instructional material. Paid sample courses are for Stripe test mode. Replace sample content before a real launch.

## Administration

1. Create categories at `/admin/categories`.
2. Create a draft at `/admin/courses/new`.
3. Upload a thumbnail and save course information.
4. Add lessons with uploaded videos; use up/down controls to reorder them.
5. Enable previews as appropriate.
6. Publish the course. A thumbnail and at least one lesson are required.

Deleting a course archives it: it disappears from discovery/admin course lists while existing students retain access and accounting records remain intact. Deleting lessons recalculates progress and unpublishes a course if its last lesson is removed. Categories referenced by any course cannot be deleted until courses are reassigned. Admins can suspend/reactivate students; suspension takes effect on the next protected request, including existing JWT sessions. Admin accounts and roles cannot be changed through the user management API.

## Project structure

```text
src/
  app/
    (auth)/                    Login and registration
    courses/                   Public discovery and details
    dashboard/                 Student learning and progress
    learn/[courseId]/           Lesson player and navigation
    admin/                     Protected management workspace
    checkout/success/          Enrollment confirmation polling
    api/                       Next.js Route Handlers; no Express server
  components/
    admin/                     Course, category, lesson and upload editors
    ...                        Shared layout, forms, cards, player and UI
  lib/
    auth.ts                    NextAuth and database-backed access guards
    db.ts                      Hot-reload-safe MongoDB connection
    validations.ts             Shared Zod request/form schemas
    courses.ts                 Publication and atomic progress logic
    cloudinary.ts              Server-only media validation/delivery
    stripe.ts                  Lazy server-only Stripe client
    fulfillment.ts             Retry-safe webhook fulfillment
    http.ts                    API errors, responses and origin checks
    rate-limit.ts              Database-backed login/upload/checkout limits
  models/index.ts              Mongoose models and indexes
  types/                       Shared data shapes and session augmentation
scripts/                       Local media download and database seed
seed-assets/                   Downloaded, attributed seed images/video
tests/                         Domain and isolated integration/browser tests
```

## API overview

| Route                        | Methods            | Access                                      |
| ---------------------------- | ------------------ | ------------------------------------------- |
| `/api/auth/register`         | POST               | Public, student role only                   |
| `/api/auth/[...nextauth]`    | GET, POST          | NextAuth session/login/logout/CSRF          |
| `/api/courses`               | GET, POST          | Public catalog; admin create/list drafts    |
| `/api/courses/[id]`          | GET, PATCH, DELETE | Published/owned visibility; admin mutations |
| `/api/categories`            | GET, POST          | Public list; admin create                   |
| `/api/categories/[id]`       | PATCH, DELETE      | Admin                                       |
| `/api/courses/[id]/lessons`  | POST               | Admin                                       |
| `/api/courses/[id]/reorder`  | PUT                | Admin; exact lesson-set validation          |
| `/api/lessons/[id]`          | PATCH, DELETE      | Admin                                       |
| `/api/lessons/[id]/playback` | GET                | Preview, enrollment, or admin               |
| `/api/uploads/sign`          | POST               | Admin                                       |
| `/api/enrollments`           | GET, POST          | Current student; POST only for free courses |
| `/api/progress`              | PATCH              | Enrolled student                            |
| `/api/payments/checkout`     | POST               | Authenticated student                       |
| `/api/payments/webhook`      | POST               | Stripe signature required                   |
| `/api/admin/stats`           | GET                | Admin                                       |
| `/api/admin/users`           | GET                | Admin                                       |
| `/api/admin/users/[id]`      | PATCH              | Admin; student activation only              |
| `/api/admin/enrollments`     | GET                | Admin                                       |
| `/api/admin/payments`        | GET                | Admin                                       |

Mutations validate strict Zod schemas and reject extra fields. Database errors are sanitized. Same-origin checks protect application mutations; NextAuth supplies its own authentication CSRF flow. Passwords are excluded from default queries. Public search escapes regular expressions. API responses use `Cache-Control: no-store`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:integration
```

`test:integration` requires a local `mongod` executable and Chrome. It uses installed Google Chrome on Linux when available; otherwise install Playwright's browser:

```bash
npx playwright install chromium
```

The integration suite creates an isolated temporary database, starts its own MongoDB on port `27189` and production Next.js on port `32189`, and cleans up after itself. Run `npm run build` first. It never reads application secrets from `.env.local` or touches your application database.

Coverage includes:

- Registration, bcrypt hashing, login, and role-escalation rejection.
- API/page authorization, origin checks, and draft/media privacy.
- Course/category CRUD, publication checks, ordering, and deletion behavior.
- Duplicate free enrollment and simultaneous progress updates.
- Stripe signature rejection, amount validation, unpaid events, replay-safe fulfillment, and success-URL isolation.
- Existing-session suspension and protection of admin accounts.
- Browser registration, enrollment, completion, admin category creation, desktop screenshots, and mobile overflow checks.
- Real MP4 decoding/playback using the downloaded seed video in a browser-only fixture; the test never bypasses access control in production code.

External Stripe Checkout and Cloudinary upload/streaming require your own credentials and must additionally be exercised with the live test-mode setup above. The automated suite verifies webhook signatures locally with Stripe's official signing helper; it does not charge a card or substitute fake production services. Screenshots are written to ignored `test-results/`.

### Configured-service verification

After filling `.env.local`, seeding, and building, these commands verify the real configured services:

```bash
npm run check:services
npm run test:services
```

`test:services` requires the official Stripe CLI and Chrome. It connects to the configured Atlas database and Cloudinary account, uploads temporary media, creates a temporary student/course, and exercises Stripe Checkout with the standard **test card**. It refuses live Stripe keys. It starts the app on port `32190`, connects a real Stripe CLI webhook listener, and verifies that payment creates enrollment. If necessary, it updates only `.env.local`'s webhook signing secret to match the local CLI listener. Temporary database records and uploaded media are removed afterward; Stripe test-mode transaction history remains in Stripe. Results and screenshots are saved under ignored `test-results/`.

For normal local development, keep these running in separate terminals:

```bash
npm run dev
npm run stripe:listen
```

`stripe:listen` reads the existing key from `.env.local`, forwards test events to your configured application origin, and hides signing secrets in console output. Restart the app after changing environment values. A publicly deployed application still needs its own registered Stripe webhook endpoint and endpoint-specific signing secret.

## Production

```bash
npm run build
npm start
```

Deploy on a Node-compatible Next.js host. Set the production environment variables, enable HTTPS, configure MongoDB connectivity, and register the production Stripe webhook. Use the Node runtime for API routes. Media uploads go directly to Cloudinary, avoiding serverless request body limits.

For a public deployment, apply reverse-proxy/hosting rate limits to registration and login as well as the built-in per-account/database limits. Never commit `.env.local`, reuse seed credentials, or disable webhook verification.

## References

- [Next.js App Router](https://nextjs.org/docs/app)
- [NextAuth credentials provider](https://next-auth.js.org/configuration/providers/credentials)
- [Cloudinary media access control](https://cloudinary.com/documentation/control_access_to_media)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
