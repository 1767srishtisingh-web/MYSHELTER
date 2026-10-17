# MYSHELTER: Testing report

Run on 18 Oct 2026 · Node 22.22 · Chromium (Playwright 1.56) · timezone Asia/Kolkata.

## Results

| Suite | Command | Result |
|---|---|---|
| Unit (logic for all 10 bugs, data, URL state, escaping) | `npm test` | **14 / 14 passed** |
| Production build (data validation, link check, CSP lint) | `npm run build` | **Passed**: 18 rooms, 14 files |
| Browser, desktop 1366×900 | `npm run test:e2e` | **21 / 21 passed** |
| Browser, mobile (Pixel 7) | `npm run test:e2e` | **21 / 21 passed** |
| Flakiness check | `npx playwright test --repeat-each=3` | **126 / 126 passed** |
| Fresh install from the ZIP (`npm ci` → test → build → e2e) | — | **Passed** |

Every browser test also asserts **zero console errors and zero CSP violations**.

## Bug verification (browser)

| Bug | Test | Status |
|---|---|---|
| 1 Refresh clears booking | Book → reload → same room; open `checkout.html` with no param → restored from localStorage | ✅ |
| 2 1 BHK shows 2 BHK | Select 1 BHK → every card is 1 BHK | ✅ |
| 3 Wrong room at checkout | Sort High→Low, filter 1 BHK, book 2nd card → checkout shows that exact title, type 1 BHK | ✅ |
| 4 String addition | ₹14,000 + ₹28,000 = **₹42,000** | ✅ |
| 5 Sort backwards | Low→High ascending, High→Low descending | ✅ |
| 6 Girls Only inverted | Every card tagged "Girls only" | ✅ |
| 7 Coupon stacking | Apply, then force 5 more clicks → discount stays ₹500; remove restores the price; invalid code rejected | ✅ |
| 8 Past dates | `min` = local today; 2020 and yesterday rejected on submit | ✅ |
| 9 Empty form submits | Empty, whitespace-only name and short phone all blocked; first invalid field focused | ✅ |
| 10 Shared carousel index | Next on card 1 → card 2 unchanged | ✅ |

## Other journeys verified

- Full flow: book with coupon → success dialog with reference → My Bookings → survives reload → cancel → badge clears
- Duplicate booking (same room, date and phone) refused
- Filters and city chip persist in the URL across reload; "Clear all filters" works
- Empty results state with reset; "No room selected" and "Room not available" states
- Broken photos fall back to the local placeholder
- Unknown route returns HTTP 404 with the 404 page
- No horizontal overflow at 360 px on Explore, Checkout and My Bookings
- Visual review via screenshots at 1440, 820 and 390 px

## Bugs found and fixed during testing

- Grid/flex `min-width: auto` let the hero, filter panel and checkout overflow by up to 175 px at 360 px wide. Fixed with `minmax(0, 1fr)` tracks.
- The phone field's `maxlength` cut off "+91 98765 43210", which made a valid number fail. Raised to 16.
- Uneven field heights in the two-column checkout row. Fixed with `align-content: start`.

## Not verified here

- **Real Unsplash photos and the Inter web font.** The build sandbox blocks external hosts, so tests stub them. The photo IDs are standard Unsplash IDs but weren't fetched. Any that fail show the placeholder automatically.
- **Live Vercel deploy.** The config is in place, but no deployment was run from here.
- **Safari and Firefox.** Only Chromium was automated. The code avoids Chromium-only APIs except `:has()`, which is used only for a cosmetic fade.
