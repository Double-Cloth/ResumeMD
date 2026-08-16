const test = require('node:test');
const assert = require('node:assert/strict');

const { highlightMarkdown } = require('../js/highlight.js');

test('highlights Front Matter fields, headings, and list markers', () => {
  const html = highlightMarkdown([
    '---',
    'name: 示例用户',
    'website: https://example.com',
    '---',
    '## 项目经历',
    '- 项目描述',
  ].join('\n'));

  assert.match(html, /md-token-frontmatter-delimiter/);
  assert.match(html, /md-token-frontmatter-key">name/);
  assert.match(html, /md-token-heading-marker">##/);
  assert.match(html, /md-token-heading">项目经历/);
  assert.match(html, /md-token-list-marker">-/);
});

test('highlights inline Markdown without changing its text', () => {
  const source = '**重点**、*强调*、`代码` 和 [链接](https://example.com)';
  const html = highlightMarkdown(source);

  assert.match(html, /md-token-strong">重点/);
  assert.match(html, /md-token-emphasis">强调/);
  assert.match(html, /md-token-code">代码/);
  assert.match(html, /md-token-link-text">链接/);
  assert.match(html, /md-token-link-url">https:\/\/example\.com/);
});

test('escapes user HTML before adding syntax markup', () => {
  const html = highlightMarkdown('## <script>alert("x")</script>');

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
});
