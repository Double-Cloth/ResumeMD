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

  function getVisualLength(value) {
    return Array.from(clean(value)).reduce(function (length, character) {
      return length + (character.codePointAt(0) > 255 ? 2 : 1);
    }, 0);
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
      education: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12.2v4.3c2.8 2 7.2 2 10 0v-4.3M21 10v6"/></svg>',
      experience: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>',
      details: '<svg class="resume-contact-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>',
    };
    return icons[type] || '';
  }

  function buildContactItem(content, href, type) {
    const iconSVG = getContactIcon(type);
    const className = 'resume-contact-item resume-contact-' + type;
    return href
      ? '<a class="' + className + '" href="' + escapeHTML(href) + '">' + iconSVG + '<span>' + escapeHTML(content) + '</span></a>'
      : '<span class="' + className + '">' + iconSVG + '<span>' + escapeHTML(content) + '</span></span>';
  }

  function buildQualificationItem(label, content, type) {
    return '<div class="resume-qualification-item">'
      + getContactIcon(type)
      + '<span class="resume-qualification-copy">'
      + '<span class="resume-qualification-label">' + escapeHTML(label) + '</span>'
      + '<strong>' + escapeHTML(content) + '</strong>'
      + '</span></div>';
  }

  function buildDetailItem(label, content, displayValue) {
    return '<span class="resume-detail-item" aria-label="' + escapeHTML(label + '：' + content) + '">'
      + escapeHTML(displayValue || content)
      + '</span>';
  }

  function buildResumeHTML(profile, bodyHTML) {
    const data = profile && typeof profile === 'object' ? profile : {};
    const name = clean(data.name);
    const title = clean(data.title);
    const photo = normalizePhotoURL(data.photo);
    const contacts = [];
    const qualifications = [];
    const details = [];

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
      availability: '到岗时间',
      work_mode: '工作方式',
    };

    const phone = clean(data.phone);
    if (phone) {
      contacts.push(buildContactItem(phone, sanitizeURL('tel:' + phone), 'phone'));
    }

    const email = clean(data.email);
    if (email) {
      contacts.push(buildContactItem(email, sanitizeURL('mailto:' + email), 'email'));
    }

    const location = clean(data.location) || clean(data.city);
    if (location) {
      contacts.push(buildContactItem(location, null, 'location'));
    }

    const website = normalizeWebsite(data.website);
    if (website) {
      contacts.push(buildContactItem(website.label, website.href, 'website'));
    }

    const education = clean(data.education);
    if (education) {
      qualifications.push(buildQualificationItem(fieldLabels.education, education, 'education'));
    }

    const experience = clean(data.experience);
    if (experience) {
      qualifications.push(buildQualificationItem(fieldLabels.experience, experience, 'experience'));
    }

    const gender = clean(data.gender);
    if (gender) {
      details.push(buildDetailItem(fieldLabels.gender, gender));
    }

    const age = clean(data.age);
    if (age) {
      details.push(buildDetailItem(fieldLabels.age, age, /岁$/.test(age) ? age : age + ' 岁'));
    }

    const birth = clean(data.birth);
    if (birth) {
      details.push(buildDetailItem(fieldLabels.birth, birth));
    }

    const political = clean(data.political);
    if (political) {
      details.push(buildDetailItem(fieldLabels.political, political));
    }

    const city = clean(data.city);
    if (city && clean(data.location) && city !== clean(data.location)) {
      details.push(buildDetailItem(fieldLabels.city, city));
    }

    const availability = clean(data.availability);
    if (availability) {
      details.push(buildDetailItem(
        fieldLabels.availability,
        availability,
        fieldLabels.availability + ' ' + availability
      ));
    }

    const workMode = clean(data.work_mode);
    if (workMode) {
      details.push(buildDetailItem(
        fieldLabels.work_mode,
        workMode,
        fieldLabels.work_mode + ' ' + workMode
      ));
    }

    const knownKeys = {
      name: true,
      title: true,
      photo: true,
      phone: true,
      email: true,
      location: true,
      website: true,
      education: true,
      experience: true,
      gender: true,
      age: true,
      birth: true,
      political: true,
      city: true,
      availability: true,
      work_mode: true,
    };
    Object.keys(data).forEach(function (key) {
      const value = clean(data[key]);
      if (!knownKeys[key] && value) {
        const label = fieldLabels[key] || key;
        details.push(buildDetailItem(label, value, label + ' ' + value));
      }
    });

    const contactValues = [phone, email, location, website ? website.label : ''].filter(Boolean);
    const contactTextLength = contactValues.reduce(function (length, value) {
      return length + getVisualLength(value);
    }, 0);
    const longestContactLength = contactValues.reduce(function (length, value) {
      return Math.max(length, getVisualLength(value));
    }, 0);
    const contactLayout = (contacts.length === 1 && longestContactLength >= 42)
      || (contacts.length === 2 && contactTextLength >= 62)
      ? 'stack'
      : contacts.length >= 4
        || (contacts.length >= 3 && (contactTextLength >= 48 || longestContactLength >= 26))
        ? 'grid'
        : 'inline';
    const identityCount = Number(Boolean(name)) + Number(Boolean(title));
    const informationCount = identityCount + contacts.length + qualifications.length + details.length;
    const headerTextLength = Object.keys(data).reduce(function (length, key) {
      if (key === 'photo' || (key === 'city' && clean(data.location) === clean(data.city))) {
        return length;
      }
      return length + getVisualLength(data[key]);
    }, 0);
    const hasDenseGroups = contactLayout !== 'inline' && qualifications.length + details.length >= 2;
    const headerLayout = informationCount <= 3 && headerTextLength <= 48
      ? 'sparse'
      : informationCount >= 8 || headerTextLength >= 110 || hasDenseGroups
        ? 'dense'
        : 'balanced';
    const sideGroupCount = Number(Boolean(identityCount))
      + Number(Boolean(contacts.length))
      + Number(Boolean(qualifications.length));

    let header = '';
    if (name || title || qualifications.length || contacts.length || details.length || photo) {
      const headerClasses = ['resume-header', 'resume-header-layout-' + headerLayout];
      if (contacts.length) {
        headerClasses.push('resume-header-contacts-' + contactLayout);
      }
      if (photo) {
        headerClasses.push('resume-header-has-photo', 'resume-header-side-' + Math.max(1, sideGroupCount));
      }
      header += '<header class="' + headerClasses.join(' ') + '">';
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
      if (contacts.length) {
        header += '<div class="resume-contact-list resume-contact-list-' + contactLayout + '" aria-label="联系方式">' + contacts.join('') + '</div>';
      }
      if (qualifications.length) {
        header += '<div class="resume-qualification-list" aria-label="核心资历">' + qualifications.join('') + '</div>';
      }
      if (details.length) {
        header += '<div class="resume-detail-list">' + getContactIcon('details') + details.join('') + '</div>';
      }
      header += '</div>';
      if (photo) {
        header += '<div class="resume-photo-block">';
        header += '<img class="resume-photo" src="' + escapeHTML(photo) + '" alt="' + escapeHTML(name || '照片') + '">';
        header += '</div>';
      }
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
