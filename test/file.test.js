const test = require('node:test');
const assert = require('node:assert/strict');

const { MAX_IMPORT_BYTES, validateImportFile } = require('../js/file.js');

test('accepts Markdown and plain-text files within the size limit', () => {
  assert.deepEqual(validateImportFile({ name: 'resume.md', type: 'text/markdown', size: 100 }), { ok: true });
  assert.deepEqual(validateImportFile({ name: 'resume.txt', type: 'text/plain', size: 100 }), { ok: true });
  assert.deepEqual(validateImportFile({ name: 'README.MARKDOWN', type: '', size: 100 }), { ok: true });
});

test('rejects unsupported and oversized imports', () => {
  const unsupported = validateImportFile({ name: 'resume.png', type: 'image/png', size: 100 });
  const oversized = validateImportFile({ name: 'resume.md', type: 'text/markdown', size: MAX_IMPORT_BYTES + 1 });

  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /Markdown 或纯文本/);
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /1 MiB/);
});
