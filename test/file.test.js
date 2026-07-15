const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_IMAGE_BYTES,
  MAX_IMPORT_BYTES,
  validateImageFile,
  validateImportFile,
} = require('../js/file.js');

test('accepts Markdown and plain-text files within the size limit', () => {
  assert.deepEqual(validateImportFile({ name: 'resume.md', type: 'text/markdown', size: 100 }), { ok: true });
  assert.deepEqual(validateImportFile({ name: 'resume.txt', type: 'text/plain', size: 100 }), { ok: true });
  assert.deepEqual(validateImportFile({ name: 'README.MARKDOWN', type: '', size: 100 }), { ok: true });
});

test('rejects unsupported and oversized imports', () => {
  const unsupported = validateImportFile({ name: 'resume.png', type: 'image/png', size: 100 });
  const htmlText = validateImportFile({ name: 'resume.html', type: 'text/html', size: 100 });
  const svgText = validateImportFile({ name: 'avatar.svg', type: 'image/svg+xml', size: 100 });
  const oversized = validateImportFile({ name: 'resume.md', type: 'text/markdown', size: MAX_IMPORT_BYTES + 1 });

  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /Markdown 或纯文本/);
  assert.equal(htmlText.ok, false);
  assert.match(htmlText.error, /Markdown 或纯文本/);
  assert.equal(svgText.ok, false);
  assert.match(svgText.error, /Markdown 或纯文本/);
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /1 MiB/);
});

test('accepts supported image uploads within the size limit', () => {
  assert.deepEqual(validateImageFile({ name: 'photo.jpg', type: 'image/jpeg', size: 100 }), { ok: true });
  assert.deepEqual(validateImageFile({ name: 'photo.PNG', type: '', size: 100 }), { ok: true });
  assert.deepEqual(validateImageFile({ name: 'avatar.webp', type: 'image/webp', size: 100 }), { ok: true });
});

test('rejects unsupported and oversized image uploads', () => {
  const svg = validateImageFile({ name: 'avatar.svg', type: 'image/svg+xml', size: 100 });
  const text = validateImageFile({ name: 'avatar.txt', type: 'text/plain', size: 100 });
  const oversized = validateImageFile({ name: 'photo.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 });

  assert.equal(svg.ok, false);
  assert.match(svg.error, /JPG、PNG、WebP 或 GIF/);
  assert.equal(text.ok, false);
  assert.match(text.error, /JPG、PNG、WebP 或 GIF/);
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /1 MiB/);
});
