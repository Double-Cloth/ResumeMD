# ResumeMD

ResumeMD 是一个完全离线、无第三方依赖的 Markdown 简历生成器。直接打开 `index.html`，即可在左侧编辑 Markdown，并在右侧实时生成 A4 简历预览，适合制作中文单页或多页 PDF 简历。

## 功能

- YAML Front Matter 管理姓名、求职方向、联系信息、头像和基础信息。
- Markdown 实时预览，自动渲染为适合中文简历的 A4 版式。
- 多页 A4 预览，长简历会自动分页，打印时保持页面拆分。
- 模板插入辅助，快速补充个人信息、教育背景、实习经历、项目经历、技能和荣誉模块。
- 字符数、模块数、页数实时统计，便于控制简历篇幅。
- 预览缩放控制，方便在不同屏幕上检查版面。
- 导入、导出 `.md` 文件，支持浏览器打印为 PDF。
- `localStorage` 自动保存，刷新页面后继续编辑。
- 桌面双栏与移动端编辑/预览切换。
- 无网络请求、无 CDN、无第三方运行时依赖。
- HTML 转义、链接协议白名单和头像路径白名单，避免执行用户输入。

## 快速开始

1. 克隆项目或访问[在线网页](https://double-cloth.github.io/ResumeMD/)。
2. 双击打开 `index.html`。
3. 在左侧编辑器中修改 Markdown 内容。
4. 查看右侧 A4 预览，必要时用“插入模板”补充模块。
5. 点击“打印 / PDF”，在浏览器打印窗口中选择“另存为 PDF”。

不需要安装 Node.js，不需要启动本地服务器，也不需要联网。Node.js 只用于运行测试。

## 编辑流程

- 点击“示例”会恢复内置示例，当前内容会被覆盖。
- 点击“清空”会清空当前草稿，并自动保存空白内容；下次打开仍保持空白。
- 点击“导入”可读取本地 `.md`、`.markdown` 或 `.txt` 文件。
- 点击“导出 MD”会把当前编辑器内容保存为 Markdown 文件。
- 使用 `Ctrl + S` 或 `Command + S` 可快速导出 Markdown。
- 移动端使用顶部“编辑 / 预览”切换当前面板。

## Front Matter

个人信息写在文件顶部的 Front Matter 中：

```markdown
---
name: 童同学
title: 软件开发实习生
phone: 182 8888 8888
email: resume@example.com
location: 上海
website: github.com/example
education: 本科在读
experience: 2 年项目经验
photo: dist/photo.jpg
birth: 2006.02
political: 群众
city: 上海
---
```

支持字段：

| 字段 | 含义 |
| --- | --- |
| `name` | 姓名 |
| `title` | 求职方向或职业标题 |
| `phone` | 电话，会生成 `tel:` 链接 |
| `email` | 邮箱，会生成 `mailto:` 链接 |
| `location` | 所在地 |
| `website` | 个人网站、GitHub 或作品集地址 |
| `education` | 最高学历，例如“本科在读” |
| `experience` | 相关经验，例如“2 年项目经验” |
| `photo` | 头像路径，可选，例如 `dist/photo.jpg` |
| `gender` | 性别，可选 |
| `age` | 年龄，可选 |
| `birth` | 出生日期，例如 `2006.02` |
| `political` | 政治面貌，例如“群众” |
| `city` | 所在城市，例如“上海” |

电话、邮箱、所在地、个人主页、学历、经验和其他非空字段会自动整理到简历页眉中。`education` 和 `experience` 会额外显示为页眉高亮信息；未填写的字段会自动隐藏。

## 头像

`photo` 只支持本地或相对图片路径，扩展名限 `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`。

推荐做法：

```markdown
photo: dist/photo.jpg
```

限制说明：

- 不加载远程 URL，例如 `https://example.com/photo.jpg`。
- 不允许 `data:`、`file:`、`javascript:` 或协议相对路径。
- 不支持 `.svg` 作为头像，避免脚本或外部资源风险。
- 图片建议使用证件照比例，示例头像文件位于 `dist/photo.jpg`。

## Markdown 写法

正文示例：

```markdown
## 教育背景

### 同济大学｜软件工程｜本科

`2024.09 - 2028.06`

- **专业成绩：** GPA 4.9/5.0，专业前 10%。
- **主修课程：** 数据结构、操作系统、计算机网络。
```

排版约定：

- `##`：简历模块标题。
- `###`：学校、公司、项目或经历标题。
- 紧跟 `###` 的独立行内代码：右对齐日期。
- `-` 或 `*`：无序列表。
- `1.`：有序列表。
- `**文字**`：粗体。
- `*文字*`：斜体。
- `` `文字` ``：行内代码。
- `[文字](https://example.com)`：链接。
- `---`：分隔线。

当前不支持表格、脚注、数学公式、代码块、嵌套列表和任意 HTML。

## 辅助功能

“插入模板”下拉框可在当前光标处插入常用模块：

- 个人信息
- 教育背景
- 实习经历
- 项目经历
- 技能特长
- 荣誉奖项

插入时会自动补齐前后空行，并选中新插入内容，方便直接覆盖示例文字。底部统计会实时显示字符数、模块数和页数；右侧顶部可以选择 `85%`、`100%`、`115%` 预览缩放。

## 导入与导出

导入：

- 支持 `.md`、`.markdown` 和 `.txt`。
- 文件最大 1 MiB。
- 文件内容会覆盖当前编辑器内容。

导出：

- “导出 MD”生成 UTF-8 编码的 Markdown 文件。
- 文件名优先使用 `name` 字段，例如 `童同学-简历.md`。
- “打印 / PDF”会生成独立打印文档，避免编辑器界面混入 PDF。

## PDF 设置建议

在浏览器打印窗口中建议选择：

- 目标打印机：另存为 PDF。
- 纸张：A4。
- 边距：无。
- 缩放：100%。
- 页眉和页脚：关闭。
- 背景图形：开启或保持浏览器默认。

如果页面被缩小或出现额外空白页，优先检查打印窗口的边距、缩放和页眉页脚设置。

## 自动保存

编辑内容会保存在当前浏览器的 `localStorage` 中。不同浏览器、不同本地路径可能使用不同存储空间。

- 页面刷新后会恢复上次内容。
- 清空草稿后会保存空白内容。
- 如果浏览器禁用本地存储，应用仍可编辑和导出，但刷新后不会恢复。

## 安全设计

- 普通文本输出前统一进行 HTML 转义。
- Markdown 链接只允许 `http:`、`https:`、`mailto:`、`tel:`、锚点和安全相对路径。
- 头像只允许本地或相对图片路径，不允许远程、`data:`、`file:` 或脚本协议。
- 不执行用户输入中的 HTML 或 JavaScript。
- 项目不加载 CDN、远程字体、统计脚本或其他网络资源。

## 项目结构

```text
markdown-resume/
├── index.html
├── css/
│   ├── app.css
│   ├── resume.css
│   └── print.css
├── js/
│   ├── app.js
│   ├── assist.js
│   ├── file.js
│   ├── frontmatter.js
│   ├── markdown.js
│   ├── pagination.js
│   ├── print.js
│   ├── renderer.js
│   └── storage.js
├── dist/
│   └── photo.jpg
├── examples/
│   └── example-resume.md
├── test/
├── package.json
└── README.md
```

## 测试

需要 Node.js 20 或更高版本：

```bash
npm test
```

测试覆盖 Front Matter、Markdown 安全渲染、简历页眉、头像路径白名单、辅助模板、统计、分页打印、文件校验、本地存储和静态应用结构。
