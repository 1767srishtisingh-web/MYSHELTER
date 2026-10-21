# MYSHELTER — Comprehensive Vercel Deployment & DevOps Guide

> **Project:** MYSHELTER (Hotel Booking Platform — Delhi, Noida & Ghaziabad)  
> **Target Platform:** Vercel (Static Frontend + Serverless Functions)  
> **Database:** Supabase (PostgreSQL)  
> **Target Node.js Version:** Node.js `>=22`  

---

## 1. Prerequisites

Before deploying MYSHELTER to Vercel, ensure you have:
1. A **GitHub account** with access to push and manage your repository.
2. A **Vercel account** ([vercel.com](https://vercel.com)) connected to your GitHub account.
3. A **Supabase account** ([supabase.com](https://supabase.com)) to host the PostgreSQL database.
4. **Node.js 22+** and **npm** installed on your local development machine.
5. A terminal (Windows Command Prompt `cmd.exe` or PowerShell).

---

## 2. Local Setup & Testing on Windows CMD

Execute the following commands in order from the repository root:

### 2.1 Install Dependencies
```cmd
npm install
```
*Installs `@supabase/supabase-js` (used by serverless API handlers) and `@playwright/test`.*

### 2.2 Run Build Validation
```cmd
npm run build
```
*Validates all 141 hotel rooms in `js/data.js`, checks local file links in HTML files, and outputs the production bundle to `dist/`.*

### 2.3 Run Local Development Server
```cmd
npm run dev
```
*Starts the zero-dependency local development server at `http://127.0.0.1:5173`. Serves static files and routes all `/api/*` endpoints to serverless function files.*

### 2.4 Preview Production Build
```cmd
npm run preview
```
*Serves the compiled production package directly from the `dist/` directory.*

### 2.5 Run Unit Tests
```cmd
npm test
```
*Executes the Node.js test runner for unit tests.*

---

## 3. Supabase Database Configuration

MYSHELTER uses Supabase PostgreSQL for persistent user accounts, hotel bookings, search preferences, and email OTP verification codes.

### Step-by-Step Supabase Setup:
1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. Set your Project Name (e.g. `myshelter-prod`), set a secure database password, and select your preferred region (e.g. `ap-south-1` for India / South Asia).
3. Wait ~2 minutes for the database to provision.
4. Open the **SQL Editor** from the left navigation bar.
5. Click **New query**, copy the complete contents of `supabase/schema.sql`, paste it into the editor, and click **Run**.
6. Verify that the following 4 tables are created:
   - `public.users`: User accounts, salted password hashes, and email verification status.
   - `public.bookings`: Hotel room reservations linked to users.
   - `public.preferences`: Filter and search preferences.
   - `public.otp_codes`: One-time password verification codes.
7. Retrieve your API credentials from **Project Settings** → **API**:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **service_role (secret)** key (bypasses Row Level Security for backend serverless functions).
   - **anon (public)** key.

> **Note on Local/Offline Fallback:** If Supabase credentials are not configured, the backend includes an automatic in-memory fallback store in `api/lib/supabase.js` so that local development and testing never crash or block feature testing.

---

## 4. Connecting GitHub to Vercel

1. Push your repository to GitHub:
   ```cmd
   git add .
   git commit -m "feat: prepare project for Vercel deployment"
   git push origin main
   ```
2. Log in to the [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **Add New…** → **Project**.
4. Under **Import Git Repository**, search for your `MYSHELTER` repository and click **Import**.

---

## 5. Vercel Project Settings & Build Configuration

Configure the project deployment settings in the Vercel import dialog with the following exact values:

| Configuration Setting | Exact Required Value | Notes |
|---|---|---|
| **Project Name** | `myshelter` (or your choice) | Custom project name on Vercel |
| **Framework Preset** | `Other` | Pure vanilla static frontend + serverless functions |
| **Root Directory** | `./` (leave default repository root) | The root directory containing `package.json` |
| **Build Command** | `npm run build` | Overrides default; runs `scripts/build.js` |
| **Output Directory** | `dist` | The folder produced by `npm run build` |
| **Install Command** | `npm install` | Default package installation |
| **Node.js Version** | `22.x` | Set in **Settings** → **General** → **Node.js Version** |

### Why `vercel.json` is Sufficient
The repository contains a custom `vercel.json` configuration file at the root. Vercel automatically respects its directives:
- Output directory: `dist`
- Route rewrites:
  - `/admin` rewrites to `/admin.html`
  - `/auth` rewrites to `/auth.html`
- Serverless API discovery: Vercel automatically detects all `.js` files in `api/` as Serverless Functions (`/api/auth/*`, `/api/bookings`, `/api/preferences`, `/api/admin/*`).
- Security Headers: Configured with Content Security Policy (`CSP`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and asset caching.

---

## 6. Environment Variables Checklist

Configure these variables in Vercel under **Project Settings** → **Environment Variables**:

| Variable Name | Required? | Environments | Target Layer | Where to Obtain Value | Description |
|---|---|---|---|---|---|
| `SUPABASE_URL` | **Required** | Production, Preview, Development | Backend Serverless | Supabase Dashboard → Project Settings → API → Project URL | The HTTPS REST endpoint for your Supabase database instance. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | Production, Preview, Development | Backend Serverless (SECRET) | Supabase Dashboard → Project Settings → API → Project API Keys → `service_role` (secret) | Privileged server-side key that allows serverless functions to read/write tables. **NEVER expose this key in client-side code.** |
| `SUPABASE_ANON_KEY` | **Optional** | Production, Preview, Development | Backend Serverless | Supabase Dashboard → Project Settings → API → Project API Keys → `anon` (public) | Public client anonymous key. Used as a secondary fallback. |
| `ADMIN_PASSWORD` | **Required** | Production, Preview, Development | Backend Serverless (SECRET) | Set custom string (Default: `admin2026`) | Secret password required to unlock the Admin Portal at `/admin`. |
| `JWT_SECRET` | **Required** | Production, Preview, Development | Backend Serverless (SECRET) | Generate random 32+ char string | Secret key used to sign and verify HMAC-SHA256 session tokens. |
| `OTP_TTL_MINUTES` | Optional | Production, Preview, Development | Backend Serverless | Numeric value (e.g. `10`) | Lifespan in minutes for email verification OTP codes (defaults to 10). |

---

## 7. Deploying Preview and Production

1. **Production Deployment:**
   - When you push commits to your `main` branch on GitHub, Vercel automatically triggers a Production Build.
   - You can also deploy manually via Vercel CLI:
     ```cmd
     npx vercel --prod
     ```
2. **Preview Deployments:**
   - Any pull request or branch push creates an isolated Preview Deployment with its own unique URL.
   - Ideal for QA testing without impacting the production site.

---

## 8. Custom Domain Configuration (Optional)

1. In the Vercel Dashboard, navigate to **Project Settings** → **Domains**.
2. Enter your domain name (e.g. `myshelter.in` or `rooms.yourdomain.com`).
3. Add the required DNS records provided by Vercel at your domain registrar:
   - For Apex domain (`myshelter.in`): `A` record pointing to `76.76.21.21`
   - For Subdomain (`www` or `rooms`): `CNAME` record pointing to `cname.vercel-dns.com`
4. Vercel automatically provisions and renews a free Let's Encrypt SSL/TLS certificate.

---

## 9. Verification & Smoke Testing Checklist

After deployment succeeds, verify every feature on the live URL:

- [ ] **Home Page (`/`):** 141 hotel rooms load with representative Unsplash photos, tariffs, and star badges.
- [ ] **Search & Filters:** Area chips filter rooms; city and room type segmented buttons work; custom sort dropdown opens and re-orders listings.
- [ ] **Photo Carousel:** Previous/next arrows and indicator dots transition photos smoothly.
- [ ] **Checkout Flow (`/checkout.html`):** Selecting a room carries details into checkout; tariff and GST display; coupon code input accepts `WELCOME500`.
- [ ] **Payment Step:** Proceed to payment step displays radio payment methods (UPI, Card, Pay at Hotel) and demo disclaimer.
- [ ] **Success Modal:** Completing demo booking displays reference ID and animated SVG checkmark.
- [ ] **Authentication (`/auth` or `/auth.html`):** User registration creates account, opens OTP verification modal, and stores JWT session token.
- [ ] **Email OTP Verification:** Entering 6-digit OTP updates verified state in database.
- [ ] **My Bookings (`/bookings.html`):** Displays active bookings fetched from database; cancel button releases reservation with confirmation modal.
- [ ] **Admin Portal (`/admin` or `/admin.html`):** Login gate unlocks with `ADMIN_PASSWORD`; displays KPI counts for registered users, bookings, and preferences; Export to CSV buttons download datasets.
- [ ] **404 Route (`/unknown-page`):** Custom styled 404 page with "Back to Rooms" button.

---

## 10. Troubleshooting Common Issues

### Issue 1: Serverless Functions return 500 or 503
- **Cause:** Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables.
- **Fix:** Navigate to Vercel Project Settings → Environment Variables, verify both keys, and click **Redeploy** with "Clear Build Cache".

### Issue 2: Admin login fails with 401
- **Cause:** Entered password does not match `ADMIN_PASSWORD`.
- **Fix:** Ensure `ADMIN_PASSWORD` in Vercel matches your input (default: `admin2026`).

### Issue 3: Content Security Policy (CSP) blocking external assets
- **Cause:** Strict CSP headers in `vercel.json`.
- **Verified Status:** `vercel.json` already whitelists `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, `https://images.unsplash.com`, and `connect-src 'self'`. All external assets load cleanly.

### Issue 4: Redeploying after configuration updates
- When updating environment variables in Vercel, existing deployments do not automatically refresh. Go to **Deployments** → click the three dots on the latest deployment → **Redeploy** (check "Use existing Build Cache" off).

