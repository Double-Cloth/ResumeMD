(function () {
  'use strict';

  const api = window.ResumeMD;
  const editor = document.getElementById('markdown-editor');
  const preview = document.getElementById('resume-preview');
  const errorPanel = document.getElementById('error-panel');
  const status = document.getElementById('document-status');
  const characterCount = document.getElementById('character-count');
  const fileInput = document.getElementById('file-input');
  const workspace = document.querySelector('.workspace');
  const editorTab = document.getElementById('editor-tab');
  const previewTab = document.getElementById('preview-tab');
  const exampleSource = document.getElementById('example-source').textContent.trim();
  const storage = api.createStorage(window.localStorage, 'resumemd.source.v1');
  let renderTimer = null;
  let statusTimer = null;

  function setStatus(message, state, temporary) {
    status.textContent = message;
    status.dataset.state = state || '';

    if (statusTimer) {
      window.clearTimeout(statusTimer);
      statusTimer = null;
    }

    if (temporary) {
      statusTimer = window.setTimeout(function () {
        status.textContent = '已自动保存';
        status.dataset.state = 'saved';
      }, 2200);
    }
  }

  function updateErrors(errors) {
    if (!errors.length) {
      errorPanel.hidden = true;
      errorPanel.textContent = '';
      return;
    }

    errorPanel.hidden = false;
    errorPanel.textContent = errors.join(' ');
  }

  function renderDocument() {
    const source = editor.value;
    const frontMatter = api.parseFrontMatter(source);
    const blocks = api.parseMarkdown(frontMatter.body);
    const bodyHTML = api.renderBlocks(blocks);

    preview.innerHTML = api.buildResumeHTML(frontMatter.data, bodyHTML);
    updateErrors(frontMatter.errors);
    characterCount.textContent = source.length.toLocaleString('zh-CN') + ' 字符';
    document.title = frontMatter.data.name
      ? frontMatter.data.name + '｜ResumeMD'
      : 'ResumeMD｜Markdown 简历生成器';

    const saveResult = storage.save(source);
    if (saveResult.ok) {
      setStatus(frontMatter.errors.length ? '已保存，存在格式提示' : '已自动保存', frontMatter.errors.length ? 'error' : 'saved');
    } else {
      setStatus('本地保存不可用', 'error');
    }
  }

  function scheduleRender() {
    setStatus('正在更新…', 'saving');
    if (renderTimer) {
      window.clearTimeout(renderTimer);
    }
    renderTimer = window.setTimeout(renderDocument, 120);
  }

  function replaceSource(source, message) {
    editor.value = String(source || '');
    renderDocument();
    setStatus(message, 'saved', true);
    editor.focus();
  }

  function exportSource() {
    const frontMatter = api.parseFrontMatter(editor.value);
    api.downloadMarkdown(editor.value, api.makeExportFilename(frontMatter.data.name));
    setStatus('Markdown 已导出', 'saved', true);
  }

  function setMobileView(view) {
    const isEditor = view === 'editor';
    workspace.dataset.mobileView = isEditor ? 'editor' : 'preview';
    editorTab.classList.toggle('is-active', isEditor);
    previewTab.classList.toggle('is-active', !isEditor);
    editorTab.setAttribute('aria-selected', String(isEditor));
    previewTab.setAttribute('aria-selected', String(!isEditor));
  }

  editor.addEventListener('input', scheduleRender);

  document.getElementById('import-button').addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      return;
    }

    api.readMarkdownFile(file)
      .then(function (content) {
        replaceSource(content, '已导入 ' + file.name);
      })
      .catch(function (error) {
        setStatus(error.message || '导入失败', 'error');
      })
      .finally(function () {
        fileInput.value = '';
      });
  });

  document.getElementById('export-button').addEventListener('click', exportSource);
  document.getElementById('print-button').addEventListener('click', function () {
    const frontMatter = api.parseFrontMatter(editor.value);
    setStatus('正在准备 PDF…', 'saving');

    api.printResume({
      ownerDocument: document,
      ownerWindow: window,
      resumeElement: preview,
      title: frontMatter.data.name,
      styleElementIds: ['resume-styles', 'print-styles'],
    }).then(function () {
      setStatus('已打开打印窗口，请选择“另存为 PDF”', 'saved', true);
    }).catch(function (error) {
      setStatus(error.message || '无法打开打印窗口', 'error');
    });
  });

  document.getElementById('reset-button').addEventListener('click', function () {
    if (window.confirm('恢复内置示例将覆盖当前内容，是否继续？')) {
      replaceSource(exampleSource, '已恢复示例');
    }
  });

  editorTab.addEventListener('click', function () {
    setMobileView('editor');
  });

  previewTab.addEventListener('click', function () {
    setMobileView('preview');
  });

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      exportSource();
    }
  });

  const loaded = storage.load();
  editor.value = loaded.ok && loaded.value ? loaded.value : exampleSource;
  if (!loaded.ok) {
    setStatus('本地保存不可用', 'error');
  }
  renderDocument();
})();
