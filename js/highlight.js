(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function token(type, value) {
    return '<span class="md-token md-token-' + type + '">' + escapeHTML(value) + '</span>';
  }

  function renderInline(value) {
    const source = String(value == null ? '' : value);
    let html = '';
    let index = 0;

    while (index < source.length) {
      const rest = source.slice(index);
      let match = rest.match(/^(`+)([^`\n]+?)\1/);
      if (match) {
        html += token('syntax', match[1]) + token('code', match[2]) + token('syntax', match[1]);
        index += match[0].length;
        continue;
      }

      match = rest.match(/^(!?)\[([^\]\n]+)\]\(([^)\n]+)\)/);
      if (match) {
        html += token('syntax', match[1] + '[')
          + token('link-text', match[2])
          + token('syntax', '](')
          + token('link-url', match[3])
          + token('syntax', ')');
        index += match[0].length;
        continue;
      }

      match = rest.match(/^(\*\*|__)(?=\S)(.+?\S)\1/);
      if (match) {
        html += token('syntax', match[1]) + token('strong', match[2]) + token('syntax', match[1]);
        index += match[0].length;
        continue;
      }

      match = rest.match(/^(\*|_)(?=\S)([^*_\n]*?\S)\1/);
      if (match) {
        html += token('syntax', match[1]) + token('emphasis', match[2]) + token('syntax', match[1]);
        index += match[0].length;
        continue;
      }

      match = rest.match(/^\\([\\`*_[\]{}()#+\-.!>])/);
      if (match) {
        html += token('syntax', '\\') + escapeHTML(match[1]);
        index += match[0].length;
        continue;
      }

      const nextSpecial = rest.search(/[!`*_\\[]/);
      const plainLength = nextSpecial === 0 ? 1 : (nextSpecial === -1 ? rest.length : nextSpecial);
      html += escapeHTML(rest.slice(0, plainLength));
      index += plainLength;
    }

    return html;
  }

  function highlightMarkdown(source) {
    const lines = String(source == null ? '' : source).replace(/\r\n?/g, '\n').split('\n');
    let inFrontMatter = lines[0] === '---';

    return lines.map(function (line, lineIndex) {
      if (lineIndex === 0 && inFrontMatter) {
        return token('frontmatter-delimiter', line);
      }

      if (inFrontMatter) {
        if (line === '---') {
          inFrontMatter = false;
          return token('frontmatter-delimiter', line);
        }

        const field = line.match(/^(\s*)([A-Za-z][\w-]*)(\s*:)(.*)$/);
        if (field) {
          return escapeHTML(field[1])
            + token('frontmatter-key', field[2])
            + token('syntax', field[3])
            + renderInline(field[4]);
        }

        return renderInline(line);
      }

      if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        return token('rule', line);
      }

      const heading = line.match(/^(\s{0,3})(#{1,6})(\s+)(.*)$/);
      if (heading) {
        return escapeHTML(heading[1])
          + token('heading-marker', heading[2])
          + escapeHTML(heading[3])
          + token('heading', heading[4]);
      }

      const list = line.match(/^(\s*)([-+*]|\d+[.)])(\s+)(.*)$/);
      if (list) {
        return escapeHTML(list[1])
          + token('list-marker', list[2])
          + escapeHTML(list[3])
          + renderInline(list[4]);
      }

      const quote = line.match(/^(\s*)(>)(\s?)(.*)$/);
      if (quote) {
        return escapeHTML(quote[1])
          + token('quote-marker', quote[2])
          + escapeHTML(quote[3])
          + token('quote', quote[4]);
      }

      return renderInline(line);
    }).join('\n');
  }

  return {
    highlightMarkdown: highlightMarkdown,
  };
});
