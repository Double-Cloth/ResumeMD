const test = require('node:test');
const assert = require('node:assert/strict');

const { parseFrontMatter } = require('../js/frontmatter.js');

test('parses a leading front matter block and returns the remaining body', () => {
  const source = [
    '---',
    'name: 张同学',
    'title: "软件开发实习生"',
    'email: example@example.com',
    '---',
    '',
    '## 教育背景',
  ].join('\n');

  const result = parseFrontMatter(source);

  assert.deepEqual(result.data, {
    name: '张同学',
    title: '软件开发实习生',
    email: 'example@example.com',
  });
  assert.equal(result.body, '## 教育背景');
  assert.deepEqual(result.errors, []);
});

test('treats a document without front matter as body text', () => {
  const result = parseFrontMatter('## 项目经历\n\n- 完成项目');

  assert.deepEqual(result.data, {});
  assert.equal(result.body, '## 项目经历\n\n- 完成项目');
  assert.deepEqual(result.errors, []);
});

test('removes a UTF-8 BOM before parsing', () => {
  const result = parseFrontMatter('\uFEFF---\nname: DC\n---\n正文');

  assert.equal(result.data.name, 'DC');
  assert.equal(result.body, '正文');
});

test('reports malformed front matter lines while keeping valid fields', () => {
  const source = '---\nname: DC\nthis is invalid\nwebsite: example.com\n---\n正文';
  const result = parseFrontMatter(source);

  assert.equal(result.data.name, 'DC');
  assert.equal(result.data.website, 'example.com');
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /第 3 行/);
});

test('unquotes single-quoted values and unescapes matching quote characters', () => {
  const source = "---\nname: 'D\\'C'\ntitle: \"Web \\\"Engineer\\\"\"\n---\n正文";
  const result = parseFrontMatter(source);

  assert.equal(result.data.name, "D'C");
  assert.equal(result.data.title, 'Web "Engineer"');
});

test('reports a missing closing delimiter and preserves the full document as body', () => {
  const source = '---\nname: DC\n## 教育背景';
  const result = parseFrontMatter(source);

  assert.deepEqual(result.data, {});
  assert.equal(result.body, source);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /缺少结束分隔线/);
});
