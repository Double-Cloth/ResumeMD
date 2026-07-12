const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildResumeHTML,
  makeExportFilename,
  normalizePhotoURL,
  normalizeWebsite,
} = require('../js/renderer.js');

test('renders a semantic resume header with inline contact details, highlights, photo, and body', () => {
  const html = buildResumeHTML(
    {
      name: '张同学',
      title: '软件开发实习生',
      photo: 'dist/photo.jpg',
      phone: '138 0000 0000',
      email: 'resume@example.com',
      location: '上海',
      website: 'github.com/example',
      education: '本科在读',
      experience: '3 年项目经验',
    },
    '<section class="resume-section"><h2>教育背景</h2></section>'
  );

  assert.match(html, /<header class="resume-header">/);
  assert.match(html, /<div class="resume-header-main">/);
  assert.match(html, /<div class="resume-identity">/);
  assert.match(html, /<h1>张同学<\/h1>/);
  assert.match(html, /<p class="resume-title">软件开发实习生<\/p>/);
  assert.match(html, /<div class="resume-photo-block"><img class="resume-photo" src="dist\/photo\.jpg" alt="张同学"><\/div>/);
  assert.match(html, /<div class="resume-contact-list">/);
  assert.match(html, /<div class="resume-highlight-list"><span>本科在读<\/span><span>3 年项目经验<\/span><\/div>/);
  assert.match(html, /<a class="resume-contact-item" href="tel:138%200000%200000"/);
  assert.match(html, /<a class="resume-contact-item" href="mailto:resume@example.com"/);
  assert.match(html, /<span class="resume-contact-item">/);
  assert.match(html, /<a class="resume-contact-item" href="https:\/\/github.com\/example"/);
  assert.match(html, />138 0000 0000<\/span><\/a>/);
  assert.match(html, />resume@example\.com<\/span><\/a>/);
  assert.match(html, />上海<\/span><\/span>/);
  assert.match(html, />github\.com\/example<\/span><\/a>/);
  assert.match(html, />最高学历：本科在读<\/span><\/span>/);
  assert.match(html, />相关经验：3 年项目经验<\/span><\/span>/);
  assert.doesNotMatch(html, /resume-header-right/);
  assert.doesNotMatch(html, /resume-basic-info/);
  assert.doesNotMatch(html, /basic-info-/);
  assert.match(html, /href="tel:138%200000%200000"/);
  assert.match(html, /href="mailto:resume@example.com"/);
  assert.match(html, /href="https:\/\/github.com\/example"/);
  assert.equal((html.match(/>resume@example\.com</g) || []).length, 1);
  assert.equal((html.match(/>138 0000 0000</g) || []).length, 1);
  assert.equal((html.match(/>github\.com\/example</g) || []).length, 1);
  assert.match(html, /<main class="resume-body">/);
  assert.match(html, /<h2>教育背景<\/h2>/);
});

test('omits empty profile fields instead of rendering placeholders', () => {
  const html = buildResumeHTML({ name: 'DC', title: '', phone: '', email: '' }, '<p>正文</p>');

  assert.match(html, /<h1>DC<\/h1>/);
  assert.doesNotMatch(html, /resume-title/);
  assert.doesNotMatch(html, /resume-highlight-list/);
  assert.doesNotMatch(html, /resume-contact-list/);
  assert.doesNotMatch(html, /resume-basic-info/);
  assert.doesNotMatch(html, /basic-info-item/);
});

test('renders optional profile fields inline only when supplied', () => {
  const html = buildResumeHTML(
    {
      name: 'DC',
      gender: '男',
      age: '20',
    },
    ''
  );

  assert.match(html, /<span class="resume-contact-item"><span>性别：男<\/span><\/span>/);
  assert.match(html, /<span class="resume-contact-item"><span>年龄：20<\/span><\/span>/);
  assert.doesNotMatch(html, /basic-info-/);
  assert.doesNotMatch(html, />电话<\/span>/);
});

test('escapes every profile value', () => {
  const html = buildResumeHTML(
    {
      name: '<img src=x onerror=alert(1)>',
      title: '<script>alert(1)</script>',
      location: '<b>上海</b>',
    },
    '<p>已由 Markdown 渲染器处理</p>'
  );

  assert.doesNotMatch(html, /<img|<script|<b>/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script/);
  assert.match(html, /&lt;b&gt;上海/);
});

test('rejects unsafe website schemes', () => {
  const html = buildResumeHTML({ name: 'DC', website: 'javascript:alert(1)' }, '');

  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /resume-contact-item/);
});

test('renders only safe local photo paths', () => {
  const safeHTML = buildResumeHTML({ name: 'DC', photo: './dist/photo.webp' }, '');
  const unsafeHTML = buildResumeHTML({ name: 'DC', photo: 'javascript:alert(1)' }, '');
  const remoteHTML = buildResumeHTML({ name: 'DC', photo: 'https://example.com/photo.jpg' }, '');

  assert.match(safeHTML, /<img class="resume-photo" src="\.\/dist\/photo\.webp" alt="DC">/);
  assert.doesNotMatch(unsafeHTML, /resume-photo/);
  assert.doesNotMatch(unsafeHTML, /javascript:/i);
  assert.doesNotMatch(remoteHTML, /resume-photo/);
});

test('normalizes safe photo paths and rejects unsafe or non-image paths', () => {
  assert.equal(normalizePhotoURL('dist/photo.jpg'), 'dist/photo.jpg');
  assert.equal(normalizePhotoURL('./photo.png'), './photo.png');
  assert.equal(normalizePhotoURL('../assets/photo.webp'), '../assets/photo.webp');
  assert.equal(normalizePhotoURL('/images/photo.jpeg'), '/images/photo.jpeg');
  assert.equal(normalizePhotoURL('javascript:alert(1)'), null);
  assert.equal(normalizePhotoURL('data:image/png;base64,abc'), null);
  assert.equal(normalizePhotoURL('file:///C:/photo.jpg'), null);
  assert.equal(normalizePhotoURL('//example.com/photo.jpg'), null);
  assert.equal(normalizePhotoURL('dist/photo.svg'), null);
  assert.equal(normalizePhotoURL('dist/resume.pdf'), null);
});

test('normalizes web addresses while preserving explicit HTTP or HTTPS', () => {
  assert.deepEqual(normalizeWebsite('github.com/example'), {
    href: 'https://github.com/example',
    label: 'github.com/example',
  });
  assert.deepEqual(normalizeWebsite('http://example.com/'), {
    href: 'http://example.com/',
    label: 'example.com',
  });
  assert.equal(normalizeWebsite('mailto:test@example.com'), null);
});

test('creates a filesystem-safe Markdown filename', () => {
  assert.equal(makeExportFilename('张同学'), '张同学-简历.md');
  assert.equal(makeExportFilename('DC / Frontend:*?'), 'DC-Frontend-简历.md');
  assert.equal(makeExportFilename('   '), 'resume.md');
});
