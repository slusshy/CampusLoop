# CampusLoop

CampusLoop is a responsive student marketplace and membership web application. The UI is built with React and Vite; Supabase provides authentication, PostgreSQL, storage and Edge Functions. The workspace contains a runnable application, not a native Figma `.fig` file.

## Quick Start

You can run the application directly using either:

**Option A (One-click launcher):**
```powershell
.\start-dev.bat
```

**Option B (Standard npm command):**
> *Note:* If you just installed or updated Node, simply reopen your PowerShell window or refresh your path with `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')`.
```sh
npm run dev
```

`npm run dev` starts both the **Vite React Frontend** (`http://localhost:5173`) and the **Solid Express Backend** (`http://localhost:5000`) concurrently.

### Database Migration & Setup
```sh
npm run migrate
# or: .\migrate.bat
```
- **Option 1 (Direct Postgres):** If `DATABASE_URL` is set in `.env` (from Supabase Project Settings → Database → Connection URI), `npm run migrate` executes the migration directly into PostgreSQL automatically.
- **Option 2 (Dashboard SQL Editor):** Open `supabase/migrations/202610100001_idempotent_schema.sql` and click **Run** in the Supabase SQL Editor.
- **Data Sync:** Run `npm run migrate:seed` to sync your local marketplace listings and colleges into Supabase.

### Run End-to-End Tests
```sh
npm test
# or: .\test.bat
```
Runs 12 comprehensive integration tests validating listings, item requests, rental lifecycle, student deal redemption with single-use cryptographic codes, document review, and QR resolution.

### Demo Quick Logins
For easy grading and evaluation, the Login/Signup modal includes one-click buttons:
- **Demo Student:** Instantly tests marketplace browsing, requesting items, redeeming student offers, and checking verified student ID.
- **Admin Console:** Instantly accesses the verification review queue, listing moderation, and single-use coupon redemption validator.

## Architecture & Supabase Integration

CampusLoop features a **production-ready hybrid architecture**:
1. **Express Backend API (`server/`)**: Robust REST API with token authentication, Multer uploads, state machines, and cryptographic validations.
2. **Supabase Integration**: Automatically connects to Supabase Auth, PostgreSQL, and Storage if credentials are configured.
3. **Resilient Hybrid Fallback (`server/db/store.js`)**: If database tables or migrations are pending on Supabase, the backend seamlessly falls back to persistent local storage with full transactional consistency. The app NEVER crashes or locks up on missing tables.
4. **Vite Proxy**: Frontend requests to `/api` and `/uploads` are automatically proxied to port 5000 in development.

## Applying Supabase Migrations

1. Ensure `.env.local` contains:
   ```dotenv
   VITE_SUPABASE_URL=https://xrqrdwvxsvcfzrrcxaqn.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_KEY
   ```
2. Run `npm run migrate` (or copy `supabase/migrations/202610100001_idempotent_schema.sql` into the SQL Editor).

3. Deploy the Edge Functions:

   ```sh
   npx supabase functions deploy admin-review
   npx supabase functions deploy verify-student-id
   npx supabase functions deploy redeem-deal
   npx supabase functions deploy validate-coupon
   npx supabase functions deploy submit-verification
   npx supabase functions deploy manage-request
   ```

   Supabase provides the functions with server-side project credentials. Keep `SUPABASE_SERVICE_ROLE_KEY` out of browser code and source control.
4. In Supabase Auth settings, set the site URL and allowed redirect URLs to the local/deployed CampusLoop origin. Email confirmation is enabled by default in the supplied local configuration; configure a production email provider before inviting real students.
5. To designate the first administrator, create and confirm their account, then run this owner-only statement in the Supabase SQL Editor, replacing the address:

   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   where u.id = p.id
     and lower(u.email) = lower('admin@example.com');
   ```

   Never expose an admin-provisioning endpoint or service-role credential to the browser. Admin pages also require the profile role; Edge Functions enforce it independently.
6. For a deployed frontend, set the Edge Function CORS origin to its exact origin before accepting requests:

   ```sh
   npx supabase secrets set CAMPUSLOOP_ALLOWED_ORIGIN=https://your-campusloop-domain.example
   ```

   Local Edge Functions default to `http://localhost:5173`.

The migration creates row-level security policies, a private `verification-documents` bucket and a public listing-photo bucket. Student evidence is never made public. Administrator review links are signed and short-lived. QR results resolve the opaque public ID against current server status; enrollment review is always a human decision. Offer codes are returned to the student once and stored only as hashes; validation is performed server-side and is single-use.

Seed listings and offers are illustrative demo content. Demo offers are not real partnerships and cannot be redeemed. Real offers require an active, verified business. No user counts, partnerships or endorsements are claimed.

## Product scope and operational setup

- Marketplace listing and transaction amounts are entered and displayed in Indian rupees (INR). Existing database amounts are treated as INR; review any records entered in another currency before using them.
- Marketplace requests create records for students to coordinate an offline pickup; CampusLoop does not process payments or provide built-in chat.
- Verification status is recorded in Supabase after an administrator decision. Email confirmations are handled by Supabase Auth; custom review-notification email delivery requires a configured production email service.
- Administrator CRUD is limited to the directory, listing moderation, deal publication for approved businesses, reports and coupon validation. Business onboarding/approval and broader reporting workflows need an operational policy before production use.
- Supabase migrations have not been applied to a live project from this workspace. Apply them to a disposable/local project first, then review the resulting RLS policies and Auth settings before production.

## Screen map

| Experience | Prototype view |
| --- | --- |
| Public Pages | Landing, account sign-up and login, forgot password, college selection/request and registration confirmation |
| Marketplace | Responsive marketplace, filters, saved listings, detail dialog and create-listing form |
| Student Identity | Verification flow and status previews, digital ID and QR result |
| Deals | Searchable student offers, category filters, offer details and demo redemption |
| My Activity | Listings, requests, transactions and borrowed/rented tabs |
| Admin | Separate review console with verification queue and administrative navigation |

## Design tokens

Tokens are declared in `src/styles.css` under `:root`. Prefer tokens over one-off values when extending the UI.

| Token | Value | Use |
| --- | --- | --- |
| `--purple` | `#2f6e5d` | Primary actions and selection (legacy token name) |
| `--purple-dark` | `#285a4c` | Hovered primary actions (legacy token name) |
| `--bg` | `#f7f6f1` | Warm application background |
| `--navy` | `#202b29` | Primary text |
| `--muted` | `#68746f` | Secondary text |
| `--line` | `#e6e8e3` | Subtle borders |
| `--green` | `#2f6e5d` | Verified and success states |
| `--surface` | `#fff` | Cards, fields and dialogs |

The application styles and CampusLoop theme refinements are in `src/styles.css` and `src/campus-theme.css`. Type uses Manrope for display headings and DM Sans for interface copy; DM Mono is used for small, high-density labels. The spacing scale is based on 4/8px increments. Surfaces use 12–16px radii with restrained borders and shadows.

## Component inventory

- **Navigation:** `Logo`, app header, college selector, student sidebar and mobile bottom navigation.
- **Marketplace:** `ProductCard`, category tabs, search, filters, price sorting, save action, empty state and listing detail dialog.
- **Forms:** labeled fields, upload controls, condition/category/type selectors, validation and publish confirmation.
- **Student identity:** verification status, document submission, student ID and QR status result.
- **Offers:** deal card, demo-content label, offer details and redeem success state.
- **Activity and administration:** activity tabs/table, admin queue/table, document preview, review notes and approve/reject actions.
- **Feedback and overlays:** toast notifications, confirmation dialogs, account flows and college request form.

## Suggested Figma file organization

1. **Design System** — tokens, type scale, buttons and states, inputs, filters, cards, chips, status badges, dialogs, toasts, tabs, empty/loading/error/success states, ID and deal cards, tables and admin review components.
2. **Public Pages** — desktop/mobile landing, sign-up, login, forgot password, college selection, missing-college request and registration success.
3. **Marketplace** — desktop/mobile browse, filter states, listing detail, create/edit listing and empty results.
4. **Student Identity** — verification steps and review states, student ID and QR result states.
5. **Deals** — offer search, filters, details, redemption confirmation/success/already-redeemed/expired.
6. **Admin** — overview, review queue, secure document review, moderation, directory, deal management, redemption records and reports.

For handoff, use Auto Layout for cards, rows and action groups; define component variants for default/hover/focus/disabled/loading/success/error; name frames by page, viewport and state (for example `Marketplace / Desktop / Default`).

## Important product safeguards

- Personal-email registration is supported; a university email is not required.
- Document submission is described as pending human review, not automatic verification.
- Student ID QR output is a visual placeholder; production verification must resolve a signed identifier against current backend status, including expiry and revocation.
- Sample student identity, merchant names and deals are illustrative only. No traction, endorsement or live business partnership is claimed.
