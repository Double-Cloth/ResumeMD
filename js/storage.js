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

    return {
      load: function () {
        try {
          return { ok: true, value: backend ? backend.getItem(storageKey) : null };
        } catch (error) {
          return { ok: false, value: null, error: error };
        }
      },
      save: function (value) {
        try {
          if (backend) {
            backend.setItem(storageKey, String(value));
          }
          return { ok: true };
        } catch (error) {
          return { ok: false, error: error };
        }
      },
      clear: function () {
        try {
          if (backend) {
            backend.removeItem(storageKey);
          }
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
