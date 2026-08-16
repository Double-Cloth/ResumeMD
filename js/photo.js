(function (root, factory) {
  const frontmatter = typeof module === 'object' && module.exports
    ? require('./frontmatter.js')
    : root.ResumeMD;
  const api = factory(frontmatter);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (frontmatter) {
  'use strict';

  function isPhotoDataURL(value) {
    return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(String(value || '').trim());
  }

  function setFrontMatterField(source, key, value) {
    const normalized = String(source == null ? '' : source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');
    const field = String(key || '').trim();
    const nextLine = field + ': ' + String(value == null ? '' : value);

    if (!field) {
      return normalized;
    }

    if (lines[0] !== '---') {
      return ['---', nextLine, '---', '', normalized.replace(/^\n+/, '')].join('\n');
    }

    const closingIndex = lines.findIndex(function (line, index) {
      return index > 0 && line === '---';
    });

    if (closingIndex === -1) {
      return ['---', nextLine, '---', '', normalized].join('\n');
    }

    const fieldPattern = new RegExp('^\\s*' + field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:');
    for (let index = 1; index < closingIndex; index += 1) {
      if (fieldPattern.test(lines[index])) {
        lines[index] = nextLine;
        return lines.join('\n');
      }
    }

    lines.splice(closingIndex, 0, nextLine);
    return lines.join('\n');
  }

  function savePhoto(storage, dataURL) {
    if (!storage || typeof storage.save !== 'function') {
      return { ok: false, error: new Error('Photo storage is unavailable.') };
    }

    return storage.save(dataURL);
  }

  function migrateInlinePhotoSource(source, storage, reference) {
    const originalSource = String(source == null ? '' : source);
    const profile = frontmatter.parseFrontMatter(originalSource).data;
    const dataURL = String(profile.photo || '').trim();

    if (!isPhotoDataURL(dataURL)) {
      return {
        source: originalSource,
        photoDataURL: null,
        migrated: false,
        saveResult: null,
      };
    }

    const saveResult = savePhoto(storage, dataURL);
    return {
      source: saveResult.ok
        ? setFrontMatterField(originalSource, 'photo', reference)
        : originalSource,
      photoDataURL: dataURL,
      migrated: saveResult.ok,
      saveResult: saveResult,
    };
  }

  function prepareUploadedPhotoSource(source, dataURL, storage, reference) {
    const originalSource = String(source == null ? '' : source);
    const normalizedDataURL = String(dataURL || '').trim();

    if (!isPhotoDataURL(normalizedDataURL)) {
      return {
        source: originalSource,
        photoDataURL: null,
        persisted: false,
        saveResult: { ok: false, error: new Error('Invalid photo data URL.') },
      };
    }

    const saveResult = savePhoto(storage, normalizedDataURL);
    return {
      source: setFrontMatterField(
        originalSource,
        'photo',
        saveResult.ok ? reference : normalizedDataURL
      ),
      photoDataURL: normalizedDataURL,
      persisted: saveResult.ok,
      saveResult: saveResult,
    };
  }

  return {
    isPhotoDataURL: isPhotoDataURL,
    setFrontMatterField: setFrontMatterField,
    migrateInlinePhotoSource: migrateInlinePhotoSource,
    prepareUploadedPhotoSource: prepareUploadedPhotoSource,
  };
});
