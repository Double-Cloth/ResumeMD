const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function cssBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(escaped + '\\s*\\{([\\s\\S]*?)\\}'));
  return match ? match[1] : '';
}

test('index provides the editor, preview, toolbar actions, and embedded example', () => {
  const html = read('index.html');

  assert.match(html, /id="markdown-editor"/);
  assert.match(html, /id="resume-preview"/);
  assert.match(html, /id="import-button"/);
  assert.match(html, /id="export-button"/);
  assert.match(html, /id="print-button"/);
  assert.match(html, /id="snippet-select"/);
  assert.match(html, /id="clear-button"/);
  assert.match(html, /id="resume-stats"/);
  assert.match(html, /id="zoom-select"/);
  assert.match(html, /id="page-count"/);
  assert.match(html, /id="example-source" type="text\/plain"/);
  assert.doesNotMatch(html, /`r`n/);
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
    'js/assist.js',
    'js/print.js',
    'js/pagination.js',
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

test('preview and print use the same fixed A4 page box', () => {
  const resumeCSS = read('css/resume.css');
  const printCSS = read('css/print.css');
  const previewPaper = cssBlock(resumeCSS, '.resume-paper');
  const printPaper = cssBlock(printCSS, '.resume-paper');

  assert.match(previewPaper, /width:\s*210mm/);
  assert.match(previewPaper, /min-height:\s*297mm/);
  assert.match(previewPaper, /padding:\s*13\.5mm 17mm 15\.5mm/);
  assert.doesNotMatch(previewPaper, /calc\(100%|max-width:\s*100%/);
  assert.match(printPaper, /padding:\s*13\.5mm 17mm 15\.5mm/);
});

test('dark preview select keeps native dropdown options readable', () => {
  const css = read('css/app.css');

  assert.match(css, /\.compact-select-dark\s+option\s*\{[\s\S]*?background:\s*#fff/);
  assert.match(css, /\.compact-select-dark\s+option\s*\{[\s\S]*?color:\s*#172033/);
});

test('print stylesheet removes the preview-only gap between A4 pages', () => {
  const printCSS = read('css/print.css');
  const followingPaper = cssBlock(printCSS, '.resume-paper + .resume-paper');

  assert.match(followingPaper, /margin-top:\s*0/);
});

test('preview is a paginated resume document instead of one continuous paper', () => {
  const html = read('index.html');
  const css = read('css/resume.css');
  const printCSS = read('css/print.css');

  assert.match(html, /class="resume-document"[^>]+id="resume-preview"/);
  assert.match(css, /\.resume-document\s*\{/);
  assert.match(css, /\.resume-paper\s*\+\s*\.resume-paper/);
  assert.match(printCSS, /\.resume-paper\s*\{[\s\S]*?break-after:\s*page/);
});

test('app runtime guards localStorage, counts Unicode characters, and refreshes before printing', () => {
  const app = read('js/app.js');

  assert.match(app, /function getStorageBackend\(\)/);
  assert.match(app, /api\.createStorage\(getStorageBackend\(\), 'resumemd\.source\.v1'\)/);
  assert.match(app, /api\.makeResumeStats\(source, pages\.length\)/);
  assert.match(app, /loaded\.value !== null/);
  assert.match(app, /renderDocument\(\);\s*const frontMatter = api\.parseFrontMatter\(editor\.value\);/);
});

test('resume styles no longer include removed basic-info or old header-right layout selectors', () => {
  const css = read('css/resume.css') + '\n' + read('css/print.css');

  assert.doesNotMatch(css, /\.resume-basic-info\b/);
  assert.doesNotMatch(css, /\.basic-info-/);
  assert.doesNotMatch(css, /\.resume-header-right\b/);
});

test('runtime files contain no external dependency or fetch call', () => {
  const runtime = [
    read('index.html'),
    read('css/app.css'),
    read('css/resume.css'),
    read('css/print.css'),
    read('js/print.js'),
    read('js/assist.js'),
    read('js/app.js'),
  ].join('\n');

  assert.doesNotMatch(runtime, /<script[^>]+src="https?:\/\//i);
  assert.doesNotMatch(runtime, /@import\s+url\(\s*["']?https?:\/\//i);
  assert.doesNotMatch(runtime, /\bfetch\s*\(/);
});
