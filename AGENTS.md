# AGENTS.md

## 工作台项目规则

- 本地工作台由 `server.mjs` 提供 API 与静态文件，前端在 `public/`（无构建步骤，纯 HTML/CSS/JS）。
- 修改前端界面、组件、配色、布局前，**必须先阅读根目录 `DESIGN.md`**，并保持「苹果浅暖」风格；禁止退回深色科技风。
- UI 设计完整规范见 `integrations/awesome-design-md/design-md/apple/DESIGN.md`（本机已安装）。
- 数据流水线核心在 `scripts/pipeline.mjs`；`server.mjs` 内 `process` 是局部函数名，读取环境变量用 `globalThis.process.env`。
- 自动扫描/定时通过 `config.json -> workflow.scanMinutes` 与顶部选择器控制。
- 分发平台内置 8 个：抖音 / 小红书 / 微博 / 视频号 / YouTube / X / TikTok / Instagram。新增平台需同步修改 `public/app.js`、`server.mjs`、`config.json`、`public/index.html` 四处。
- 信息源：`config.json -> sources` 是央媒/部委官方源；`category_sources.json` 是分类站点源（国际已含 20 个全球站点）。采集时会自动合并去重。
- 大数据目录 `data/`、本地集成 `integrations/*`（capcut-mate、awesome-design-md、worldmonitor、MoneyPrinterTurbo）不提交，仅作本地运行/参考。
- 视频引擎选择在 `public/index.html #video-engine`；新增引擎需同步 `scripts/moneyprinter.mjs`（或对应适配器）、`server.mjs /api/make-video`、`config.json` 的 `ai.videoModel`。
