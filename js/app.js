(function () {
  'use strict';

  const api = window.ResumeMD;
  const editor = document.getElementById('markdown-editor');
  const preview = document.getElementById('resume-preview');
  const errorPanel = document.getElementById('error-panel');
  const status = document.getElementById('document-status');
  const characterCount = document.getElementById('character-count');
  const resumeStats = document.getElementById('resume-stats');
  const pageCount = document.getElementById('page-count');
  const snippetSelect = document.getElementById('snippet-select');
  const zoomSelect = document.getElementById('zoom-select');
  const fileInput = document.getElementById('file-input');
  const photoInput = document.getElementById('photo-input');
  const workspace = document.querySelector('.workspace');
  const editorTab = document.getElementById('editor-tab');
  const previewTab = document.getElementById('preview-tab');
  const exampleSource = document.getElementById('example-source').textContent.trim();
  const storage = api.createStorage(getStorageBackend(), 'resumemd.source.v1');
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

  function setPreviewZoom(value) {
    const zoom = Number(value) || 1;
    preview.style.setProperty('--preview-scale', String(zoom));
  }

  function getRenderedScale(element) {
    if (!element || !element.offsetWidth) {
      return 1;
    }

    const rect = element.getBoundingClientRect();
    return rect.width ? rect.width / element.offsetWidth : 1;
  }

  function getElementRects(element) {
    const rects = [];

    if (!element) {
      return rects;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    Array.from(range.getClientRects()).forEach(function (rect) {
      if (rect.width > 0) {
        rects.push(rect);
      }
    });
    if (typeof range.detach === 'function') {
      range.detach();
    }

    return rects;
  }

  function measureHeaderLineWidth(element, headerLeft, scale) {
    if (!element || !element.textContent.trim()) {
      return 0;
    }

    const rects = element.classList && element.classList.contains('resume-contact-item')
      ? Array.from(element.children).reduce(function (allRects, child) {
        return allRects.concat(getElementRects(child));
      }, [])
      : getElementRects(element);

    if (!rects.length) {
      return 0;
    }

    const left = Math.min.apply(null, rects.map(function (rect) { return rect.left; }));
    const right = Math.max.apply(null, rects.map(function (rect) { return rect.right; }));
    const leftOffset = (left - headerLeft) / (scale || 1);

    if (leftOffset > 6) {
      return 0;
    }

    return (right - headerLeft) / (scale || 1);
  }

  function syncHeaderRuleWidths(pages) {
    const pageList = pages && pages.length
      ? pages
      : Array.from(preview.querySelectorAll('.resume-paper'));
    const scale = getRenderedScale(preview);

    pageList.forEach(function (page) {
      const header = page.querySelector('.resume-header');
      if (!header) {
        return;
      }

      const headerLeft = header.getBoundingClientRect().left;
      const lineItems = header.querySelectorAll([
        '.resume-header h1',
        '.resume-title',
        '.resume-contact-item',
        '.resume-highlight-list span',
      ].join(', '));
      const maxWidth = Array.from(lineItems).reduce(function (width, item) {
        return Math.max(width, measureHeaderLineWidth(item, headerLeft, scale));
      }, 0);

      if (maxWidth > 0) {
        header.style.setProperty('--resume-header-rule-width', maxWidth + 'px');
      } else {
        header.style.removeProperty('--resume-header-rule-width');
      }
    });
  }

  function renderDocument() {
    if (renderTimer) {
      window.clearTimeout(renderTimer);
      renderTimer = null;
    }

    const source = editor.value;
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
    syncHeaderRuleWidths(pages);
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
  }

  function scheduleRender() {
    setStatus('正在更新…', 'saving');
    if (renderTimer) {
      window.clearTimeout(renderTimer);
    }
    renderTimer = window.setTimeout(renderDocument, 120);
  }

  function replaceSource(source, message) {
    editor.value = String(source == null ? '' : source);
    renderDocument();
    setStatus(message, 'saved', true);
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
    const frontMatter = api.parseFrontMatter(editor.value);
    api.downloadMarkdown(editor.value, api.makeExportFilename(frontMatter.data.name));
    setStatus('Markdown 已导出', 'saved', true);
  }

  function isPhotoDataURL(value) {
    return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(String(value || '').trim());
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
      if (loadedPhoto.ok && isPhotoDataURL(loadedPhoto.value)) {
        uploadedPhotoDataURL = loadedPhoto.value;
        data.photo = loadedPhoto.value;
      }
    }

    return data;
  }

  function setFrontMatterField(source, key, value) {
    const normalized = String(source == null ? '' : source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');
    const field = String(key || '').trim();
    const nextLine = field + ': ' + String(value == null ? '' : value);

    if (!field) {
      return normalized;
    }

    if (lines[0] !== '---') {
      return ['---', nextLine, '---', '', normalized.replace(/^\n+/, '')].join('\n');
    }

    const closingIndex = lines.findIndex(function (line, index) {
      return index > 0 && line === '---';
    });

    if (closingIndex === -1) {
      return ['---', nextLine, '---', '', normalized].join('\n');
    }

    const fieldPattern = new RegExp('^\\s*' + field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:');
    for (let index = 1; index < closingIndex; index += 1) {
      if (fieldPattern.test(lines[index])) {
        lines[index] = nextLine;
        return lines.join('\n');
      }
    }

    lines.splice(closingIndex, 0, nextLine);
    return lines.join('\n');
  }

  function migrateInlinePhoto(source) {
    const frontMatter = api.parseFrontMatter(source);
    if (!isPhotoDataURL(frontMatter.data.photo)) {
      return source;
    }

    uploadedPhotoDataURL = frontMatter.data.photo.trim();
    photoStorage.save(uploadedPhotoDataURL);
    return setFrontMatterField(source, 'photo', photoReference);
  }

  function applyUploadedPhoto(file) {
    setStatus('正在读取照片…', 'saving');
    api.readImageFile(file)
      .then(function (dataURL) {
        uploadedPhotoDataURL = dataURL;
        const saveResult = photoStorage.save(dataURL);
        editor.value = setFrontMatterField(editor.value, 'photo', photoReference);
        renderDocument();
        setStatus(saveResult.ok ? '已上传照片 ' + file.name : '照片已应用，本地照片保存不可用', saveResult.ok ? 'saved' : 'error', saveResult.ok);
      })
      .catch(function (error) {
        setStatus(error.message || '照片上传失败', 'error');
      })
      .finally(function () {
        photoInput.value = '';
      });
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

  snippetSelect.addEventListener('change', insertSelectedSnippet);

  zoomSelect.addEventListener('change', function () {
    setPreviewZoom(zoomSelect.value);
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

  document.getElementById('reset-button').addEventListener('click', function () {
    if (window.confirm('恢复内置示例将覆盖当前内容，是否继续？')) {
      replaceSource(exampleSource, '已恢复示例');
    }
  });

  document.getElementById('clear-button').addEventListener('click', function () {
    if (window.confirm('清空当前草稿后会自动保存空白内容，是否继续？')) {
      replaceSource('', '已清空草稿');
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
  editor.value = migrateInlinePhoto(loaded.ok && loaded.value !== null ? loaded.value : exampleSource);
  if (!loaded.ok) {
    setStatus('本地保存不可用', 'error');
  }
  setPreviewZoom(zoomSelect.value);
  renderDocument();
})();
