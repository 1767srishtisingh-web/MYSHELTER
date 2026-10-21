// @ts-check
// Browser tests: one or more per report bug, plus the main user journeys.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PLACEHOLDER = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'placeholder.svg'));

function localISO(offsetDays) {
  // "today" in Asia/Kolkata, matching the browser's timezone in the config
  const d = new Date(Date.now() + (5.5 * 60 + offsetDays * 1440) * 60000);
  return d.toISOString().slice(0, 10);
}

/** Collect console errors and page errors for each test. */
test.beforeEach(async ({ page }, testInfo) => {
  // Keep tests offline and deterministic: stub remote photos and fonts.
  await page.route('https://images.unsplash.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: PLACEHOLDER }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  testInfo['consoleErrors'] = errors;
});

test.afterEach(async ({}, testInfo) => {
  expect(testInfo['consoleErrors'], 'no console errors or CSP violations').toEqual([]);
});

const cards = (page) => page.locator('#grid .card');

async function bookByTitle(page, title) {
  const card = cards(page).filter({ has: page.locator('.card-title', { hasText: title }) });
  await card.getByRole('link', { name: 'Book now' }).click();
  await expect(page).toHaveURL(/checkout\.html\?room=/);
}

test('home renders all 18 listings with photos and prices', async ({ page }) => {
  await page.goto('/');
  await expect(cards(page)).toHaveCount(18);
  await expect(page.locator('#results-count')).toHaveText('18 stays found');
  await expect(page.locator('#grid .card').first().locator('img').first()).toBeVisible();
});

test('Bug 2: 1 BHK filter shows only 1 BHK rooms', async ({ page }) => {
  await page.goto('/');
  await page.locator('#type-filter').getByRole('button', { name: '1 BHK', exact: true }).click();
  const types = await page.locator('#grid .meta--type').allInnerTexts();
  expect(types.length).toBeGreaterThan(0);
  for (const t of types) expect(t.trim()).toBe('1 BHK');
});

test('Bug 6: Girls only shows only girls stays', async ({ page }) => {
  await page.goto('/');
  await page.locator('#gender-filter').getByRole('button', { name: 'Girls only' }).click();
  const tags = await page.locator('#grid .tag-row .tag:first-child').allInnerTexts();
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) expect(t.trim()).toBe('Girls only');
});

test('Bug 5: Rent Low to High puts the cheapest room first', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sort').selectOption('rent-asc');
  const prices = (await page.locator('#grid .price strong').allInnerTexts()).map((p) => Number(p.replace(/\D/g, '')));
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  await page.locator('#sort').selectOption('rent-desc');
  const desc = (await page.locator('#grid .price strong').allInnerTexts()).map((p) => Number(p.replace(/\D/g, '')));
  expect(desc).toEqual([...desc].sort((a, b) => b - a));
});

test('Bug 10: carousel arrow moves only its own card', async ({ page }) => {
  await page.goto('/');
  const first = cards(page).nth(0);
  const second = cards(page).nth(1);
  await first.hover();
  await first.getByRole('button', { name: 'Next photo' }).click();
  await expect(first.locator('[data-dot="1"]')).toHaveAttribute('aria-current', 'true');
  await expect(second.locator('[data-dot="0"]')).toHaveAttribute('aria-current', 'true');
  const t2 = await second.locator('.carousel-track').evaluate((el) => el.style.transform);
  expect(t2).toBe('translateX(0%)');
});

test('Bug 3: booking a 1 BHK opens checkout for that exact room', async ({ page }) => {
  await page.goto('/?sort=rent-desc');
  await page.locator('#type-filter').getByRole('button', { name: '1 BHK', exact: true }).click();
  const card = cards(page).nth(1);
  const title = (await card.locator('.card-title').innerText()).trim();
  await card.getByRole('link', { name: 'Book now' }).click();
  await expect(page.locator('#summary-title')).toHaveText(title);
  await expect(page.locator('#sum-meta .meta--type')).toHaveText('1 BHK');
});

test('Bug 1: refreshing checkout keeps the selected room', async ({ page }) => {
  await page.goto('/');
  await bookByTitle(page, 'Sunny 1 BHK Flat');
  await expect(page.locator('#summary-title')).toHaveText('Sunny 1 BHK Flat – Pune');
  await page.reload();
  await expect(page.locator('#summary-title')).toHaveText('Sunny 1 BHK Flat – Pune');
  // Even opening checkout without the ?room= param restores it from localStorage
  await page.goto('/checkout.html');
  await expect(page.locator('#summary-title')).toHaveText('Sunny 1 BHK Flat – Pune');
  await expect(page).toHaveURL(/room=ms-102/);
});

test('checkout without a selection shows a clear empty state', async ({ page }) => {
  await page.goto('/checkout.html');
  await expect(page.locator('#no-room')).toBeVisible();
  await expect(page.locator('#no-room-title')).toHaveText('No room selected');
  await page.goto('/checkout.html?room=does-not-exist');
  await expect(page.locator('#no-room-title')).toHaveText('That room isn’t available');
});

test('Bug 4: total is Rent + Deposit as numbers', async ({ page }) => {
  await page.goto('/checkout.html?room=ms-102'); // ₹14,000 + ₹28,000
  await expect(page.locator('#bill-rent')).toHaveText('₹14,000');
  await expect(page.locator('#bill-deposit')).toHaveText('₹28,000');
  await expect(page.locator('#bill-total')).toHaveText('₹42,000');
});

test('Bug 7: WELCOME500 can only be applied once', async ({ page }) => {
  await page.goto('/checkout.html?room=ms-102');
  await page.locator('#coupon').fill('WELCOME500');
  await page.locator('#coupon-apply').click();
  await expect(page.locator('#bill-total')).toHaveText('₹41,500');
  // Try to re-apply five times through the (now disabled) control and Enter key
  for (let i = 0; i < 5; i++) {
    await page.locator('#coupon-apply').evaluate((b) => b.click());
  }
  await expect(page.locator('#bill-discount')).toHaveText('−₹500');
  await expect(page.locator('#bill-total')).toHaveText('₹41,500');
  // Remove → back to full price; invalid code is rejected
  await page.getByRole('button', { name: 'Remove coupon' }).click();
  await expect(page.locator('#bill-total')).toHaveText('₹42,000');
  await page.locator('#coupon').fill('FREEROOM');
  await page.locator('#coupon').press('Enter');
  await expect(page.locator('#coupon-msg')).toHaveClass(/err/);
  await expect(page.locator('#bill-total')).toHaveText('₹42,000');
});

test('Bug 8: past dates are blocked', async ({ page }) => {
  await page.goto('/checkout.html?room=ms-101');
  await expect(page.locator('#checkIn')).toHaveAttribute('min', localISO(0));
  await page.locator('#name').fill('Ananya Sharma');
  await page.locator('#phone').fill('9876543210');
  await page.locator('#checkIn').fill('2020-01-15');
  await page.locator('#confirm-btn').click();
  await expect(page.locator('#checkIn-error')).toHaveText('Check-in can’t be in the past.');
  await expect(page.locator('#success-dialog')).not.toBeVisible();
  await page.locator('#checkIn').fill(localISO(-1));
  await page.locator('#confirm-btn').click();
  await expect(page.locator('#checkIn-error')).toHaveText('Check-in can’t be in the past.');
});

test('Bug 9: empty name and phone cannot be submitted', async ({ page }) => {
  await page.goto('/checkout.html?room=ms-101');
  await page.locator('#confirm-btn').click();
  await expect(page.locator('#name-error')).toHaveText('Please enter your full name.');
  await expect(page.locator('#phone-error')).toHaveText('Please enter your phone number.');
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#name')).toBeFocused();
  await expect(page.locator('#success-dialog')).not.toBeVisible();
  await page.locator('#name').fill('    ');
  await page.locator('#phone').fill('12345');
  await page.locator('#confirm-btn').click();
  await expect(page.locator('#name-error')).not.toBeEmpty();
  await expect(page.locator('#phone-error')).toHaveText('Enter a valid 10-digit Indian mobile number.');
  await expect(page.locator('#success-dialog')).not.toBeVisible();
});

test('full journey: book → My Bookings → cancel', async ({ page }) => {
  await page.goto('/');
  await bookByTitle(page, 'Pink City Girls PG');
  await page.locator('#name').fill('Ananya Sharma');
  await page.locator('#phone').fill('+91 98765 43210');
  await page.locator('#checkIn').fill(localISO(7));
  await page.locator('#coupon').fill('welcome500');
  await page.locator('#coupon-apply').click();
  await expect(page.locator('#bill-total')).toHaveText('₹16,500'); // 8,500 + 8,500 − 500
  await page.locator('#confirm-btn').click();
  const dialog = page.locator('#success-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#success-title')).toHaveText('Booking successful!');
  const ref = (await page.locator('#success-ref').innerText()).trim();
  expect(ref).toMatch(/^MS-[A-Z0-9]{6}$/);
  await expect(page.locator('[data-booking-count]').first()).toHaveText('1');

  await dialog.getByRole('link', { name: 'My bookings' }).click();
  await expect(page).toHaveURL(/bookings\.html/);
  const row = page.locator('.booking', { hasText: ref });
  await expect(row).toContainText('Pink City Girls PG');
  await expect(row).toContainText('₹16,500');
  await expect(row.locator('.status')).toHaveText('Confirmed');

  // Survives a full reload (real persistence)
  await page.reload();
  await expect(page.locator('.booking', { hasText: ref })).toBeVisible();

  await row.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Yes, cancel' }).click();
  await expect(row.locator('.status')).toHaveText('Cancelled');
  await expect(page.locator('[data-booking-count]').first()).toBeHidden();
});

test('duplicate booking for the same room and date is refused', async ({ page }) => {
  const fill = async () => {
    await page.goto('/checkout.html?room=ms-104');
    await page.locator('#name').fill('Ravi Kumar');
    await page.locator('#phone').fill('9123456780');
    await page.locator('#checkIn').fill(localISO(3));
    await page.locator('#confirm-btn').click();
  };
  await fill();
  await expect(page.locator('#success-dialog')).toBeVisible();
  await fill();
  await expect(page.locator('.toast')).toContainText('already have this room booked');
  await expect(page.locator('#success-dialog')).not.toBeVisible();
});

test('search, city chips and filters persist in the URL across reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('#city-chips').getByRole('button', { name: 'Jaipur' }).click();
  await page.locator('#amenity-filter').getByText('Wi-Fi').click();
  await expect(page).toHaveURL(/q=Jaipur/);
  await page.reload();
  await expect(page.locator('#q')).toHaveValue('Jaipur');
  await expect(page.locator('#amenity-filter input[value="wifi"]')).toBeChecked();
  const locs = await page.locator('#grid .card-loc').allInnerTexts();
  expect(locs.length).toBeGreaterThan(0);
  for (const l of locs) expect(l).toContain('Jaipur');
  await page.getByRole('button', { name: 'Clear all filters' }).first().click();
  await expect(cards(page)).toHaveCount(18);
});

test('empty results show a reset action', async ({ page }) => {
  await page.goto('/?q=atlantis');
  await expect(page.locator('#grid .empty')).toContainText('No stays match');
  await page.locator('#grid [data-action="reset"]').click();
  await expect(cards(page)).toHaveCount(18);
});

for (const url of ['/', '/checkout.html?room=ms-105', '/bookings.html']) {
  test(`no horizontal overflow at 360px: ${url}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('broken photos fall back to the local placeholder', async ({ page }) => {
  await page.unroute('https://images.unsplash.com/**');
  await page.route('https://images.unsplash.com/**', (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  const img = cards(page).first().locator('img').first();
  await expect(img).toHaveAttribute('src', 'assets/placeholder.svg');
  test.info()['consoleErrors'].length = 0; // the intentional 404s log console errors
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const res = await page.goto('/nowhere');
  expect(res && res.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Back to Explore' })).toBeVisible();
  test.info()['consoleErrors'].length = 0; // the browser logs the expected 404 status
});
