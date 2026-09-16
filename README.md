# 智能简历构建器

一款纯前端智能简历构建器，支持本地多版本简历管理、模块化编辑、模板切换、A4 预览、PDF 导出与**多语言对照**。

## 功能列表

- **多语言对照台**：同一份简历维护中文、英文等多个语言版本；各版本沿用相同模块顺序与条目身份（id），只替换可翻译文字，姓名、日期、联系方式、学历枚举、熟练度等结构信息跨语言对应。
- **待复核工作流**：原文更新后，已有译文自动标记「待复核」并保留旧译文；未翻译字段回退显示原文；可逐字段「复核通过」，也可一键复核整份语言。
- **语言管理**：语言胶囊切换贯穿编辑/预览/导出；可从现有版本复制内容起步添加新语言，支持常用语言预设与自定义语言码；可移出某个语言版本而不影响其它语言（原文语言不可移出）。
- 简历列表：创建、复制、删除多份简历版本（整份复制深拷贝隔离）。
- 简历编辑器：左侧模块拖拽排序，中间按当前语言结构化编辑，右侧实时预览。
- 模板选择：内置 6 套简历模板，可应用到当前简历并作为新建默认模板。
- PDF 导出预览：选择语言版本后按 A4 比例预览，支持页边距、字号调整和 PDF 导出（文件名使用当前语言标题）。
- 个人资料：维护姓名、联系方式、头像、求职意向等全局资料，标题/城市/意向/摘要支持多语言。
- 本地持久化：简历、个人资料、主题偏好和模板偏好存储在 localStorage。
- JSON 导入导出：完整工作区备份（含 `version: 2`、各语言译文与待复核状态）；**旧备份（无多语言数据的 v1）导入时自动迁移为中文原文版本，仍可正常打开**。
- 主题切换：亮色/暗色主题，所有组件通过 CSS 变量消费主题色。

## 多语言数据模型

- `Resume.i18n = { languages: LangVariant[], sourceLanguage }`：`languages[0]` 为原文语言（默认 `zh-CN`），不可删除。
- 可翻译字段类型为 `LocalField = string | { values: { [lang]: string }, stale?: { [lang]: true } }`；列表型为 `LocalListField = string[] | { values: { [lang]: string[] }, stale? }`。裸 `string`/`string[]` 仅用于 v1 旧数据。
- **共享结构**：所有 `id`、模块顺序与开关（`sections`）、`startDate/endDate`、枚举与熟练度、`fullName/phone/email/website/avatarUrl`、`templateId`。
- 核心纯函数位于 `src/utils/i18n.ts`（取值回退、写原文置待复核、写译文清标记、复制/移出语言、整份复核、计数）；v1→v2 迁移位于 `src/utils/migration.ts`，在 store 启动与备份导入两个入口统一执行。
- 逻辑自检：`npx tsc scripts/i18n.selftest.ts --outDir /tmp/selftest --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --moduleResolution node && node /tmp/selftest/scripts/i18n.selftest.js`

## 快速启动

```bash
cd frontend
npm install
npm run dev
```

开发服务器端口固定为 `28310`：

```text
http://localhost:28310
```

构建与预览：

```bash
npm run build
npm run preview
```

## 测试

统一入口（先自动构建，再起 Vite 预览服务器并跑 Chromium E2E）：

```bash
npm run test:e2e
```

- 多语言纯函数自检：`npm run i18n:selftest`
- 页面测试位于 `frontend/e2e/multilingual.spec.ts`，通过真实页面入口驱动，覆盖：语言添加/译文编辑/原文变化/逐字段复核与刷新持久化、列表清空后保持为空、未翻译语言回退原文、原文变化后清空版本进入待复核、导出语言首次继承编辑选择且手动切换不回写编辑页、移出语言后导出回退现存语言、关闭重开保持、复制简历后多语言数据深拷贝独立、备份真实文件导出再导入往返，以及旧版（无多语言数据）备份迁移后可正常打开。
- 首次运行需安装浏览器：`npx playwright install chromium`。Playwright 会自动复用本机已运行的 28310 预览服务。
- 无 root 的受限环境可把 Chromium 系统依赖解压到 `~/.local/chromium-libs`，`playwright.config.ts` 会自动通过 `LD_LIBRARY_PATH` 注入。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 样式 | Tailwind CSS + SCSS CSS Variables |
| 无障碍交互 | Headless UI |
| 状态管理 | Zustand |
| 拖拽排序 | react-beautiful-dnd |
| PDF 导出 | html2canvas + jsPDF |
| 日期工具 | dayjs |
| 数据持久化 | localStorage |

## 目录结构

```text
frontend/
├── public/
├── src/
│   ├── api/
│   ├── stores/
│   ├── types/
│   ├── components/
│   │   ├── common/
│   │   ├── editor/
│   │   └── preview/
│   ├── hooks/
│   ├── pages/
│   ├── router/
│   ├── styles/
│   └── utils/
│       ├── i18n.ts        # 多语言取值/写入/待复核/复制移出 纯函数
│       └── migration.ts   # v1 单语言 -> v2 多语言迁移
├── scripts/
│   └── i18n.selftest.ts   # 多语言核心逻辑自检
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 功能截图占位

### 简历列表

> 待补充截图：多版本简历卡片、JSON 导入导出、新建入口。

### 简历编辑器

> 待补充截图：模块拖拽排序、结构化编辑、实时预览三栏布局。

### 模板选择

> 待补充截图：6 套模板缩略图和右侧实时预览。

### PDF 导出预览

> 待补充截图：A4 比例预览和导出设置面板。

## License

MIT

