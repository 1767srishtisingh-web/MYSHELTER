# MYSHELTER

A student room, PG and hostel finder with a **Liquid Glass** interface. Users can search by city or area, filter by room type, gender and amenities, sort by rent, browse each listing's photos, and book through a validated checkout. Bookings are kept on a **My Bookings** page.

The project follows the brief: **plain HTML, CSS and JavaScript**, with no backend, no database and no API keys. Room data lives in `js/data.js`, and the browser's `localStorage` holds the user's selection and bookings.

## Features

| Area | What works |
|---|---|
| Explore | 18 listings across 8 cities, each with photos, room type, rent, deposit, locality, rating and amenities |
| Search | Live search over city, locality, title and type (multi-word, case-insensitive), plus city quick-chips |
| Filters | Room type (1 BHK / 2 BHK / Single / Shared), Stay for (Anyone / Girls only / Boys only), amenities (Wi-Fi, AC, Food Included). All filters combine with AND |
| Sorting | Recommended, Rent: Low→High, Rent: High→Low, Top rated |
| Shareable state | Filters are stored in the URL, so a refresh, the back button or a shared link restores the view |
| Photo carousel | Independent per card, with arrows, dots, keyboard (←/→) and swipe |
| Checkout | Rent + Security Deposit − Discount, one-time `WELCOME500` coupon (removable), validated name / mobile / check-in date. The draft survives a refresh |
| Bookings | Saved to `localStorage`, listed on My Bookings, cancellable with a confirmation dialog. A header badge shows the active count and syncs across tabs |
| States | Shimmer while photos load, local placeholder for broken photos, empty results with reset, "no room selected", "room not found", inline field errors, toasts, success dialog, warning when browser storage is blocked, 404 page |
| Accessibility | Semantic landmarks, skip link, labelled controls, `aria-pressed` and `aria-current`, `aria-live` counts and errors, visible focus rings, native `<dialog>`, respects `prefers-reduced-motion` |
| Security | Strict Content-Security-Policy (no inline scripts or styles), HTML-escaped rendering, validated stored data, no secrets |

## Bugs from the report: all 10 fixed

| # | Bug | Root cause → fix | Where |
|---|---|---|---|
| 1 | Refresh clears booking | Room was kept in a temporary variable → now saved with `localStorage.setItem()` **and** carried in the URL (`?room=id`) | `home.js`, `checkout.js`, `store.js` |
| 2 | 1 BHK filter shows 2 BHK | `||` used where all conditions must hold → every condition is combined with `&&` | `core.js › filterRooms` |
| 3 | 1 BHK turns into 2 BHK at checkout | Button passed `index + 1` → the button carries the room's stable **id**, looked up with `findRoom` | `home.js`, `core.js` |
| 4 | ₹10,000 + ₹5,000 = ₹100005000 | String concatenation → `toNumber()` on every value before adding; data stores numbers | `core.js › calculateBill` |
| 5 | Low→High sorts backwards | `b - a` → `a.rent - b.rent` (and the sort no longer mutates the source) | `core.js › sortRooms` |
| 6 | Girls Only shows boys hostels | Stray `!` → `room.gender === 'Girls'` | `core.js › filterRooms` |
| 7 | Coupon stacks on every click | No applied-state check → `applyCoupon` refuses a second coupon, and the Apply button is disabled and hidden once one is applied | `core.js`, `checkout.js` |
| 8 | Past check-in dates allowed | No `min` → `min` is set to **local** today (not UTC, which is yesterday in IST before 05:30), plus a submit-time check and a 180-day `max` | `checkout.js`, `core.js` |
| 9 | Empty name/phone books anyway | No validation → `required` plus JS checks for trimmed name and a 10-digit Indian mobile number (6–9 start; `+91`, spaces and dashes accepted) | `core.js › validateBooking` |
| 10 | One arrow moves every carousel | One shared global index → a `Map` of indexes keyed by room id | `home.js` |

Each bug has unit tests and browser tests (see **Testing**).

## Project structure

```
MYSHELTER/
├── index.html            Explore page
├── checkout.html         Checkout page
├── bookings.html         My Bookings page
├── 404.html
├── css/styles.css        Liquid Glass design system and all styles
├── js/
│   ├── data.js           Room list, amenities, coupons (edit listings here)
│   ├── core.js           Pure logic: filter, sort, bill, coupon, validation, dates
│   ├── store.js          localStorage / sessionStorage with safe fallbacks
│   ├── ui.js             Icons, toasts, cursor glow, header badge, image fallback
│   ├── home.js           Explore page behaviour
│   ├── checkout.js       Checkout behaviour
│   └── bookings.js       My Bookings behaviour
├── assets/               favicon.svg, placeholder.svg
├── scripts/
│   ├── serve.js          Zero-dependency dev server (same security headers as production)
│   └── build.js          Validates data and links, then writes dist/
├── tests/
│   ├── unit/core.test.js Node test runner
│   └── e2e/site.spec.js  Playwright browser tests (desktop + mobile)
├── playwright.config.js
├── vercel.json
├── package.json / package-lock.json
├── .env.example
└── .gitignore
```

## Run locally

Requires **Node.js 22+**. The site itself has no runtime dependencies.

```bash
npm run dev          # http://127.0.0.1:5173
```

Opening `index.html` directly from disk also works, because the scripts are classic scripts rather than ES modules. Using the dev server is closer to production, since it applies the security headers.

```bash
npm run build        # validate + write dist/
npm run preview      # serve dist/ on http://127.0.0.1:5173
```

## Testing

```bash
npm install                        # installs the Playwright test runner (dev only)
npx playwright install chromium    # once, downloads the test browser
npm test                           # 14 unit tests
npm run test:e2e                   # 21 browser tests × desktop + mobile = 42
npm run test:all                   # everything + build
```

The browser tests stub Unsplash photos and Google Fonts so they run offline. Every test also fails if the page logs a console error or a CSP violation.

## Deploy to GitHub and Vercel

1. Create an empty GitHub repository, then from inside `MYSHELTER/`:
   ```bash
   git init && git add . && git commit -m "MYSHELTER initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/myshelter.git
   git push -u origin main
   ```
2. On vercel.com choose **Add New → Project**, import the repo, and keep the defaults. `vercel.json` already sets **Build command** `npm run build` and **Output directory** `dist`. Framework preset: *Other*.
3. Deploy. No environment variables are needed.

Any static host works (Netlify, GitHub Pages, Cloudflare Pages): run `npm run build` and publish `dist/`. On those hosts, copy the headers from `vercel.json` into the host's own header config.

## Configuration and external services

- **Environment variables:** none required. `.env.example` lists only optional `PORT` and `HOST` for the local dev server.
- **Photos:** loaded from `images.unsplash.com` (free Unsplash licence). If a photo fails, the card shows `assets/placeholder.svg`. To use your own photos, put them in `assets/` and update `js/data.js`, then add the host to `img-src` in `vercel.json` if it's remote.
- **Font:** Inter from Google Fonts. If it's unavailable, the system UI font is used.
- **Storage scope:** bookings live in the visitor's browser (`localStorage`), as the brief specifies. They aren't shared across devices and are cleared if the user clears site data. Moving bookings to a real backend means replacing the four booking methods in `js/store.js`.

## Editing listings

Add or change rooms in `js/data.js`. Keep `rent` and `deposit` as **numbers**, `type` one of `1 BHK`, `2 BHK`, `Single Room`, `Shared Room`, and `gender` one of `Girls`, `Boys`, `Any`. `npm run build` rejects invalid data.
