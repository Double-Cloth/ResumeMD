const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseMarkdown,
  renderBlocks,
  renderInline,
  sanitizeURL,
} = require('../js/markdown.js');

test('parses headings, paragraphs, horizontal rules, and compact lists', () => {
  const source = [
    '## 项目经历',
    '',
    '第一行',
    '第二行',
    '',
    '- 条目一',
    '- 条目二',
    '',
    '1. 第一步',
    '2. 第二步',
    '',
    '---',
  ].join('\n');

  const blocks = parseMarkdown(source);

  assert.deepEqual(blocks, [
    { type: 'heading', level: 2, text: '项目经历' },
    { type: 'paragraph', text: '第一行 第二行' },
    { type: 'list', ordered: false, items: ['条目一', '条目二'] },
    { type: 'list', ordered: true, items: ['第一步', '第二步'] },
    { type: 'hr' },
  ]);
});

test('renders supported inline formatting and escapes raw HTML', () => {
  const html = renderInline('**粗体**、*斜体*、`代码`、[主页](https://example.com) <script>alert(1)</script>');

  assert.equal(
    html,
    '<strong>粗体</strong>、<em>斜体</em>、<code>代码</code>、<a href="https://example.com" target="_blank" rel="noopener noreferrer">主页</a> &lt;script&gt;alert(1)&lt;/script&gt;'
  );
});

test('keeps malformed inline syntax as escaped text', () => {
  assert.equal(renderInline('未闭合 **粗体 <b>'), '未闭合 **粗体 &lt;b&gt;');
});

test('rejects dangerous link protocols and keeps the label as text', () => {
  assert.equal(renderInline('[危险](javascript:alert(1))'), '危险');
  assert.equal(sanitizeURL('javascript:alert(1)'), null);
  assert.equal(sanitizeURL('data:text/html,boom'), null);
});

test('allows web, mail, phone, anchor, and safe relative URLs', () => {
  assert.equal(sanitizeURL('https://example.com/a b'), 'https://example.com/a%20b');
  assert.equal(sanitizeURL('mailto:test@example.com'), 'mailto:test@example.com');
  assert.equal(sanitizeURL('tel:+8613800000000'), 'tel:+8613800000000');
  assert.equal(sanitizeURL('#skills'), '#skills');
  assert.equal(sanitizeURL('./portfolio.html'), './portfolio.html');
});

test('pairs a level-three heading with a following inline-code-only date', () => {
  const blocks = parseMarkdown('### Whalgebra｜独立开发者\n\n`2022.01 - 至今`\n\n- 完成离线计算器');
  const html = renderBlocks(blocks);

  assert.match(html, /<div class="resume-entry-heading">/);
  assert.match(html, /<h3>Whalgebra｜独立开发者<\/h3>/);
  assert.match(html, /<time>2022\.01 - 至今<\/time>/);
  assert.doesNotMatch(html, /<p><code>2022\.01 - 至今<\/code><\/p>/);
});

test('renders semantic block markup', () => {
  const html = renderBlocks([
    { type: 'heading', level: 2, text: '教育背景' },
    { type: 'paragraph', text: '主修 **软件工程**' },
    { type: 'list', ordered: false, items: ['数据结构', '操作系统'] },
    { type: 'hr' },
  ]);

  assert.equal(
    html,
    '<section class="resume-section"><h2>教育背景</h2><p>主修 <strong>软件工程</strong></p><ul><li>数据结构</li><li>操作系统</li></ul></section><hr>'
  );
});

test('escapes heading and list content', () => {
  const html = renderBlocks(parseMarkdown('## <img src=x onerror=alert(1)>\n\n- <svg onload=alert(1)>'));

  assert.doesNotMatch(html, /<img|<svg/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;svg/);
});
