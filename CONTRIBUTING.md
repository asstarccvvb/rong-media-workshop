# 贡献指南

感谢你对融媒工坊的关注！欢迎提交 Issue、Pull Request 或建议。

---

## 快速参与

### 报告问题

1. 在 [Issues](../../issues) 搜索是否已有相同问题
2. 新建 Issue，请包含：
   - 操作系统与 Node.js 版本
   - 复现步骤
   - 预期行为 vs 实际行为
   - 相关日志（终端输出或浏览器控制台报错）

### 提交代码

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/your-feature`
3. 提交改动：`git commit -m "feat: 简述改动内容"`
4. 推送分支：`git push origin feature/your-feature`
5. 发起 Pull Request，描述改动目的与测试情况

---

## 本地开发

### 环境准备

```bash
# 需要 Node.js >= 18，无需 npm install
node server.mjs
# 浏览器打开 http://127.0.0.1:3211
```

### 项目约定

| 约定 | 说明 |
|---|---|
| 无构建步骤 | 前端纯 HTML/CSS/JS，后端纯 Node.js，不使用 Webpack/Vite 等构建工具 |
| 无 npm 依赖 | `package.json` 仅声明 scripts，不引入第三方运行时依赖 |
| Apple 浅暖风格 | 修改 UI 前必须阅读 `DESIGN.md`，禁止深色科技风 |
| AGENTS.md 规则 | AI 辅助开发时遵循 `AGENTS.md` 中的规则 |
| 数据目录 | `data/` 不提交，仅存本地运行产出 |
| 集成目录 | `integrations/` 不提交，仅作本地运行参考 |

### 修改 UI

1. 先读 `DESIGN.md` 了解颜色 Token、控件规范、禁止事项
2. 前端代码在 `public/` 下：`index.html`（结构）、`app.js`（逻辑）、`styles.css`（样式）
3. 新增页面/组件默认遵循浅暖 Apple 风格
4. 禁止引入深色底、霓虹光晕、CRT 效果

### 修改流水线

- 核心逻辑在 `scripts/pipeline.mjs`
- `server.mjs` 中 `process` 是局部函数名，读取环境变量用 `globalThis.process.env`
- 新增分发平台需同步修改：`public/app.js`、`server.mjs`、`config.json`、`public/index.html` 四处
- 新增视频引擎需同步修改：对应适配器脚本、`server.mjs /api/make-video`、`config.json` 的 `ai.videoModel`

---

## Commit 信息规范

使用前缀 + 简述的格式：

| 前缀 | 场景 |
|---|---|
| `feat:` | 新功能 |
| `fix:` | 修复 Bug |
| `refactor:` | 重构（不改变功能） |
| `style:` | UI / 样式调整 |
| `docs:` | 文档更新 |
| `chore:` | 构建 / 配置 / 杂项 |

示例：

```
feat: 新增 B站分发平台支持
fix: 修复 RSS 抓取编码乱码问题
style: 调整图谱节点间距与连线颜色
docs: 补充 Ollama 接入说明
```

---

## Pull Request 检查清单

- [ ] 已阅读 `DESIGN.md`，UI 改动保持 Apple 浅暖风格
- [ ] 已阅读 `AGENTS.md`，遵守项目开发规则
- [ ] 新功能已在本地测试通过
- [ ] 未提交 `data/`、`integrations/`、密钥等敏感内容
- [ ] Commit 信息符合规范
- [ ] PR 描述清晰，关联相关 Issue

---

## 项目结构速查

```
config.json              # 配置入口（信源、AI、平台、引擎）
server.mjs               # API 服务端
scripts/pipeline.mjs     # 流水线核心
public/                  # 前端界面
docs/                    # 工作流文档
DESIGN.md                # UI 设计规范
AGENTS.md                # 开发规则
```

---

## 行为准则

请保持友善和建设性的讨论。对不同意见求同存异，对新手友好包容。

感谢你的贡献！
