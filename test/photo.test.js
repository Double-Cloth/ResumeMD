const test = require('node:test');
const assert = require('node:assert/strict');

const {
  makePortablePhotoSource,
  migrateInlinePhotoSource,
  prepareUploadedPhotoSource,
  setFrontMatterField,
} = require('../js/photo.js');

const dataURL = 'data:image/png;base64,iVBORw0KGgo=';

function makeStorage(result) {
  return {
    savedValue: null,
    save(value) {
      this.savedValue = value;
      return result;
    },
  };
}

test('updates or creates a photo field in Front Matter', () => {
  assert.equal(
    setFrontMatterField('---\nname: 示例用户\n---\n正文', 'photo', 'resumemd-photo'),
    '---\nname: 示例用户\nphoto: resumemd-photo\n---\n正文'
  );
  assert.equal(
    setFrontMatterField('正文', 'photo', 'photo.png'),
    '---\nphoto: photo.png\n---\n\n正文'
  );
});

test('migrates an inline photo only after separate storage succeeds', () => {
  const storage = makeStorage({ ok: true });
  const result = migrateInlinePhotoSource(
    '---\nname: 示例用户\nphoto: ' + dataURL + '\n---\n正文',
    storage,
    'resumemd-photo'
  );

  assert.equal(result.migrated, true);
  assert.equal(storage.savedValue, dataURL);
  assert.match(result.source, /photo: resumemd-photo/);
  assert.doesNotMatch(result.source, /photo: data:image/);
});

test('keeps the original inline photo source when separate storage fails', () => {
  const source = '\uFEFF---\r\nname: 示例用户\r\nphoto: ' + dataURL + '\r\n---\r\n正文';
  const storage = makeStorage({ ok: false, error: new Error('quota') });
  const result = migrateInlinePhotoSource(source, storage, 'resumemd-photo');

  assert.equal(result.migrated, false);
  assert.equal(result.source, source);
  assert.equal(result.photoDataURL, dataURL);
});

test('keeps a newly uploaded photo portable when separate storage fails', () => {
  const storage = makeStorage({ ok: false, error: new Error('blocked') });
  const result = prepareUploadedPhotoSource(
    '---\nname: 示例用户\nphoto: old.png\n---\n正文',
    dataURL,
    storage,
    'resumemd-photo'
  );

  assert.equal(result.persisted, false);
  assert.match(result.source, new RegExp('photo: ' + dataURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(result.source, /photo: resumemd-photo/);
});

test('uses the compact photo reference when upload storage succeeds', () => {
  const storage = makeStorage({ ok: true });
  const result = prepareUploadedPhotoSource('', dataURL, storage, 'resumemd-photo');

  assert.equal(result.persisted, true);
  assert.match(result.source, /photo: resumemd-photo/);
});

test('embeds a stored photo when creating a portable export', () => {
  const source = '---\nname: 示例用户\nphoto: resumemd-photo\n---\n正文';
  const result = makePortablePhotoSource(source, dataURL, 'resumemd-photo');

  assert.match(result, new RegExp('photo: ' + dataURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(result, /photo: resumemd-photo/);
  assert.equal(makePortablePhotoSource(source, 'invalid', 'resumemd-photo'), source);
  assert.equal(makePortablePhotoSource(source.replace('resumemd-photo', 'photo.png'), dataURL, 'resumemd-photo'), source.replace('resumemd-photo', 'photo.png'));
});
