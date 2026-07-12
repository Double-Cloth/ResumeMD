const test = require('node:test');
const assert = require('node:assert/strict');

const { createStorage } = require('../js/storage.js');

test('loads, saves, and clears through a storage-like backend', () => {
  const values = new Map();
  const backend = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const storage = createStorage(backend, 'resume');

  assert.deepEqual(storage.load(), { ok: true, value: null });
  assert.deepEqual(storage.save('content'), { ok: true });
  assert.deepEqual(storage.load(), { ok: true, value: 'content' });
  assert.deepEqual(storage.clear(), { ok: true });
  assert.deepEqual(storage.load(), { ok: true, value: null });
});

test('converts storage exceptions into non-throwing results', () => {
  const error = new Error('blocked');
  const backend = {
    getItem() { throw error; },
    setItem() { throw error; },
    removeItem() { throw error; },
  };
  const storage = createStorage(backend, 'resume');

  assert.equal(storage.load().ok, false);
  assert.equal(storage.save('content').ok, false);
  assert.equal(storage.clear().ok, false);
});
