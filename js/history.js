(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createDraftHistory(storage) {
    function unavailable(error) {
      return {
        ok: false,
        available: false,
        value: null,
        error: error || new Error('Draft history is unavailable.'),
      };
    }

    return {
      peek: function () {
        if (!storage || typeof storage.load !== 'function') {
          return unavailable();
        }

        const result = storage.load();
        if (!result.ok) {
          return unavailable(result.error);
        }

        return {
          ok: true,
          available: result.value !== null,
          value: result.value,
        };
      },

      snapshot: function (source) {
        if (!storage || typeof storage.save !== 'function') {
          return unavailable();
        }

        return storage.save(String(source == null ? '' : source));
      },

      restore: function (currentSource) {
        const previous = this.peek();
        if (!previous.ok || !previous.available) {
          return unavailable(previous.error || new Error('No previous draft is available.'));
        }

        const savedCurrent = this.snapshot(currentSource);
        if (!savedCurrent.ok) {
          return unavailable(savedCurrent.error);
        }

        return {
          ok: true,
          available: true,
          value: previous.value,
        };
      },
    };
  }

  return {
    createDraftHistory: createDraftHistory,
  };
});
