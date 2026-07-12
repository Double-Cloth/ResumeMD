# ResumeMD

一个完全离线、无第三方依赖的 Markdown 简历生成器。直接打开 `index.html`，即可在左侧编辑 Markdown，并在右侧实时生成 A4 简历。

## 功能

- YAML Front Matter 管理姓名、求职方向和基本信息
- 自动生成独立的“基本信息”模块，空字段不会占位
- Markdown 实时预览
- 适合中文简历的 A4 排版
- 独立打印文档导出 PDF，避免编辑器界面混入或出现空白页
- 导入、导出 `.md` 文件
- `localStorage` 自动保存
- 桌面双栏与移动端编辑/预览切换
- 无网络请求、无第三方运行时依赖
- HTML 转义和链接协议白名单

## 使用方法

1. 解压项目。
2. 双击 `index.html`。
3. 在左侧修改 Markdown。
4. 点击“导出 PDF”，在浏览器打印窗口中选择“另存为 PDF”。

不需要安装 Node.js，也不需要启动本地服务器。

## Markdown 格式

个人信息写在文件顶部的 Front Matter 中：

```markdown
---
name: 张同学
title: 软件开发实习生
phone: 13800000000
email: resume@example.com
location: 上海
website: github.com/example
education: 本科在读
experience: 3 年项目经验
---
```

支持字段：

| 字段 | 含义 |
| --- | --- |
| `name` | 姓名 |
| `title` | 求职方向或职业标题 |
| `phone` | 电话 |
| `email` | 邮箱 |
| `location` | 所在地 |
| `website` | 个人网站或 GitHub 地址 |
| `education` | 最高学历，例如“本科在读” |
| `experience` | 相关经验，例如“3 年项目经验” |
| `gender` | 性别，可选 |
| `age` | 年龄，可选 |
| `birth` | 出生日期，例如"2001.06" |
| `political` | 政治面貌，例如"中共党员" |
| `city` | 所在城市，例如"上海" |

电话、邮箱、所在地、个人主页、最高学历和相关经验会自动整理到“基本信息”模块中。未填写的字段会自动隐藏；`gender` 和 `age` 仅在确有需要时填写。

正文示例：

```markdown
## 教育背景

### 同济大学｜软件工程｜本科

`2023.09 - 2027.06`

- **专业成绩：** GPA 3.8/4.0
- **主修课程：** 数据结构、操作系统、计算机网络
```

排版约定：

- `##`：简历模块标题
- `###`：学校、公司、项目或经历标题
- 紧跟 `###` 的独立行内代码：右对齐日期
- `-` 或 `*`：无序列表
- `1.`：有序列表
- `**文字**`：粗体
- `*文字*`：斜体
- `` `文字` ``：行内代码
- `[文字](https://example.com)`：链接
- `---`：分隔线

第一版不支持表格、脚注、数学公式、代码块、嵌套列表和任意 HTML。

## 导入与导出

- 导入：支持 `.md`、`.markdown` 和 `.txt`，最大 1 MiB。
- 导出：生成 UTF-8 编码的 Markdown 文件。
- 自动保存：编辑内容保存在当前浏览器的 `localStorage` 中。

## 安全设计

- 普通文本输出前统一进行 HTML 转义。
- Markdown 链接只允许 `http:`, `https:`, `mailto:`, `tel:`、锚点和安全相对路径。
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
│   ├── file.js
│   ├── frontmatter.js
│   ├── markdown.js
│   ├── print.js
│   ├── renderer.js
│   └── storage.js
├── examples/
│   └── example-resume.md
├── test/
├── docs/
├── package.json
└── README.md
```

## 测试

需要 Node.js 20 或更高版本：

```bash
npm test
```

测试覆盖 Front Matter、Markdown 安全渲染、简历页眉、文件校验、本地存储和静态应用结构。

## 浏览器兼容性

面向当前版本的 Chrome、Edge 和 Firefox。打印效果会受浏览器页边距设置影响，导出 PDF 时建议选择：

- 纸张：A4
- 边距：无
- 缩放：100%
- 页眉和页脚：关闭
- 背景图形：可选
