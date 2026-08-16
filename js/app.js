(function () {
  'use strict';

  const api = window.ResumeMD;
  const editor = document.getElementById('markdown-editor');
  const editorHighlight = document.querySelector('#markdown-highlight code');
  const editorHighlightLayer = document.getElementById('markdown-highlight');
  const preview = document.getElementById('resume-preview');
  const errorPanel = document.getElementById('error-panel');
  const status = document.getElementById('document-status');
  const characterCount = document.getElementById('character-count');
  const resumeStats = document.getElementById('resume-stats');
  const pageCount = document.getElementById('page-count');
  const snippetSelect = document.getElementById('snippet-select');
  const zoomSelect = document.getElementById('zoom-select');
  const previewScroll = document.querySelector('.preview-scroll');
  const fileInput = document.getElementById('file-input');
  const photoInput = document.getElementById('photo-input');
  const workspace = document.querySelector('.workspace');
  const editorTab = document.getElementById('editor-tab');
  const previewTab = document.getElementById('preview-tab');
  const undoButton = document.getElementById('undo-button');
  const syntaxHelpButton = document.getElementById('syntax-help-button');
  const syntaxHelpDialog = document.getElementById('syntax-help-dialog');
  const syntaxHelpClose = document.getElementById('syntax-help-close');
  const syntaxHelpConfirm = document.getElementById('syntax-help-confirm');
  const exampleSource = document.getElementById('example-source').textContent.trim();
  const storage = api.createStorage(getStorageBackend(), 'resumemd.source.v1');
  const backupStorage = api.createStorage(getStorageBackend(), 'resumemd.source.backup.v1');
  const draftHistory = api.createDraftHistory(backupStorage);
  const photoStorage = api.createStorage(getStorageBackend(), 'resumemd.photo.v1');
  const photoReference = 'resumemd-photo';
  let renderTimer = null;
  let statusTimer = null;
  let uploadedPhotoDataURL = null;

  function getStorageBackend() {
    try {
      return window.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

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

  function updateStats(stats) {
    characterCount.textContent = stats.characters.toLocaleString('zh-CN') + ' 字符';
    resumeStats.innerHTML = [
      '<span id="character-count">' + stats.characters.toLocaleString('zh-CN') + ' 字符</span>',
      '<span>' + stats.sections.toLocaleString('zh-CN') + ' 模块</span>',
      '<span>' + stats.pages.toLocaleString('zh-CN') + ' 页</span>',
    ].join('');
    pageCount.textContent = stats.pages.toLocaleString('zh-CN') + ' 页';
  }

  function openSyntaxHelp() {
    if (typeof syntaxHelpDialog.showModal === 'function') {
      if (!syntaxHelpDialog.open) {
        syntaxHelpDialog.showModal();
      }
      return;
    }

    syntaxHelpDialog.setAttribute('open', '');
    syntaxHelpClose.focus();
  }

  function closeSyntaxHelp() {
    if (typeof syntaxHelpDialog.close === 'function' && syntaxHelpDialog.open) {
      syntaxHelpDialog.close();
      return;
    }

    syntaxHelpDialog.removeAttribute('open');
    syntaxHelpButton.focus();
  }

  function updateUndoButton() {
    const previous = draftHistory.peek();
    const available = previous.ok && previous.available && previous.value !== editor.value;
    undoButton.hidden = !available;
    undoButton.disabled = !available;
  }

  function syncEditorHighlightScroll() {
    editorHighlightLayer.scrollTop = editor.scrollTop;
    editorHighlightLayer.scrollLeft = editor.scrollLeft;
  }

  function updateEditorHighlight() {
    editorHighlight.innerHTML = api.highlightMarkdown(editor.value) + '\n';
    syncEditorHighlightScroll();
  }

  function setPreviewZoom(value) {
    const fitWidth = value === 'fit';
    let zoom = Number(value) || 1;

    if (fitWidth) {
      const page = preview.querySelector('.resume-paper');
      const styles = window.getComputedStyle(previewScroll);
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const availableWidth = Math.max(1, previewScroll.clientWidth - horizontalPadding);
      const pageWidth = page && page.offsetWidth ? page.offsetWidth : 794;
      zoom = Math.min(1, Math.max(0.35, availableWidth / pageWidth));
    }

    preview.classList.toggle('is-fit-width', fitWidth);
    preview.style.setProperty('--preview-scale', String(zoom));
  }

  function renderDocument() {
    if (renderTimer) {
      window.clearTimeout(renderTimer);
      renderTimer = null;
    }

    const source = editor.value;
    updateEditorHighlight();
    const frontMatter = api.parseFrontMatter(source);
    const profile = resolveProfilePhoto(frontMatter.data);
    const blocks = api.parseMarkdown(frontMatter.body);
    const bodyHTML = api.renderBlocks(blocks);

    const resumeHTML = api.buildResumeHTML(profile, bodyHTML);
    let pages = [];
    if (typeof api.paginateResume === 'function') {
      pages = api.paginateResume(preview, resumeHTML);
    } else {
      preview.innerHTML = '<article class="resume-paper">' + resumeHTML + '</article>';
      pages = Array.from(preview.querySelectorAll('.resume-paper'));
    }
    if (zoomSelect.value === 'fit') {
      setPreviewZoom('fit');
    }
    updateErrors(frontMatter.errors);
    const stats = api.makeResumeStats(source, pages.length);
    updateStats(stats);
    document.title = frontMatter.data.name
      ? frontMatter.data.name + '｜ResumeMD'
      : 'ResumeMD｜Markdown 简历生成器';

    const saveResult = storage.save(source);
    if (saveResult.ok) {
      setStatus(frontMatter.errors.length ? '已保存，存在格式提示' : '已自动保存', frontMatter.errors.length ? 'error' : 'saved');
    } else {
      setStatus('本地保存不可用', 'error');
    }

    updateUndoButton();
    return saveResult;
  }

  function scheduleRender() {
    setStatus('正在更新…', 'saving');
    if (renderTimer) {
      window.clearTimeout(renderTimer);
    }
    renderTimer = window.setTimeout(renderDocument, 120);
  }

  function flushPendingRender() {
    if (renderTimer) {
      renderDocument();
    }
  }

  function refreshPaginationAfterLayout() {
    function refresh() {
      window.requestAnimationFrame(function () {
        renderDocument();
      });
    }

    if (document.readyState === 'complete') {
      refresh();
      return;
    }

    window.addEventListener('load', refresh, { once: true });
  }

  function replaceSource(source, message, createBackup) {
    const backupResult = createBackup ? draftHistory.snapshot(editor.value) : { ok: true };
    editor.value = String(source == null ? '' : source);
    const saveResult = renderDocument();

    if (!backupResult.ok) {
      setStatus(message + '，但无法保存恢复点', 'error');
    } else if (!saveResult.ok) {
      setStatus(message + '，本地保存不可用', 'error');
    } else {
      setStatus(message, 'saved', true);
    }
    editor.focus();
  }

  function insertSelectedSnippet() {
    const template = api.getSnippetTemplate(snippetSelect.value);
    snippetSelect.value = '';
    if (!template) {
      return;
    }

    const result = api.insertSnippet(
      editor.value,
      editor.selectionStart,
      editor.selectionEnd,
      template
    );
    editor.value = result.value;
    renderDocument();
    editor.focus();
    editor.setSelectionRange(result.selectionStart, result.selectionEnd);
    setStatus('已插入模板', 'saved', true);
  }

  function exportSource() {
    try {
      const frontMatter = api.parseFrontMatter(editor.value);
      const usesStoredPhoto = String(frontMatter.data.photo || '').trim() === photoReference;
      let photoDataURL = uploadedPhotoDataURL;

      if (usesStoredPhoto && !photoDataURL) {
        const photoResult = photoStorage.load();
        photoDataURL = photoResult.ok ? photoResult.value : null;
      }

      const portableSource = api.makePortablePhotoSource(editor.value, photoDataURL, photoReference);
      api.downloadMarkdown(portableSource, api.makeExportFilename(frontMatter.data.name));
      const photoEmbedded = !usesStoredPhoto || portableSource !== editor.value;
      setStatus(photoEmbedded ? 'Markdown 已导出' : 'Markdown 已导出，但照片未能打包', photoEmbedded ? 'saved' : 'error', photoEmbedded);
    } catch (error) {
      setStatus(error && error.message ? error.message : 'Markdown 导出失败', 'error');
    }
  }

  function resolveProfilePhoto(profile) {
    const data = Object.assign({}, profile || {});
    const rawPhoto = String(data.photo || '').trim();

    if (rawPhoto === photoReference) {
      if (uploadedPhotoDataURL) {
        data.photo = uploadedPhotoDataURL;
        return data;
      }

      const loadedPhoto = photoStorage.load();
      if (loadedPhoto.ok && api.isPhotoDataURL(loadedPhoto.value)) {
        uploadedPhotoDataURL = loadedPhoto.value;
        data.photo = loadedPhoto.value;
      }
    }

    return data;
  }

  function migrateInlinePhoto(source) {
    const result = api.migrateInlinePhotoSource(source, photoStorage, photoReference);
    if (result.photoDataURL) {
      uploadedPhotoDataURL = result.photoDataURL;
    }
    return result.source;
  }

  function applyUploadedPhoto(file) {
    setStatus('正在读取照片…', 'saving');
    api.readImageFile(file)
      .then(function (dataURL) {
        const result = api.prepareUploadedPhotoSource(editor.value, dataURL, photoStorage, photoReference);
        uploadedPhotoDataURL = result.photoDataURL;
        editor.value = result.source;
        renderDocument();
        setStatus(result.persisted ? '已上传照片 ' + file.name : '照片已内嵌，本地照片存储不可用', result.persisted ? 'saved' : 'error', result.persisted);
      })
      .catch(function (error) {
        setStatus(error.message || '照片上传失败', 'error');
      })
      .finally(function () {
        photoInput.value = '';
      });
  }

  function setMobileView(view, moveFocus) {
    const isEditor = view === 'editor';
    workspace.dataset.mobileView = isEditor ? 'editor' : 'preview';
    editorTab.classList.toggle('is-active', isEditor);
    previewTab.classList.toggle('is-active', !isEditor);
    editorTab.setAttribute('aria-selected', String(isEditor));
    previewTab.setAttribute('aria-selected', String(!isEditor));
    editorTab.tabIndex = isEditor ? 0 : -1;
    previewTab.tabIndex = isEditor ? -1 : 0;

    if (!isEditor) {
      window.requestAnimationFrame(function () {
        renderDocument();
      });
    }

    if (moveFocus) {
      (isEditor ? editorTab : previewTab).focus();
    }
  }

  function handleMobileTabKeydown(event) {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      return;
    }

    event.preventDefault();
    const showEditor = key === 'ArrowLeft' || key === 'Home';
    setMobileView(showEditor ? 'editor' : 'preview', true);
  }

  editor.addEventListener('input', function () {
    updateEditorHighlight();
    scheduleRender();
  });
  editor.addEventListener('scroll', syncEditorHighlightScroll);
  window.addEventListener('pagehide', flushPendingRender);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      flushPendingRender();
    }
  });

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
        replaceSource(content, '已导入 ' + file.name, true);
      })
      .catch(function (error) {
        setStatus(error.message || '导入失败', 'error');
      })
      .finally(function () {
        fileInput.value = '';
      });
  });

  document.getElementById('photo-button').addEventListener('click', function () {
    photoInput.click();
  });

  photoInput.addEventListener('change', function () {
    const file = photoInput.files && photoInput.files[0];
    if (!file) {
      return;
    }

    applyUploadedPhoto(file);
  });

  document.getElementById('export-button').addEventListener('click', exportSource);

  syntaxHelpButton.addEventListener('click', openSyntaxHelp);
  syntaxHelpClose.addEventListener('click', closeSyntaxHelp);
  syntaxHelpConfirm.addEventListener('click', closeSyntaxHelp);
  syntaxHelpDialog.addEventListener('click', function (event) {
    if (event.target === syntaxHelpDialog) {
      closeSyntaxHelp();
    }
  });
  syntaxHelpDialog.addEventListener('close', function () {
    syntaxHelpButton.focus();
  });

  snippetSelect.addEventListener('change', insertSelectedSnippet);

  zoomSelect.addEventListener('change', function () {
    setPreviewZoom(zoomSelect.value);
  });

  window.addEventListener('resize', function () {
    if (zoomSelect.value === 'fit') {
      setPreviewZoom('fit');
    }
  });

  document.getElementById('print-button').addEventListener('click', function () {
    setStatus('正在准备 PDF…', 'saving');
    renderDocument();
    const frontMatter = api.parseFrontMatter(editor.value);

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

  undoButton.addEventListener('click', function () {
    const result = draftHistory.restore(editor.value);
    if (!result.ok) {
      updateUndoButton();
      setStatus('无法恢复上一份草稿', 'error');
      return;
    }

    editor.value = result.value;
    const saveResult = renderDocument();
    setStatus(saveResult.ok ? '已恢复上一份草稿' : '草稿已恢复，但本地保存不可用', saveResult.ok ? 'saved' : 'error', saveResult.ok);
    editor.focus();
  });

  document.getElementById('reset-button').addEventListener('click', function () {
    if (window.confirm('恢复内置示例将覆盖当前内容，是否继续？')) {
      replaceSource(exampleSource, '已恢复示例', true);
    }
  });

  document.getElementById('clear-button').addEventListener('click', function () {
    if (window.confirm('清空当前草稿后会自动保存空白内容，是否继续？')) {
      replaceSource('', '已清空草稿', true);
    }
  });

  editorTab.addEventListener('click', function () {
    setMobileView('editor');
  });

  previewTab.addEventListener('click', function () {
    setMobileView('preview');
  });

  editorTab.addEventListener('keydown', handleMobileTabKeydown);
  previewTab.addEventListener('keydown', handleMobileTabKeydown);

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      exportSource();
    }
  });

  const loaded = storage.load();
  editor.value = migrateInlinePhoto(loaded.ok && loaded.value !== null ? loaded.value : exampleSource);
  if (!loaded.ok) {
    setStatus('本地保存不可用', 'error');
  }
  if (window.matchMedia('(max-width: 1080px)').matches) {
    zoomSelect.value = 'fit';
  }
  setPreviewZoom(zoomSelect.value);
  renderDocument();
  refreshPaginationAfterLayout();
})();
