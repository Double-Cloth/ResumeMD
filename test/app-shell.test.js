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

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

test('index provides the editor, preview, toolbar actions, and embedded example', () => {
  const html = read('index.html');

  assert.match(html, /id="markdown-editor"/);
  assert.match(html, /id="markdown-highlight"[^>]+aria-hidden="true"/);
  assert.match(html, /id="resume-preview"/);
  assert.match(html, /id="import-button"/);
  assert.match(html, /id="photo-button"/);
  assert.match(html, /id="photo-input"/);
  assert.match(html, /id="export-button"/);
  assert.match(html, /id="print-button"/);
  assert.match(html, /id="snippet-select"/);
  assert.match(html, /id="clear-button"/);
  assert.match(html, /id="undo-button"/);
  assert.match(html, /id="resume-stats"/);
  assert.match(html, /id="zoom-select"/);
  assert.match(html, /<option value="fit">适应宽度<\/option>/);
  assert.match(html, /id="page-count"/);
  assert.match(html, /id="editor-tab"[^>]+role="tab"[^>]+tabindex="0"/);
  assert.match(html, /id="preview-tab"[^>]+role="tab"[^>]+tabindex="-1"/);
  assert.match(html, /id="editor-panel"[^>]+role="tabpanel"[^>]+aria-labelledby="editor-tab editor-title"/);
  assert.match(html, /id="preview-panel"[^>]+role="tabpanel"[^>]+aria-labelledby="preview-tab preview-title"/);
  assert.match(html, /id="reset-button"[^>]+aria-label="恢复内置示例"/);
  assert.match(html, /id="clear-button"[^>]+aria-label="清空当前草稿"/);
  assert.match(html, /id="import-button"[^>]+aria-label="导入 Markdown"/);
  assert.match(html, /id="export-button"[^>]+aria-label="导出 Markdown"/);
  assert.match(html, /id="print-button"[^>]+aria-label="打印或导出 PDF"/);
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
    'js/highlight.js',
    'js/renderer.js',
    'js/storage.js',
    'js/history.js',
    'js/photo.js',
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
  assert.match(css, /\.editor-input-shell\s*\{[\s\S]*?grid-row:\s*3/);
  assert.match(css, /#markdown-editor,[\s\S]*?\.markdown-highlight\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.editor-footer\s*\{[\s\S]*?grid-row:\s*4/);
});

test('editor syntax highlight mirrors content and scrolling without replacing the textarea', () => {
  const html = read('index.html');
  const app = read('js/app.js');
  const css = read('css/app.css');

  assert.match(html, /js\/highlight\.js/);
  assert.match(app, /api\.highlightMarkdown\(editor\.value\)/);
  assert.match(app, /editorHighlightLayer\.scrollTop = editor\.scrollTop/);
  assert.match(app, /editor\.addEventListener\('scroll', syncEditorHighlightScroll\)/);
  assert.match(css, /#markdown-editor\s*\{[\s\S]*?-webkit-text-fill-color:\s*transparent/);
  assert.match(css, /\.markdown-highlight\s*\{[\s\S]*?pointer-events:\s*none/);
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

test('primary colors meet WCAG AA contrast for normal text', () => {
  const css = read('css/app.css');
  const accent = css.match(/--accent:\s*(#[0-9a-f]{6})/i)[1];
  const accentStrong = css.match(/--accent-strong:\s*(#[0-9a-f]{6})/i)[1];

  assert.ok(contrastRatio(accent, '#ffffff') >= 4.5);
  assert.ok(contrastRatio(accentStrong, '#ffffff') >= 4.5);
  assert.match(css, /outline:\s*3px solid var\(--accent\)/);
});

test('pagination splits oversized resume entries into continuation blocks', () => {
  const pagination = read('js/pagination.js');
  const css = read('css/resume.css');

  assert.match(pagination, /function appendEntry\(parent, entry, reopenParent\)/);
  assert.match(pagination, /child\.classList\.contains\('resume-entry'\)/);
  assert.match(pagination, /resume-entry-continuation/);
  assert.match(css, /\.resume-entry-continuation\s*{/);
});

test('app runtime guards localStorage, counts Unicode characters, and refreshes before printing', () => {
  const app = read('js/app.js');

  assert.match(app, /function getStorageBackend\(\)/);
  assert.match(app, /api\.createStorage\(getStorageBackend\(\), 'resumemd\.source\.v1'\)/);
  assert.match(app, /api\.createStorage\(getStorageBackend\(\), 'resumemd\.photo\.v1'\)/);
  assert.match(app, /api\.createStorage\(getStorageBackend\(\), 'resumemd\.source\.backup\.v1'\)/);
  assert.match(app, /draftHistory\.restore\(editor\.value\)/);
  assert.match(app, /function handleMobileTabKeydown\(event\)/);
  assert.match(app, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
  assert.match(app, /api\.makeResumeStats\(source, pages\.length\)/);
  assert.match(app, /api\.readImageFile\(file\)/);
  assert.match(app, /api\.prepareUploadedPhotoSource\(editor\.value, dataURL, photoStorage, photoReference\)/);
  assert.match(app, /api\.makePortablePhotoSource\(editor\.value, photoDataURL, photoReference\)/);
  assert.match(app, /function exportSource\(\)[\s\S]*try \{[\s\S]*api\.downloadMarkdown[\s\S]*catch \(error\)[\s\S]*Markdown 导出失败/);
  assert.match(app, /function migrateInlinePhoto\(source\)/);
  assert.doesNotMatch(app, /getElementsByClassName\('resume-contact-item'\)\[0\]/);
  assert.match(app, /loaded\.value !== null/);
  assert.match(app, /renderDocument\(\);\s*const frontMatter = api\.parseFrontMatter\(editor\.value\);/);
});

test('pending edits flush before the page is hidden or left', () => {
  const app = read('js/app.js');

  assert.match(app, /function flushPendingRender\(\)[\s\S]*if \(renderTimer\)[\s\S]*renderDocument\(\)/);
  assert.match(app, /window\.addEventListener\('pagehide', flushPendingRender\)/);
  assert.match(app, /document\.addEventListener\('visibilitychange',[\s\S]*document\.visibilityState === 'hidden'[\s\S]*flushPendingRender\(\)/);
});

test('responsive toolbar stays on one row and switches tablets to focused panes', () => {
  const css = read('css/app.css');

  assert.match(css, /@media \(max-width: 1080px\)/);
  assert.match(css, /\.toolbar\s*{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(css, /\.toolbar-button-primary\s*{[\s\S]*?flex:\s*0 0 auto/);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*?\.brand-copy\s*{[\s\S]*?display:\s*none/);
});

test('mobile preview defaults to a responsive fit-width zoom', () => {
  const app = read('js/app.js');
  const css = read('css/app.css');

  assert.match(app, /value === 'fit'/);
  assert.match(app, /availableWidth \/ pageWidth/);
  assert.match(app, /matchMedia\('\(max-width: 1080px\)'\)[\s\S]*zoomSelect\.value = 'fit'/);
  assert.match(app, /function setMobileView[\s\S]*!isEditor && zoomSelect\.value === 'fit'[\s\S]*setPreviewZoom\('fit'\)/);
  assert.match(app, /window\.addEventListener\('resize'/);
  assert.match(css, /\.resume-document\.is-fit-width\s*{[\s\S]*?zoom:\s*var\(--preview-scale/);
});

test('resume styles no longer include removed basic-info or old header-right layout selectors', () => {
  const css = read('css/resume.css') + '\n' + read('css/print.css');

  assert.doesNotMatch(css, /\.resume-basic-info\b/);
  assert.doesNotMatch(css, /\.basic-info-/);
  assert.doesNotMatch(css, /\.resume-header-right\b/);
});

test('resume header uses ordered identity, contact, qualification, detail, and photo regions', () => {
  const renderer = read('js/renderer.js');
  const css = read('css/resume.css');
  const app = read('js/app.js');

  assert.match(renderer, /resume-identity/);
  assert.match(renderer, /resume-contact-list/);
  assert.match(renderer, /resume-qualification-list/);
  assert.match(renderer, /resume-detail-list/);
  assert.match(renderer, /resume-header-has-photo/);
  assert.match(css, /\.resume-header-has-photo \.resume-header-main\s*{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 24mm/);
  assert.doesNotMatch(css, /--resume-header-rule-width/);
  assert.doesNotMatch(app, /createRange\(|syncHeaderRuleWidths|measureHeaderLineWidth/);
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

test('bundled photo references resolve to existing local files', () => {
  const files = ['README.md', 'index.html', 'examples/example-resume.md', 'js/assist.js'];

  files.forEach((relativePath) => {
    const source = read(relativePath);
    const references = Array.from(source.matchAll(/photo:\s*(?!data:|resumemd-photo)([^\s"'`]+)/g));

    references.forEach((match) => {
      const photoPath = path.resolve(root, match[1]);
      assert.ok(photoPath.startsWith(root + path.sep), relativePath + ' 包含工作区外的照片路径：' + match[1]);
      assert.ok(fs.existsSync(photoPath), relativePath + ' 引用了不存在的照片：' + match[1]);
    });
  });
});

test('deployment workflow tests pull requests across supported Node versions with scoped permissions', () => {
  const workflow = read('.github/workflows/deploy-pages.yml');

  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /node-version:\s*\[20, 22, 24\]/);
  assert.match(workflow, /if: github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /deploy:[\s\S]*?permissions:[\s\S]*?pages: write[\s\S]*?id-token: write/);
  assert.match(workflow, /deploy:[\s\S]*?concurrency:[\s\S]*?group: github-pages/);

  const topLevelPermissions = workflow.slice(workflow.indexOf('permissions:'), workflow.indexOf('jobs:'));
  assert.doesNotMatch(topLevelPermissions, /pages: write|id-token: write/);
});
