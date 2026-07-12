(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.ResumeMD = Object.assign(root.ResumeMD || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SNIPPETS = {
    profile: [
      '---',
      'name: 姓名',
      'title: 求职方向',
      'phone: 138 0000 0000',
      'email: name@example.com',
      'location: 城市',
      'website: github.com/username',
      'education: 本科',
      'experience: 2 年项目经验',
      'photo: dist/photo.jpg',
      '---',
    ].join('\n'),
    education: [
      '## 教育背景',
      '',
      '### 学校名称｜专业名称｜学历',
      '',
      '`2022.09 - 2026.06`',
      '',
      '- **成绩排名：** GPA 3.8/4.0，专业前 10%',
      '- **主修课程：** 数据结构、操作系统、计算机网络、数据库系统',
    ].join('\n'),
    experience: [
      '## 实习经历',
      '',
      '### 公司名称｜岗位名称',
      '',
      '`2025.06 - 2025.09`',
      '',
      '- 负责某业务模块的需求拆解、页面开发和联调上线。',
      '- 使用具体技术或方法优化关键流程，带来可量化结果。',
    ].join('\n'),
    project: [
      '## 项目经历',
      '',
      '### 项目名称｜角色',
      '',
      '`2025.01 - 2025.05`',
      '',
      '- 说明项目背景、目标用户和你负责的核心模块。',
      '- 描述关键技术方案、工程难点和最终结果。',
    ].join('\n'),
    skills: [
      '## 技能特长',
      '',
      '- **编程语言：** JavaScript、HTML、CSS、Python',
      '- **工程能力：** Git、Node.js、自动化测试、性能优化',
      '- **专业基础：** 数据结构与算法、操作系统、计算机网络',
    ].join('\n'),
    awards: [
      '## 荣誉奖项',
      '',
      '- 2025 校级一等奖学金',
      '- 2024 大学生创新创业训练计划优秀结题',
    ].join('\n'),
  };

  function countWords(source) {
    const matches = String(source == null ? '' : source).match(/[A-Za-z0-9]+|[\u4E00-\u9FFF]/g);
    return matches ? matches.length : 0;
  }

  function makeResumeStats(source, pageCount) {
    const text = String(source == null ? '' : source);
    const pages = Math.max(1, Math.floor(Number(pageCount) || 0));

    return {
      characters: Array.from(text).length,
      words: countWords(text),
      sections: (text.match(/^##\s+/gm) || []).length,
      pages: pages,
    };
  }

  function getSnippetTemplate(type) {
    return SNIPPETS[String(type || '')] || '';
  }

  function insertSnippet(source, start, end, snippet) {
    const text = String(source == null ? '' : source);
    const content = String(snippet == null ? '' : snippet).trim();
    const safeStart = Math.max(0, Math.min(text.length, Number(start) || 0));
    const safeEnd = Math.max(safeStart, Math.min(text.length, Number(end) || safeStart));

    if (!content) {
      return {
        value: text,
        selectionStart: safeStart,
        selectionEnd: safeStart,
      };
    }

    const before = text.slice(0, safeStart);
    const after = text.slice(safeEnd);
    const prefix = before && !before.endsWith('\n\n')
      ? before.endsWith('\n') ? '\n' : '\n\n'
      : '';
    const suffix = after
      ? after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
      : '\n';
    const insertionStart = before.length + prefix.length;
    const insertionEnd = insertionStart + content.length;

    return {
      value: before + prefix + content + suffix + after,
      selectionStart: insertionStart,
      selectionEnd: insertionEnd,
    };
  }

  return {
    getSnippetTemplate: getSnippetTemplate,
    insertSnippet: insertSnippet,
    makeResumeStats: makeResumeStats,
  };
});
