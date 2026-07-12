const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getSnippetTemplate,
  insertSnippet,
  makeResumeStats,
} = require('../js/assist.js');

test('counts characters, words, sections, and pages from resume source', () => {
  const source = [
    '---',
    'name: 童同学',
    '---',
    '',
    '## 教育背景',
    '',
    '- GPA 4.7',
    '',
    '## 项目经历',
    '',
    '- 使用 JavaScript 完成 Markdown Resume',
  ].join('\n');

  assert.deepEqual(makeResumeStats(source, 2), {
    characters: 82,
    words: 22,
    sections: 2,
    pages: 2,
  });
});

test('returns practical markdown snippet templates', () => {
  assert.match(getSnippetTemplate('profile'), /^---\nname: /);
  assert.match(getSnippetTemplate('education'), /## 教育背景/);
  assert.match(getSnippetTemplate('experience'), /### 公司名称｜岗位名称/);
  assert.match(getSnippetTemplate('project'), /## 项目经历/);
  assert.match(getSnippetTemplate('skills'), /## 技能特长/);
  assert.equal(getSnippetTemplate('unknown'), '');
});

test('inserts snippets with safe spacing around the selection', () => {
  const result = insertSnippet('## 教育背景\n\n旧内容', 9, 12, '新内容');

  assert.equal(result.value, '## 教育背景\n\n新内容\n');
  assert.equal(result.selectionStart, 9);
  assert.equal(result.selectionEnd, 12);
});

test('inserts snippets into empty documents without extra leading blank lines', () => {
  const result = insertSnippet('', 0, 0, '## 技能特长\n\n- JavaScript');

  assert.equal(result.value, '## 技能特长\n\n- JavaScript\n');
  assert.equal(result.selectionStart, 0);
  assert.equal(result.selectionEnd, 21);
});
