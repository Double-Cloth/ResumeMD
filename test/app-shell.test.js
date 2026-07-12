const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('index provides the editor, preview, toolbar actions, and embedded example', () => {
  const html = read('index.html');

  assert.match(html, /id="markdown-editor"/);
  assert.match(html, /id="resume-preview"/);
  assert.match(html, /id="import-button"/);
  assert.match(html, /id="export-button"/);
  assert.match(html, /id="print-button"/);
  assert.match(html, /id="example-source" type="text\/plain"/);
  assert.match(html, /href="favicon\.svg"/);
  assert.ok(fs.existsSync(path.join(root, 'favicon.svg')));
});

test('classic scripts load in dependency order and avoid ES modules', () => {
  const html = read('index.html');
  const expectedOrder = [
    'js/frontmatter.js',
    'js/markdown.js',
    'js/renderer.js',
    'js/storage.js',
    'js/file.js',
    'js/print.js',
    'js/app.js',
  ];
  const positions = expectedOrder.map((source) => html.indexOf('src="' + source + '"'));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.doesNotMatch(html, /type="module"/);
});

test('editor grid reserves the remaining height for the textarea', () => {
  const css = read('css/app.css');

  assert.match(css, /grid-template-rows:\s*auto auto minmax\(0, 1fr\) 40px/);
  assert.match(css, /#markdown-editor\s*\{[\s\S]*?grid-row:\s*3/);
  assert.match(css, /\.editor-footer\s*\{[\s\S]*?grid-row:\s*4/);
});

test('print stylesheet isolates an A4 resume page', () => {
  const html = read('index.html');
  const css = read('css/print.css');

  assert.match(html, /<link id="resume-styles" rel="stylesheet" href="css\/resume\.css">/);
  assert.match(html, /<link id="print-styles" rel="stylesheet" href="css\/print\.css" media="print">/);
  assert.match(css, /@page\s*{[^}]*size:\s*A4/);
  assert.match(css, /\.app-header[\s\S]*display:\s*none/);
  assert.match(css, /\*,[\s\S]*box-sizing:\s*border-box/);
  assert.match(css, /\.resume-paper[\s\S]*width:\s*210mm/);
  assert.match(css, /\.resume-paper[\s\S]*min-height:\s*297mm/);
  assert.match(css, /\.workspace,[\s\S]*\.preview-pane,[\s\S]*display:\s*block\s*!important/);
});

test('runtime files contain no external dependency or fetch call', () => {
  const runtime = [
    read('index.html'),
    read('css/app.css'),
    read('css/resume.css'),
    read('css/print.css'),
    read('js/print.js'),
    read('js/app.js'),
  ].join('\n');

  assert.doesNotMatch(runtime, /<script[^>]+src="https?:\/\//i);
  assert.doesNotMatch(runtime, /@import\s+url\(\s*["']?https?:\/\//i);
  assert.doesNotMatch(runtime, /\bfetch\s*\(/);
});
