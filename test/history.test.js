const test = require('node:test');
const assert = require('node:assert/strict');

const { createDraftHistory } = require('../js/history.js');
const { createStorage } = require('../js/storage.js');

function makeBackend() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test('stores one recoverable draft snapshot', () => {
  const history = createDraftHistory(createStorage(makeBackend(), 'backup'));

  assert.deepEqual(history.peek(), { ok: true, available: false, value: null });
  assert.deepEqual(history.snapshot('第一份草稿'), { ok: true });
  assert.deepEqual(history.peek(), { ok: true, available: true, value: '第一份草稿' });
});

test('restores the previous draft and keeps the current draft as the next snapshot', () => {
  const history = createDraftHistory(createStorage(makeBackend(), 'backup'));
  history.snapshot('替换前');

  const restored = history.restore('替换后');

  assert.deepEqual(restored, { ok: true, available: true, value: '替换前' });
  assert.deepEqual(history.peek(), { ok: true, available: true, value: '替换后' });
});

test('does not report a recovery point when storage is unavailable', () => {
  const history = createDraftHistory(createStorage(null, 'backup'));

  assert.equal(history.peek().ok, false);
  assert.equal(history.snapshot('草稿').ok, false);
  assert.equal(history.restore('当前内容').ok, false);
});

test('does not restore when saving the current draft fails', () => {
  let reads = 0;
  const storage = {
    load() {
      reads += 1;
      return { ok: true, value: '替换前' };
    },
    save() {
      return { ok: false, error: new Error('quota') };
    },
  };
  const history = createDraftHistory(storage);

  const result = history.restore('替换后');

  assert.equal(reads, 1);
  assert.equal(result.ok, false);
  assert.equal(result.value, null);
});
