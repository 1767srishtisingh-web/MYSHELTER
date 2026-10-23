#!/usr/bin/env node







'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PAGES = ['index.html', 'checkout.html', 'bookings.html', '404.html', 'auth.html', 'admin.html'];
const DIRS = ['css', 'js', 'assets'];
const problems = [];


const { ROOMS, AMENITIES, COUPONS } = require(path.join(ROOT, 'js', 'data.js'));
const ids = new Set();
if (ROOMS.length < 100 || ROOMS.length > 200) problems.push(`Expected 100–200 rooms, found ${ROOMS.length}`);
for (const r of ROOMS) {
  if (ids.has(r.id)) problems.push(`Duplicate room id ${r.id}`);
  ids.add(r.id);
  for (const k of ['price', 'stars', 'guests', 'size']) {
    if (typeof r[k] !== 'number' || !Number.isFinite(r[k])) problems.push(`${r.id}.${k} must be a number`);
  }
  if (!['Standard', 'Deluxe', 'Executive', 'Suite'].includes(r.type)) problems.push(`${r.id} has unknown type ${r.type}`);
  if (!['Delhi', 'Noida', 'Ghaziabad'].includes(r.city)) problems.push(`${r.id} has unknown city ${r.city}`);
  if (!Array.isArray(r.images) || r.images.length < 2) problems.push(`${r.id} needs at least 2 photos`);
  for (const a of r.amenities) if (!AMENITIES[a]) problems.push(`${r.id} has unknown amenity ${a}`);
  for (const src of r.images) if (!/^https:\/\/images\.unsplash\.com\//.test(src)) problems.push(`${r.id} photo not on images.unsplash.com: ${src}`);
}
for (const c of Object.values(COUPONS)) if (typeof c.amount !== 'number') problems.push(`Coupon ${c.code} amount must be a number`);


for (const page of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0].replace(/^\//, '') || 'index.html';
    if (!fs.existsSync(path.join(ROOT, clean))) problems.push(`${page}: missing ${ref}`);
  }
}


const vm = require('vm');
for (const dir of ['js', 'api']) {
  const scan = (d) => {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) scan(p);
      else if (p.endsWith('.js')) {
        try {
          new vm.Script(fs.readFileSync(p, 'utf8'), { filename: p });
        } catch (e) {
          problems.push(`Syntax error in ${p}: ${e.message}`);
        }
      }
    }
  };
  scan(path.join(ROOT, dir));
}

if (problems.length) {
  console.error('Build failed:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}


fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
for (const p of PAGES) fs.copyFileSync(path.join(ROOT, p), path.join(DIST, p));
for (const d of DIRS) fs.cpSync(path.join(ROOT, d), path.join(DIST, d), { recursive: true });

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`Build OK — ${ROOMS.length} rooms validated, ${count(DIST)} files written to dist/`);
