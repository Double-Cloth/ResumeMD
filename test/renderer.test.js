const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildResumeHTML,
  makeExportFilename,
  normalizeWebsite,
} = require('../js/renderer.js');

test('renders a semantic resume header, basic information section, and body', () => {
  const html = buildResumeHTML(
    {
      name: '张同学',
      title: '软件开发实习生',
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
  assert.match(html, /<div class="resume-header-right"><div class="resume-highlight-list"><span>本科在读<\/span><span>3 年项目经验<\/span><\/div><\/div>/);
 assert.match(html, /<div class="resume-contact-list">/);
  assert.match(html, /<a class="resume-contact-item" href="tel:138%200000%200000"/);
  assert.match(html, /<a class="resume-contact-item" href="mailto:resume@example.com"/);
  assert.match(html, /<span class="resume-contact-item">/);
  assert.match(html, /<a class="resume-contact-item" href="https:\/\/github.com\/example"/);
  assert.match(html, />138 0000 0000<\/span><\/a>/);
  assert.match(html, />resume@example\.com<\/span><\/a>/);
  assert.match(html, />上海<\/span><\/span>/);
  assert.match(html, />github\.com\/example<\/span><\/a>/);
  assert.match(html, /<section class="resume-section resume-basic-info"/);
  assert.match(html, /<h2 id="resume-basic-info-title">基本信息<\/h2>/);
  assert.doesNotMatch(html, /<span class="basic-info-label">电话<\/span>/);
  assert.doesNotMatch(html, /<span class="basic-info-label">邮箱<\/span>/);
  assert.doesNotMatch(html, /<span class="basic-info-label">所在地<\/span>/);
  assert.doesNotMatch(html, /<span class="basic-info-label">个人主页<\/span>/);
  assert.match(html, /<span class="basic-info-label">最高学历<\/span>/);
  assert.match(html, /<span class="basic-info-label">相关经验<\/span>/);
  assert.match(html, /href="tel:138%200000%200000"/);
  assert.match(html, /href="mailto:resume@example.com"/);
  assert.match(html, /href="https:\/\/github.com\/example"/);
  assert.equal((html.match(/>resume@example\.com</g) || []).length, 1);
  assert.equal((html.match(/>138 0000 0000</g) || []).length, 1);
  assert.equal((html.match(/>github\.com\/example</g) || []).length, 1);
  assert.doesNotMatch(html, /<span class="basic-info-value">上海<\/span>/);
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

test('renders optional basic information fields only when supplied', () => {
  const html = buildResumeHTML(
    {
      name: 'DC',
      gender: '男',
      age: '20',
    },
    ''
  );

  assert.match(html, /<span class="basic-info-label">性别<\/span>/);
  assert.match(html, /<span class="basic-info-value">男<\/span>/);
  assert.match(html, /<span class="basic-info-label">年龄<\/span>/);
  assert.match(html, /<span class="basic-info-value">20<\/span>/);
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
