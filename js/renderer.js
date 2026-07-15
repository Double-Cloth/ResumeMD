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
  const sanitizeURL = markdown.sanitizeURL;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeWebsite(value) {
    const raw = clean(value);
    if (!raw) {
      return null;
    }

    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) && !/^https?:\/\//i.test(raw)) {
      return null;
    }

    const candidate = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    const href = sanitizeURL(candidate);
    if (!href || !/^https?:/i.test(href)) {
      return null;
    }

    const label = raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');

    return {
      href: href,
      label: label || raw,
    };
  }

  function normalizePhotoURL(value) {
    const raw = clean(value);
    if (!raw || /[\u0000-\u001F\u007F]/.test(raw)) {
      return null;
    }

    if (raw.startsWith('//') || /[\\<>"']/.test(raw)) {
      return null;
    }

    if (/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(raw)) {
      return raw;
    }

    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw)) {
      return null;
    }

    const pathOnly = raw.split(/[?#]/, 1)[0];
    if (!/\.(?:jpe?g|png|webp|gif)$/i.test(pathOnly)) {
      return null;
    }

    try {
      return encodeURI(raw);
    } catch (_error) {
      return null;
    }
  }


  function getContactIcon(type) {
    if (!type) {
      return '';
    }

    const icons = {
      phone: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      email: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
      location: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
      website: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    };
    return icons[type] || '';
  }

  function buildContactItem(content, href, type) {
    const iconSVG = getContactIcon(type);
    return href
      ? '<a class="resume-contact-item" href="' + escapeHTML(href) + '">' + iconSVG + '<span>' + escapeHTML(content) + '</span></a>'
      : '<span class="resume-contact-item">' + iconSVG + '<span>' + escapeHTML(content) + '</span></span>';
  }

  function buildInfoItem(label, content) {
    return '<span class="resume-contact-item"><span>' + escapeHTML(label) + '：' + escapeHTML(content) + '</span></span>';
  }


  function buildHeaderMetaItem(content) {
    return '<span>' + escapeHTML(content) + '</span>';
  }

  function buildResumeHTML(profile, bodyHTML) {
    const data = profile && typeof profile === 'object' ? profile : {};
    const name = clean(data.name);
    const title = clean(data.title);
    const photo = normalizePhotoURL(data.photo);
    const items = [];
    const headerMeta = [];

    const fieldLabels = {
      phone: '电话',
      email: '邮箱',
      location: '所在地',
      website: '个人网站',
      education: '最高学历',
      experience: '相关经验',
      gender: '性别',
      age: '年龄',
      birth: '出生日期',
      political: '政治面貌',
      city: '所在城市',
    };

    const headerMetaKeys = { education: true, experience: true };

    Object.keys(data).forEach(function (key) {
      if (key === 'name' || key === 'title' || key === 'photo') {
        return;
      }

      const raw = data[key];
      if (raw == null || raw === '') {
        return;
      }

      if (key === 'phone') {
        const val = clean(raw);
        if (!val) return;
        const href = sanitizeURL('tel:' + val);
        items.push(buildContactItem(val, href, 'phone'));
        return;
      }

      if (key === 'email') {
        const val = clean(raw);
        if (!val) return;
        const href = sanitizeURL('mailto:' + val);
        items.push(buildContactItem(val, href, 'email'));
        return;
      }

      if (key === 'website') {
        const ws = normalizeWebsite(raw);
        if (!ws) return;
        items.push(buildContactItem(ws.label, ws.href, 'website'));
        return;
      }

      if (key === 'location') {
        const val = clean(raw);
        if (!val) return;
        items.push(buildContactItem(val, null, 'location'));
        return;
      }

      const val = clean(raw);
      if (!val) return;
      const label = fieldLabels[key] || key;
      items.push(buildInfoItem(label, val));

      if (headerMetaKeys[key]) {
        headerMeta.push(buildHeaderMetaItem(val));
      }
    });

    let header = '';
    if (name || title || headerMeta.length || items.length || photo) {
      header += '<header class="resume-header">';
      if (photo) {
        header += '<div class="resume-photo-block">';
        header += '<img class="resume-photo" src="' + escapeHTML(photo) + '" alt="' + escapeHTML(name || '照片') + '">';
        header += '</div>';
      }
      header += '<div class="resume-header-main">';
      header += '<div class="resume-header-content">';
      if (name || title) {
        header += '<div class="resume-identity">';
        if (name) {
          header += '<h1>' + escapeHTML(name) + '</h1>';
        }
        if (title) {
          header += '<p class="resume-title">' + escapeHTML(title) + '</p>';
        }
        header += '</div>';
      }
      if (items.length) {
        header += '<div class="resume-contact-list">' + items.join('') + '</div>';
      }
      if (headerMeta.length) {
        header += '<div class="resume-highlight-list">' + headerMeta.join('') + '</div>';
      }
      header += '</div>';
      header += '</div>';
      header += '</header>';
    }

    return header + '<main class="resume-body">' + String(bodyHTML == null ? '' : bodyHTML) + '</main>';
  }

  function makeExportFilename(name) {
    const safe = clean(name)
      .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
      .replace(/\s*[-]+\s*/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/[. ]+$/g, '')
      .slice(0, 80);

    return safe ? safe + '-简历.md' : 'resume.md';
  }

  return {
    normalizeWebsite: normalizeWebsite,
    normalizePhotoURL: normalizePhotoURL,
    buildResumeHTML: buildResumeHTML,
    makeExportFilename: makeExportFilename,
  };
});
