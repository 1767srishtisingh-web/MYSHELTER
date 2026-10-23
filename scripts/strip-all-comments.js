'use strict';

const fs = require('fs');
const path = require('path');
const { stripJsComments, stripCssComments, stripHtmlComments } = require('./strip-comments');

const ROOT = path.resolve(__dirname, '..');

const DIRS_TO_PROCESS = ['api', 'js', 'css', 'scripts'];
const ROOT_FILES_TO_PROCESS = ['404.html', 'admin.html', 'auth.html', 'bookings.html', 'checkout.html', 'index.html'];

function cleanTrailingWhitespace(str) {
  return str
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n');
}

function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const original = fs.readFileSync(filePath, 'utf8');
  let cleaned = original;

  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    cleaned = stripJsComments(original);
  } else if (ext === '.css') {
    cleaned = stripCssComments(original);
  } else if (ext === '.html') {
    cleaned = stripHtmlComments(original);
  } else {
    return;
  }

  cleaned = cleanTrailingWhitespace(cleaned);

  if (cleaned !== original) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`Cleaned comments: ${path.relative(ROOT, filePath)}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'archive' || entry.name === 'docs') {
        continue;
      }
      walkDir(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  }
}

for (const dir of DIRS_TO_PROCESS) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) walkDir(full);
}

for (const file of ROOT_FILES_TO_PROCESS) {
  const full = path.join(ROOT, file);
  if (fs.existsSync(full)) processFile(full);
}

console.log('All comments stripped successfully.');

