const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_IMAGE_BYTES,
  MAX_IMPORT_BYTES,
  downloadMarkdown,
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
  const missingType = validateImportFile({ name: 'resume.exe', type: '', size: 100 });
  const mismatchedType = validateImportFile({ name: 'resume.md', type: 'text/html', size: 100 });
  const htmlText = validateImportFile({ name: 'resume.html', type: 'text/html', size: 100 });
  const svgText = validateImportFile({ name: 'avatar.svg', type: 'image/svg+xml', size: 100 });
  const oversized = validateImportFile({ name: 'resume.md', type: 'text/markdown', size: MAX_IMPORT_BYTES + 1 });

  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /Markdown 或纯文本/);
  assert.equal(missingType.ok, false);
  assert.match(missingType.error, /Markdown 或纯文本/);
  assert.equal(mismatchedType.ok, false);
  assert.match(mismatchedType.error, /Markdown 或纯文本/);
  assert.equal(htmlText.ok, false);
  assert.match(htmlText.error, /Markdown 或纯文本/);
  assert.equal(svgText.ok, false);
  assert.match(svgText.error, /Markdown 或纯文本/);
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /2 MiB/);
});

test('accepts supported image uploads within the size limit', () => {
  assert.deepEqual(validateImageFile({ name: 'photo.jpg', type: 'image/jpeg', size: 100 }), { ok: true });
  assert.deepEqual(validateImageFile({ name: 'photo.PNG', type: '', size: 100 }), { ok: true });
  assert.deepEqual(validateImageFile({ name: 'avatar.webp', type: 'image/webp', size: 100 }), { ok: true });
});

test('rejects unsupported and oversized image uploads', () => {
  const svg = validateImageFile({ name: 'avatar.svg', type: 'image/svg+xml', size: 100 });
  const missingType = validateImageFile({ name: 'avatar.exe', type: '', size: 100 });
  const mismatchedType = validateImageFile({ name: 'avatar.png', type: 'image/svg+xml', size: 100 });
  const text = validateImageFile({ name: 'avatar.txt', type: 'text/plain', size: 100 });
  const oversized = validateImageFile({ name: 'photo.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 });

  assert.equal(svg.ok, false);
  assert.match(svg.error, /JPG、PNG、WebP 或 GIF/);
  assert.equal(missingType.ok, false);
  assert.match(missingType.error, /JPG、PNG、WebP 或 GIF/);
  assert.equal(mismatchedType.ok, false);
  assert.match(mismatchedType.error, /JPG、PNG、WebP 或 GIF/);
  assert.equal(text.ok, false);
  assert.match(text.error, /JPG、PNG、WebP 或 GIF/);
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /1 MiB/);
});

test('cleans up temporary download resources when clicking fails', () => {
  const originals = {
    Blob: global.Blob,
    URL: global.URL,
    document: global.document,
    window: global.window,
  };
  let removed = false;
  let revoked = null;

  global.Blob = class BlobMock {};
  global.URL = {
    createObjectURL() {
      return 'blob:resume';
    },
    revokeObjectURL(value) {
      revoked = value;
    },
  };
  global.document = {
    body: { appendChild() {} },
    createElement() {
      return {
        click() {
          throw new Error('download blocked');
        },
        remove() {
          removed = true;
        },
      };
    },
  };
  global.window = { setTimeout(callback) { callback(); } };

  try {
    assert.throws(() => downloadMarkdown('resume', 'resume.md'), /download blocked/);
    assert.equal(removed, true);
    assert.equal(revoked, 'blob:resume');
  } finally {
    Object.assign(global, originals);
  }
});
