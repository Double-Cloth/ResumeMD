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

  function sanitizeURL(value) {
    const url = String(value == null ? '' : value).trim();
    if (!url || /[\u0000-\u001F\u007F]/.test(url)) {
      return null;
    }

    if (/^(?:https?:|mailto:|tel:)/i.test(url)) {
      try {
        return encodeURI(url);
      } catch (_error) {
        return null;
      }
    }

    if (url.startsWith('//')) {
      return null;
    }

    if (/^(?:#|\/|\.\/|\.\.\/)/.test(url)) {
      try {
        return encodeURI(url);
      } catch (_error) {
        return null;
      }
    }

    return null;
  }

  function findClosingParenthesis(text, startIndex) {
    let depth = 0;

    for (let index = startIndex; index < text.length; index += 1) {
      if (text[index] === '\\') {
        index += 1;
        continue;
      }

      if (text[index] === '(') {
        depth += 1;
      } else if (text[index] === ')') {
        if (depth === 0) {
          return index;
        }
        depth -= 1;
      }
    }

    return -1;
  }

  function renderInline(value) {
    const text = String(value == null ? '' : value);
    let html = '';
    let plain = '';

    function flushPlain() {
      if (plain) {
        html += escapeHTML(plain);
        plain = '';
      }
    }

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];

      if (char === '\\' && index + 1 < text.length) {
        plain += text[index + 1];
        index += 1;
        continue;
      }

      if (char === '`') {
        const closing = text.indexOf('`', index + 1);
        if (closing !== -1) {
          flushPlain();
          html += '<code>' + escapeHTML(text.slice(index + 1, closing)) + '</code>';
          index = closing;
          continue;
        }
      }

      if (text.startsWith('**', index)) {
        const closing = text.indexOf('**', index + 2);
        if (closing !== -1) {
          flushPlain();
          html += '<strong>' + renderInline(text.slice(index + 2, closing)) + '</strong>';
          index = closing + 1;
          continue;
        }

        plain += '**';
        index += 1;
        continue;
      }

      if (char === '*') {
        const closing = text.indexOf('*', index + 1);
        if (closing !== -1) {
          flushPlain();
          html += '<em>' + renderInline(text.slice(index + 1, closing)) + '</em>';
          index = closing;
          continue;
        }
      }

      if (char === '[') {
        const labelEnd = text.indexOf('](', index + 1);
        if (labelEnd !== -1) {
          const urlStart = labelEnd + 2;
          const urlEnd = findClosingParenthesis(text, urlStart);
          if (urlEnd !== -1) {
            const label = text.slice(index + 1, labelEnd);
            const destination = sanitizeURL(text.slice(urlStart, urlEnd));
            flushPlain();
            if (destination) {
              const external = /^https?:/i.test(destination);
              html += '<a href="' + escapeHTML(destination) + '"' +
                (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
                '>' + renderInline(label) + '</a>';
            } else {
              html += renderInline(label);
            }
            index = urlEnd;
            continue;
          }
        }
      }

      plain += char;
    }

    flushPlain();
    return html;
  }

  function parseMarkdown(source) {
    const lines = String(source == null ? '' : source).replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let paragraph = [];
    let activeList = null;

    function flushParagraph() {
      if (paragraph.length) {
        blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
        paragraph = [];
      }
    }

    function flushList() {
      if (activeList) {
        blocks.push(activeList);
        activeList = null;
      }
    }

    function flushAll() {
      flushParagraph();
      flushList();
    }

    lines.forEach(function (line) {
      if (!line.trim()) {
        flushAll();
        return;
      }

      const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/);
      if (heading) {
        flushAll();
        blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
        return;
      }

      if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
        flushAll();
        blocks.push({ type: 'hr' });
        return;
      }

      const unordered = line.match(/^\s*[-+*]\s+(.+?)\s*$/);
      const ordered = line.match(/^\s*\d+[.)]\s+(.+?)\s*$/);
      const listMatch = unordered || ordered;
      if (listMatch) {
        flushParagraph();
        const isOrdered = Boolean(ordered);
        if (!activeList || activeList.ordered !== isOrdered) {
          flushList();
          activeList = { type: 'list', ordered: isOrdered, items: [] };
        }
        activeList.items.push(listMatch[1]);
        return;
      }

      flushList();
      paragraph.push(line.trim());
    });

    flushAll();
    return blocks;
  }

  function renderBlocks(blocks) {
    const list = Array.isArray(blocks) ? blocks : [];
    let html = '';
    let sectionOpen = false;
    let entryOpen = false;

    function closeEntry() {
      if (entryOpen) {
        html += '</div>';
        entryOpen = false;
      }
    }

    function closeSection() {
      closeEntry();
      if (sectionOpen) {
        html += '</section>';
        sectionOpen = false;
      }
    }

    for (let index = 0; index < list.length; index += 1) {
      const block = list[index];

      if (block.type === 'heading' && block.level === 2) {
        closeSection();
        html += '<section class="resume-section"><h2>' + renderInline(block.text) + '</h2>';
        sectionOpen = true;
        continue;
      }

      if (block.type === 'heading' && block.level === 3) {
        closeEntry();
        html += '<div class="resume-entry">';
        entryOpen = true;

        const next = list[index + 1];
        const dateMatch = next && next.type === 'paragraph'
          ? next.text.trim().match(/^`([^`]+)`$/)
          : null;

        if (dateMatch) {
          html += '<div class="resume-entry-heading"><h3>' + renderInline(block.text) + '</h3><time>' + escapeHTML(dateMatch[1]) + '</time></div>';
          index += 1;
        } else {
          html += '<h3>' + renderInline(block.text) + '</h3>';
        }
        continue;
      }

      if (block.type === 'heading') {
        closeEntry();
        html += '<h' + block.level + '>' + renderInline(block.text) + '</h' + block.level + '>';
        continue;
      }

      if (block.type === 'paragraph') {
        html += '<p>' + renderInline(block.text) + '</p>';
        continue;
      }

      if (block.type === 'list') {
        const tag = block.ordered ? 'ol' : 'ul';
        html += '<' + tag + '>' + block.items.map(function (item) {
          return '<li>' + renderInline(item) + '</li>';
        }).join('') + '</' + tag + '>';
        continue;
      }

      if (block.type === 'hr') {
        closeSection();
        html += '<hr>';
      }
    }

    closeSection();
    return html;
  }

  return {
    escapeHTML: escapeHTML,
    sanitizeURL: sanitizeURL,
    renderInline: renderInline,
    parseMarkdown: parseMarkdown,
    renderBlocks: renderBlocks,
  };
});
