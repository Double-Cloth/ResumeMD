(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createStorage(backend, key) {
    const storageKey = String(key || 'resumemd.source.v1');
    const unavailableError = backend ? null : new Error('Storage backend is unavailable.');

    return {
      load: function () {
        if (!backend) {
          return { ok: false, value: null, error: unavailableError };
        }

        try {
          return { ok: true, value: backend.getItem(storageKey) };
        } catch (error) {
          return { ok: false, value: null, error: error };
        }
      },
      save: function (value) {
        if (!backend) {
          return { ok: false, error: unavailableError };
        }

        try {
          backend.setItem(storageKey, String(value));
          return { ok: true };
        } catch (error) {
          return { ok: false, error: error };
        }
      },
      clear: function () {
        if (!backend) {
          return { ok: false, error: unavailableError };
        }

        try {
          backend.removeItem(storageKey);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: error };
        }
      },
    };
  }

  return {
    createStorage: createStorage,
  };
});
