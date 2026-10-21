'use strict';
// Unit tests for the pure logic. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../../js/core.js');
const { ROOMS, COUPONS } = require('../../js/data.js');

test('data: 15–20 rooms, unique ids, numeric money fields', () => {
  assert.ok(ROOMS.length >= 15 && ROOMS.length <= 20);
  assert.equal(new Set(ROOMS.map((r) => r.id)).size, ROOMS.length);
  for (const r of ROOMS) {
    assert.equal(typeof r.rent, 'number', r.id);
    assert.equal(typeof r.deposit, 'number', r.id);
  }
});

test('Bug 2: 1 BHK filter returns only 1 BHK rooms', () => {
  const out = Core.filterRooms(ROOMS, { type: '1 BHK' });
  assert.ok(out.length > 0);
  assert.ok(out.every((r) => r.type === '1 BHK'));
  // combined with another filter, every condition must still hold (AND, not OR)
  const combo = Core.filterRooms(ROOMS, { type: '1 BHK', amenities: ['ac'], query: 'pune' });
  assert.ok(combo.every((r) => r.type === '1 BHK' && r.amenities.includes('ac') && r.city === 'Pune'));
  assert.ok(Core.filterRooms(ROOMS, { type: '2 BHK' }).every((r) => r.type === '2 BHK'));
});

test('Bug 6: Girls-only shows only girls stays (no inverted condition)', () => {
  const girls = Core.filterRooms(ROOMS, { gender: 'Girls' });
  assert.ok(girls.length > 0);
  assert.ok(girls.every((r) => r.gender === 'Girls'));
  const boys = Core.filterRooms(ROOMS, { gender: 'Boys' });
  assert.ok(boys.length > 0 && boys.every((r) => r.gender === 'Boys'));
  assert.equal(Core.filterRooms(ROOMS, { gender: 'any' }).length, ROOMS.length);
});

test('amenity filters require every selected amenity', () => {
  const out = Core.filterRooms(ROOMS, { amenities: ['wifi', 'ac', 'food'] });
  assert.ok(out.length > 0);
  assert.ok(out.every((r) => ['wifi', 'ac', 'food'].every((a) => r.amenities.includes(a))));
});

test('search matches city and locality, case-insensitive, multi-word', () => {
  assert.ok(Core.filterRooms(ROOMS, { query: 'JAIPUR' }).every((r) => r.city === 'Jaipur'));
  const vn = Core.filterRooms(ROOMS, { query: 'viman nagar' });
  assert.equal(vn.length, 1);
  assert.equal(vn[0].id, 'ms-102');
  assert.equal(Core.filterRooms(ROOMS, { query: 'atlantis' }).length, 0);
});

test('Bug 5: Rent Low→High puts the cheapest first; High→Low the reverse', () => {
  const asc = Core.sortRooms(ROOMS, 'rent-asc').map((r) => r.rent);
  const desc = Core.sortRooms(ROOMS, 'rent-desc').map((r) => r.rent);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  assert.equal(asc[0], Math.min(...ROOMS.map((r) => r.rent)));
  // sorting must not mutate the source array
  const before = ROOMS.map((r) => r.id).join();
  Core.sortRooms(ROOMS, 'rent-desc');
  assert.equal(ROOMS.map((r) => r.id).join(), before);
});

test('Bug 4: rent + deposit is numeric addition, even from strings', () => {
  assert.equal(Core.calculateBill({ rent: 10000, deposit: 5000 }).total, 15000);
  assert.equal(Core.calculateBill({ rent: '10000', deposit: '5000' }).total, 15000);
  assert.equal(Core.calculateBill({ rent: '10,000', deposit: '₹5,000', discount: '500' }).total, 14500);
  assert.equal(Core.formatINR(15000), '₹15,000');
  assert.equal(Core.formatINR(144000), '₹1,44,000');
  assert.equal(Core.calculateBill({ rent: 100, deposit: 0, discount: 500 }).total, 0, 'never negative');
});

test('Bug 7: WELCOME500 applies once, however many times Apply is pressed', () => {
  let state = { coupon: null };
  const first = Core.applyCoupon(state, 'welcome500 ', COUPONS);
  assert.ok(first.ok);
  state = first.state;
  for (let i = 0; i < 4; i++) {
    const again = Core.applyCoupon(state, 'WELCOME500', COUPONS);
    assert.equal(again.ok, false);
    state = again.state;
  }
  const bill = Core.calculateBill({ rent: 10000, deposit: 5000, discount: state.coupon.amount });
  assert.equal(bill.discount, 500);
  assert.equal(bill.total, 14500);
  assert.equal(Core.applyCoupon({ coupon: null }, 'FREE9999', COUPONS).ok, false);
  assert.equal(Core.applyCoupon({ coupon: null }, '', COUPONS).ok, false);
});

test('Bug 8: past check-in dates are rejected; today is allowed', () => {
  const now = new Date(2026, 9, 18, 0, 30); // 00:30 local — the IST/UTC edge
  assert.equal(Core.todayISO(now), '2026-10-18');
  const base = { name: 'Ananya Sharma', phone: '9876543210' };
  assert.equal(Core.validateBooking({ ...base, checkIn: '2026-10-17' }, now).errors.checkIn, 'Check-in can’t be in the past.');
  assert.ok(Core.validateBooking({ ...base, checkIn: '2020-01-01' }, now).errors.checkIn);
  assert.equal(Core.validateBooking({ ...base, checkIn: '2026-10-18' }, now).valid, true);
  assert.ok(Core.validateBooking({ ...base, checkIn: '2027-12-01' }, now).errors.checkIn, 'too far ahead');
  assert.ok(Core.validateBooking({ ...base, checkIn: '2026-02-30' }, now).errors.checkIn, 'impossible date');
});

test('Bug 9: empty or whitespace name and phone are rejected', () => {
  const now = new Date(2026, 9, 18);
  const r = Core.validateBooking({ name: '   ', phone: '', checkIn: '2026-10-20' }, now);
  assert.equal(r.valid, false);
  assert.ok(r.errors.name);
  assert.ok(r.errors.phone);
  assert.ok(Core.validateBooking({ name: 'A', phone: '9876543210', checkIn: '2026-10-20' }, now).errors.name);
  assert.ok(Core.validateBooking({ name: 'Ravi', phone: '12345', checkIn: '2026-10-20' }, now).errors.phone);
  assert.ok(Core.validateBooking({ name: 'Ravi', phone: '5876543210', checkIn: '2026-10-20' }, now).errors.phone);
  assert.ok(Core.validateBooking({ name: '<script>', phone: '9876543210', checkIn: '2026-10-20' }, now).errors.name);
  const ok = Core.validateBooking({ name: '  Ravi   Kumar ', phone: '+91 98765-43210', checkIn: '2026-10-20' }, now);
  assert.equal(ok.valid, true);
  assert.equal(ok.values.name, 'Ravi Kumar');
  assert.equal(ok.values.phone, '9876543210');
});

test('Bug 3: rooms are found by id, not by list position', () => {
  const sorted = Core.sortRooms(ROOMS, 'rent-desc');
  const target = sorted[2];
  assert.equal(Core.findRoom(ROOMS, target.id), target);
  assert.equal(Core.findRoom(ROOMS, 'nope'), null);
  assert.equal(Core.findRoom(ROOMS, null), null);
});

test('Bug 10: carousel index wraps independently', () => {
  assert.equal(Core.stepIndex(0, 3, 1), 1);
  assert.equal(Core.stepIndex(2, 3, 1), 0);
  assert.equal(Core.stepIndex(0, 3, -1), 2);
  assert.equal(Core.stepIndex(0, 0, 1), 0);
});

test('filters round-trip through the URL and reject junk', () => {
  const f = { query: 'pune', type: '1 BHK', gender: 'Girls', amenities: ['wifi', 'ac'], sort: 'rent-asc' };
  assert.deepEqual(Core.readFilters(Core.writeFilters(f)), f);
  const junk = Core.readFilters('?type=penthouse&gender=x&sort=hack&amenities=pool,wifi');
  assert.deepEqual(junk, { query: '', type: 'all', gender: 'any', amenities: ['wifi'], sort: 'recommended' });
});

test('escapeHTML neutralises markup', () => {
  assert.equal(Core.escapeHTML('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});
