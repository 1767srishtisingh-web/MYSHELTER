# MYSHELTER: Bug Hunt Edition 🐞

MYSHELTER is a hotel room booking site for **Delhi, Noida and Ghaziabad**: 141 rooms across 47 hotels. It looks finished, but **10 bugs** are hiding in it. Use the site like a real guest, find each bug, and fix it in the code.

## Start

You need Node.js 18 or newer. There is nothing to install.

```bash
npm run dev
```

Then open http://127.0.0.1:5173. You can also just double-click `index.html`.

## What the site should do

- **Rooms:** search by hotel, area or city. Filter by city, by room type (Standard, Deluxe, Executive, Suite) and by options (Free cancellation, Breakfast included, Swimming pool, Free parking). Sort by price, from low to high or high to low, or by star rating.
- **Room cards:** each card has its own photo slider and a **Book now** button that opens that exact room.
- **Checkout:** the bill is **(Room tariff + GST) × nights − Discount**. The coupon `WELCOME500` gives ₹500 off, **once**. Guests must enter a name, a 10-digit mobile number and a check-in date that is **today or later**. Refreshing the page must keep the selected room.
- **My Bookings:** lists bookings, which stay saved after a refresh, and lets you cancel them.

If something doesn't match this description, you've found a bug.

## Where to look

| File | What it does |
|---|---|
| `js/data.js` | Hotels, rooms, tariffs and coupons |
| `js/core.js` | Filtering, sorting, bill maths and validation |
| `js/home.js` | Rooms page: cards, sliders, Book now |
| `js/checkout.js` | Checkout: bill, coupon, form |
| `js/store.js` | Saving to `localStorage` (has helpers you may find useful) |
| `checkout.html` | Checkout form markup |

**Tip:** open DevTools (F12). Console, Application → Local Storage, and breakpoints help.

## Rules

1. For each bug, write down **what happens**, **what should happen**, and **the file and line you changed**.
2. Fix the cause, not the symptom.
3. Don't break other features.
4. Show each fix working in the browser.

*Demo project for a college event. Tariffs are indicative, photos are representative, and no booking is sent to any hotel.*
