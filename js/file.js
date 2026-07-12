(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_IMPORT_BYTES = 1024 * 1024;

  function validateImportFile(file) {
    if (!file || typeof file !== 'object') {
      return { ok: false, error: '请选择一个 Markdown 或纯文本文件。' };
    }

    if (Number(file.size || 0) > MAX_IMPORT_BYTES) {
      return { ok: false, error: '文件不能超过 1 MiB。' };
    }

    const name = String(file.name || '');
    const type = String(file.type || '').toLowerCase();
    const supportedExtension = /\.(?:md|markdown|txt)$/i.test(name);
    const supportedType = !type || type === 'text/markdown' || type === 'text/plain' || type.startsWith('text/');

    if (!supportedExtension && !supportedType) {
      return { ok: false, error: '仅支持 Markdown 或纯文本文件。' };
    }

    return { ok: true };
  }

  function readMarkdownFile(file) {
    const validation = validateImportFile(file);
    if (!validation.ok) {
      return Promise.reject(new Error(validation.error));
    }

    if (typeof file.text === 'function') {
      return file.text();
    }

    return new Promise(function (resolve, reject) {
      if (typeof FileReader === 'undefined') {
        reject(new Error('当前浏览器无法读取本地文件。'));
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', function () {
        resolve(String(reader.result || ''));
      });
      reader.addEventListener('error', function () {
        reject(new Error('文件读取失败。'));
      });
      reader.readAsText(file, 'UTF-8');
    });
  }

  function downloadMarkdown(source, filename) {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      throw new Error('当前环境不支持文件导出。');
    }

    const blob = new Blob([String(source == null ? '' : source)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'resume.md';
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  return {
    MAX_IMPORT_BYTES: MAX_IMPORT_BYTES,
    validateImportFile: validateImportFile,
    readMarkdownFile: readMarkdownFile,
    downloadMarkdown: downloadMarkdown,
  };
});
