const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPrintDocument,
  collectStyleText,
  makePrintTitle,
} = require('../js/print.js');

test('creates a safe standalone A4 print document', () => {
  const html = buildPrintDocument({
    title: 'DC <前端>',
    resumeHTML: '<header class="resume-header"><h1>DC</h1></header>',
    styles: '.resume-paper { width: 210mm; }',
    stylesheetURLs: ['file:///project/css/resume.css'],
  });

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<title>DC &lt;前端&gt;-简历<\/title>/);
  assert.match(html, /<style>\.resume-paper \{ width: 210mm; \}<\/style>/);
  assert.match(html, /href="file:\/\/\/project\/css\/resume\.css"/);
  assert.match(html, /<article class="resume-paper">/);
  assert.match(html, /<h1>DC<\/h1>/);
  assert.doesNotMatch(html, /app-shell|markdown-editor/);
});

test('prints paginated preview pages without nesting another paper', () => {
  const html = buildPrintDocument({
    resumeHTML: '<article class="resume-paper"><p>第一页</p></article><article class="resume-paper"><p>第二页</p></article>',
    styles: '.resume-paper { width: 210mm; }',
  });

  assert.match(html, /<main class="resume-document">/);
  assert.equal((html.match(/class="resume-paper"/g) || []).length, 2);
  assert.doesNotMatch(html, /<article class="resume-paper"><article class="resume-paper"/);
});

test('collects readable CSS rules from selected stylesheets only', () => {
  const fakeDocument = {
    styleSheets: [
      {
        ownerNode: { id: 'resume-styles' },
        cssRules: [{ cssText: '.resume-paper { color: #111; }' }],
      },
      {
        ownerNode: { id: 'app-styles' },
        cssRules: [{ cssText: '.app-shell { display: grid; }' }],
      },
      {
        ownerNode: { id: 'print-styles' },
        cssRules: [{ cssText: '@page { size: A4; }' }],
      },
    ],
  };

  assert.equal(
    collectStyleText(fakeDocument, ['resume-styles', 'print-styles']),
    '.resume-paper { color: #111; }\n@page { size: A4; }'
  );
});

test('creates a useful default PDF filename title', () => {
  assert.equal(makePrintTitle(' 童同学 '), '童同学-简历');
  assert.equal(makePrintTitle(''), '简历');
});
