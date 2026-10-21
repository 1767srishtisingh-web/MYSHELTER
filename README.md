# MYSHELTER — Hotel Booking Platform (Full-Stack Edition)

A hotel booking website for **Delhi, Noida, and Ghaziabad** with a warm earthy aesthetic (Haven-style), powered by **Vercel Serverless Functions** and **Supabase (PostgreSQL)** backend, with vanilla HTML, CSS, and JavaScript on the frontend.

---

## 🌟 Key Features

1. **Frontend**: Plain HTML, CSS, and JavaScript. No React or external UI frameworks.
2. **Backend**: Vercel Serverless Functions (`/api/*`) for authentication, bookings, search preferences, OTP verification, and admin data.
3. **Database**: Supabase PostgreSQL database storing users, bookings, user search preferences, and OTP verification codes.
4. **User Registration & Authentication**:
   - Register and Sign In page (`auth.html`).
   - Secure password hashing using Node.js `crypto.scrypt` with cryptographic salts (never plain text).
   - Session persistence via signed JWT tokens; users stay logged in across page refreshes.
   - Dynamic navigation header reflecting user authentication status.
   - Email verification via 6-digit OTP code flow (`send-otp` and `verify-otp`).
5. **Bookings & Preferences**:
   - Bookings are saved directly to the Supabase database linked to the signed-in user.
   - User search preferences (preferred city, room type, budget, amenities, sort) are saved to database on search/filter.
   - "My Bookings" page loads user bookings directly from Supabase, with cloud cancellation support.
6. **Password-Protected Admin Portal (`/admin`)**:
   - Protected with `ADMIN_PASSWORD`.
   - Real-time KPI metrics (Registered Users, Total Bookings, Saved Preferences).
   - Live search filter across all records.
   - **Export to CSV** for users, bookings, and preferences.
   - All data is simultaneously visible in the Supabase Dashboard.
7. **Redesigned Sort Dropdown**:
   - Custom-styled dropdown matching the warm earthy Haven theme.
   - Smooth opening/closing animation, hover states, check mark indicator on active selection.
   - Full keyboard accessibility (Enter, Space, Arrow keys, Escape) and touch-friendly mobile support.
8. **14 Seeded Bugs Preserved**:
   - Maintained intentionally for the bug-hunt event version.

---

## 🚀 Step-by-Step Setup Instructions

### 1. Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, choose a project name (e.g. `myshelter-db`) and a secure database password, and select your preferred region.
3. Once the project is provisioned, go to **SQL Editor** from the left sidebar.
4. Click **New query**, paste the entire contents of `supabase/schema.sql`, and click **Run**.
5. The following tables will be created:
   - `users`: Stores user names, emails, phones, email verification status, and salted password hashes.
   - `bookings`: Stores all hotel room reservations linked to users.
   - `preferences`: Stores user search filters and preferences.
   - `otp_codes`: Stores one-time verification codes and expiry timestamps.
6. Retrieve your API keys from **Project Settings** -> **API**:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **service_role (secret)** key (under Project API keys)
   - **anon (public)** key

---

### 2. Vercel Environment Variables Setup

1. Open your project on [vercel.com](https://vercel.com).
2. Go to **Settings** -> **Environment Variables**.
3. Add the following variables:

| Variable Name | Value | Purpose |
|---|---|---|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Secret service role key (bypasses RLS for server functions) |
| `SUPABASE_ANON_KEY` | `eyJh...` | Public anon key |
| `ADMIN_PASSWORD` | `admin2026` | Password to unlock `/admin` portal |
| `JWT_SECRET` | `your-secret-key-32chars` | Random secret key to sign session tokens |
| `OTP_TTL_MINUTES` | `10` | Expiration window in minutes for email OTP verification |

4. Click **Save** and trigger a redeployment (or push a commit to GitHub to deploy automatically).

---

### 3. Accessing the Admin Page

1. Navigate to `https://<your-vercel-domain>/admin` (or `/admin.html`).
2. When prompted, enter the `ADMIN_PASSWORD` configured in Vercel (default: `admin2026`).
3. Click **Unlock Dashboard**.
4. You can now view all registered users, bookings, and room preferences, search across all fields, and click **Export to CSV** for any table.

---

## 🛠️ Project Structure

```
MYSHELTER/
├── index.html            Explore hotel rooms with custom sort dropdown
├── checkout.html         Checkout & booking confirmation page
├── bookings.html         My Bookings page (synced with Supabase)
├── auth.html             User Sign In / Registration page
├── admin.html            Password-protected Admin Portal
├── 404.html              Custom 404 page
├── css/
│   └── styles.css        Haven-inspired design system & component styles
├── js/
│   ├── auth.js           Session manager & header auth state
│   ├── auth-page.js      Auth page submission & validation controller
│   ├── admin-page.js     Admin portal controller & CSV export
│   ├── data.js           141 hotel rooms across Delhi, Noida & Ghaziabad
│   ├── core.js           Filter, sort, bill calculations, and validations
│   ├── store.js          Client-side persistence layer
│   ├── ui.js             Icons, toasts, and fallback image handling
│   ├── home.js           Rooms page controller & search preference tracking
│   ├── checkout.js       Checkout controller syncing with backend
│   └── bookings.js       Bookings controller loading from Supabase
├── api/                  Vercel Serverless Functions
│   ├── lib/
│   │   ├── supabase.js   Supabase client with service role key
│   │   ├── auth.js       Scrypt password hashing & JWT signing
│   │   ├── validate.js   Shared input validators (email, phone, name, nights, ids)
│   │   ├── otp.js        OTP generation, storage, send, and verify helpers
│   │   └── respond.js    Standardized json() and error() response helpers
│   ├── auth/
│   │   ├── register.js   POST /api/auth/register
│   │   ├── login.js      POST /api/auth/login
│   │   ├── me.js         GET /api/auth/me
│   │   ├── send-otp.js   POST /api/auth/send-otp
│   │   └── verify-otp.js POST /api/auth/verify-otp
│   ├── bookings/
│   │   └── cancel.js     POST /api/bookings/cancel
│   ├── bookings.js       GET / POST /api/bookings
│   ├── preferences.js    GET / POST /api/preferences
│   └── admin/
│       ├── login.js      POST /api/admin/login
│       └── data.js       GET /api/admin/data
├── supabase/
│   └── schema.sql        PostgreSQL migration script
├── scripts/
│   ├── serve.js          Local dev server supporting static files & /api routes
│   └── build.js          Build script validating listings and writing dist/
├── vercel.json           Vercel configuration, security headers & rewrites
├── .env.example          Environment variables template
└── package.json          Project dependencies (@supabase/supabase-js)
```

---

## 🐞 Seeded Bugs (Event Edition)

This is the bug-hunt version. The following 14 seeded bugs are intentionally preserved:

1. **Refresh clears selected room**: Room selection in URL is stripped on load.
2. **Room type filter mismatch**: `||` used instead of `&&` in room type filter condition.
3. **Index offset on booking**: Book button targets `position + 1` instead of room id.
4. **String tax concatenation**: Tariff and taxes concatenate due to string tax formatting.
5. **Reverse price sort**: Price Low→High sorts backwards.
6. **Inverted free cancellation filter**: Filter condition inverts cancellation logic.
7. **Coupon stacking**: Coupon applies repeatedly on each click.
8. **Past check-in date allowed**: Date picker lacks minimum date constraint.
9. **Missing required validation**: Submit allows empty fields without client error.
10. **Shared carousel slider**: Arrow navigation moves all card carousels simultaneously.
11. **Unchecked login credentials**: Authentication succeeds without validating password or email existence.
12. **Server-side past booking allowed**: Booking API accepts past check-in dates without validation.
13. **Unvalidated API payloads**: Backend endpoints bypass validator checks and persist invalid inputs.
14. **Deterministic OTP generation**: Email verification code generator returns the identical code for all requests.
