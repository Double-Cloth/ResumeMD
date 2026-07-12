(function (root, factory) {
  const markdown = typeof module === 'object' && module.exports
    ? require('./markdown.js')
    : root.ResumeMD;
  const api = factory(markdown);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (markdown) {
  'use strict';

  const escapeHTML = markdown.escapeHTML;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function escapeAttribute(value) {
    return escapeHTML(value).replace(/`/g, '&#96;');
  }

  function makePrintTitle(name) {
    const cleanName = clean(name);
    return cleanName ? cleanName + '-简历' : '简历';
  }

  function collectStyleText(ownerDocument, styleElementIds) {
    if (!ownerDocument || !ownerDocument.styleSheets) {
      return '';
    }

    const ids = new Set(styleElementIds || []);
    const chunks = [];

    Array.from(ownerDocument.styleSheets).forEach(function (sheet) {
      const ownerNode = sheet.ownerNode;
      if (!ownerNode || !ids.has(ownerNode.id)) {
        return;
      }

      try {
        const rules = Array.from(sheet.cssRules || []);
        if (rules.length) {
          chunks.push(rules.map(function (rule) {
            return rule.cssText;
          }).join('\n'));
        }
      } catch (_error) {
        // 某些浏览器会限制 file:// 样式表的 CSSOM 读取；外链样式仍会作为后备加载。
      }
    });

    return chunks.join('\n');
  }

  function collectStylesheetURLs(ownerDocument, styleElementIds) {
    if (!ownerDocument || typeof ownerDocument.getElementById !== 'function') {
      return [];
    }

    return (styleElementIds || []).map(function (id) {
      const element = ownerDocument.getElementById(id);
      return element && element.href ? element.href : '';
    }).filter(Boolean);
  }

  function buildPrintDocument(options) {
    const settings = options || {};
    const title = makePrintTitle(settings.title);
    const styles = String(settings.styles || '');
    const resumeHTML = String(settings.resumeHTML || '');
    const stylesheetURLs = Array.isArray(settings.stylesheetURLs)
      ? settings.stylesheetURLs.filter(Boolean)
      : [];
    const links = stylesheetURLs.map(function (url) {
      return '<link rel="stylesheet" href="' + escapeAttribute(url) + '">';
    }).join('');

    return '<!doctype html>'
      + '<html lang="zh-CN">'
      + '<head>'
      + '<meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<meta name="color-scheme" content="light">'
      + '<title>' + escapeHTML(title) + '</title>'
      + links
      + '<style>' + styles + '</style>'
      + '</head>'
      + '<body>'
      + '<article class="resume-paper">' + resumeHTML + '</article>'
      + '</body>'
      + '</html>';
  }

  function printResume(options) {
    const settings = options || {};
    const ownerDocument = settings.ownerDocument || document;
    const ownerWindow = settings.ownerWindow || window;
    const resumeElement = settings.resumeElement;
    const styleElementIds = settings.styleElementIds || ['resume-styles', 'print-styles'];

    if (!resumeElement || typeof resumeElement.innerHTML !== 'string') {
      return Promise.reject(new Error('没有可打印的简历内容。'));
    }

    const frame = ownerDocument.createElement('iframe');
    frame.className = 'print-frame';
    frame.setAttribute('title', '简历打印预览');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';

    const styles = collectStyleText(ownerDocument, styleElementIds);
    const stylesheetURLs = collectStylesheetURLs(ownerDocument, styleElementIds);

    if (!styles && !stylesheetURLs.length) {
      ownerWindow.print();
      return Promise.resolve();
    }

    const printHTML = buildPrintDocument({
      title: settings.title,
      resumeHTML: resumeElement.innerHTML,
      styles: styles,
      stylesheetURLs: stylesheetURLs,
    });

    return new Promise(function (resolve, reject) {
      let settled = false;
      let cleanupTimer = null;
      let loadTimeout = null;
      let printDelay = null;

      function cleanup() {
        if (cleanupTimer) {
          ownerWindow.clearTimeout(cleanupTimer);
          cleanupTimer = null;
        }
        if (loadTimeout) {
          ownerWindow.clearTimeout(loadTimeout);
          loadTimeout = null;
        }
        if (printDelay) {
          ownerWindow.clearTimeout(printDelay);
          printDelay = null;
        }
        if (frame.parentNode) {
          frame.parentNode.removeChild(frame);
        }
      }

      frame.addEventListener('load', function () {
        if (settled) {
          return;
        }

        const printWindow = frame.contentWindow;
        if (!printWindow) {
          settled = true;
          cleanup();
          reject(new Error('无法创建打印窗口。'));
          return;
        }

        if (loadTimeout) {
          ownerWindow.clearTimeout(loadTimeout);
          loadTimeout = null;
        }

        printDelay = ownerWindow.setTimeout(function () {
          try {
            printWindow.addEventListener('afterprint', cleanup, { once: true });
            printWindow.focus();
            printWindow.print();
            settled = true;
            cleanupTimer = ownerWindow.setTimeout(cleanup, 60000);
            resolve();
          } catch (error) {
            settled = true;
            cleanup();
            reject(error);
          }
        }, 80);
      }, { once: true });

      ownerDocument.body.appendChild(frame);
      loadTimeout = ownerWindow.setTimeout(function () {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('打印预览加载超时。'));
        }
      }, 8000);
      frame.srcdoc = printHTML;
    });
  }

  return {
    makePrintTitle: makePrintTitle,
    collectStyleText: collectStyleText,
    buildPrintDocument: buildPrintDocument,
    printResume: printResume,
  };
});
