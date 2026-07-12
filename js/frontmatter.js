(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function unquote(value) {
    if (value.length < 2) {
      return value;
    }

    const quote = value[0];
    if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) {
      return value;
    }

    const body = value.slice(1, -1);
    const escapedQuote = new RegExp('\\\\' + quote, 'g');
    return body.replace(escapedQuote, quote).replace(/\\\\/g, '\\');
  }

  function parseFrontMatter(source) {
    const normalized = String(source == null ? '' : source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');

    if (lines[0] !== '---') {
      return { data: {}, body: normalized, errors: [] };
    }

    const closingIndex = lines.findIndex(function (line, index) {
      return index > 0 && line === '---';
    });

    if (closingIndex === -1) {
      return {
        data: {},
        body: normalized,
        errors: ['Front Matter 缺少结束分隔线 `---`。'],
      };
    }

    const data = {};
    const errors = [];

    for (let index = 1; index < closingIndex; index += 1) {
      const line = lines[index];
      if (!line.trim() || /^\s*#/.test(line)) {
        continue;
      }

      const match = line.match(/^\s*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$/);
      if (!match) {
        errors.push('Front Matter 第 ' + (index + 1) + ' 行格式无效：' + line.trim());
        continue;
      }

      data[match[1]] = unquote(match[2]);
    }

    return {
      data: data,
      body: lines.slice(closingIndex + 1).join('\n').replace(/^\n+/, '').replace(/\n+$/, ''),
      errors: errors,
    };
  }

  return {
    parseFrontMatter: parseFrontMatter,
  };
});
