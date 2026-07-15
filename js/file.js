(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_IMPORT_BYTES = 1024 * 1024;
  const MAX_IMAGE_BYTES = 1024 * 1024;
  const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp|gif)$/i;
  const IMAGE_TYPES = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/gif': true,
  };

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
    const supportedType = !type || type === 'text/markdown' || type === 'text/plain';

    if (!supportedExtension && !supportedType) {
      return { ok: false, error: '仅支持 Markdown 或纯文本文件。' };
    }

    return { ok: true };
  }

  function validateImageFile(file) {
    if (!file || typeof file !== 'object') {
      return { ok: false, error: '请选择一个图片文件。' };
    }

    if (Number(file.size || 0) > MAX_IMAGE_BYTES) {
      return { ok: false, error: '图片不能超过 1 MiB。' };
    }

    const name = String(file.name || '');
    const type = String(file.type || '').toLowerCase();
    const supportedExtension = IMAGE_EXTENSIONS.test(name);
    const supportedType = !type || Boolean(IMAGE_TYPES[type]);

    if (!supportedExtension && !supportedType) {
      return { ok: false, error: '仅支持 JPG、PNG、WebP 或 GIF 图片。' };
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

  function readImageFile(file) {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      return Promise.reject(new Error(validation.error));
    }

    return new Promise(function (resolve, reject) {
      if (typeof FileReader === 'undefined') {
        reject(new Error('当前浏览器无法读取本地图片。'));
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', function () {
        const result = String(reader.result || '');
        if (!/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(result)) {
          reject(new Error('图片读取结果无效。'));
          return;
        }
        resolve(result);
      });
      reader.addEventListener('error', function () {
        reject(new Error('图片读取失败。'));
      });
      reader.readAsDataURL(file);
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
    MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
    validateImportFile: validateImportFile,
    validateImageFile: validateImageFile,
    readMarkdownFile: readMarkdownFile,
    readImageFile: readImageFile,
    downloadMarkdown: downloadMarkdown,
  };
});
