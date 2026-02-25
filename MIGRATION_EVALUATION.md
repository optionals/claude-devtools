# 架构迁移与 TUI 方案评估报告

## 1. 概述
本报告旨在评估将 `claude-devtools` 从 Electron 迁移到更轻量级架构（如 TUI 或纯 Node/Bun 环境）的可行性与成本。目标是减少第三方依赖、降低体积并提升响应速度。

经过代码库分析与原型验证，我们确认核心业务逻辑（会话解析、指标计算、文件监控）与 Electron **高度解耦**，这使得迁移成本大幅降低。

## 2. 核心发现 (Core Findings)
- **业务逻辑解耦**：`src/main` 中的核心服务（如 `ProjectScanner`, `SessionParser`, `LocalFileSystemProvider`）仅依赖 Node.js 原生 API (`fs`, `path`)，不依赖 `electron` 模块。
- **无头运行验证**：通过 `scripts/verify-headless.ts` 脚本，我们成功验证了在不启动 Electron 的情况下，可以完整运行项目扫描与会话解析逻辑。
- **TUI 原型验证**：我们在 `src/tui` 下基于 `ink` 库实现了 TUI 原型，可以直接复用现有的 TypeScript 业务代码，开发体验与 React 一致。

## 3. 推荐方案：Node.js / Bun + TUI

这是目前性价比最高的方案，能够在复用 90% 以上现有代码的前提下，完全移除 Electron 依赖。

### 架构设计
- **运行时**：Node.js (当前) 或 Bun (未来优化体积与启动速度)。
- **UI 框架**：`ink` (基于 React 的终端 UI 库)。
- **核心逻辑**：直接引用 `src/main` 下的现有服务。
- **构建工具**：`tsx` (开发) 或 `bun build` / `pkg` (打包为单文件可执行程序)。

### 优势
1.  **零 Electron 依赖**：移除 Chromium 和 Node.js 集成环境，体积大幅减小（从 ~150MB+ 降至 Node 运行时大小或 Bun 的 ~90MB，若使用系统 Node 则为 ~5MB 脚本）。
2.  **代码复用**：无需重写复杂的 `SessionParser` 和 `jsonl` 解析逻辑。
3.  **开发效率**：保持 React 开发范式（组件化、Hooks），团队无需学习 Rust 或 Go 的 TUI 库（如 ratatui）。
4.  **响应速度**：终端渲染极快，无浏览器 DOM 开销。

### 劣势
- **体积**：相比 Rust 编译的二进制文件（<10MB），Node/Bun 打包后的可执行文件通常在 40MB-90MB 之间。
- **图表限制**：终端内绘制复杂图表（如 Token 消耗趋势图）需要使用 ASCII/Block 字符，不如 Canvas 精细。

## 4. 备选方案：Rust 重写 (Ratatui)

如果对 **极致体积** (<10MB) 和 **启动速度** (毫秒级) 有强硬要求，可考虑此方案。

### 成本分析
- **重写成本**：**高**。需要将 `src/main/services/parsing` 下的所有 TypeScript 逻辑（JSONL 解析、Token 统计、Diff 算法）用 Rust 重写。
- **UI 开发**：使用 `ratatui`。虽然性能极佳，但布局和交互逻辑比 React 更繁琐。
- **维护成本**：如果保留 Web 界面（用于 VS Code 插件等），则需要维护 TS 和 Rust 两套解析逻辑，或通过 WASM 复用 Rust 逻辑（增加了架构复杂度）。

## 5. 原型实现 (Proof of Concept)

已在代码库中实现 TUI 原型，位于 `src/tui` 目录。

### 文件结构
- `src/tui/index.tsx`: 入口文件。
- `src/tui/App.tsx`: 主应用逻辑与路由。
- `src/tui/screens/`: 包含项目列表、会话列表、会话详情（含 Metrics 展示）的组件。

### 运行方式
```bash
# 安装依赖 (已完成)
pnpm install

# 启动 TUI (开发模式)
pnpm tui
# 或
npx tsx src/tui/index.tsx
```

### 依赖变更
- 新增开发依赖：`ink` (v4.4.1), `ink-select-input`, `ink-text-input`。
- 移除运行时依赖（针对 TUI 构建）：`electron`, `electron-updater`, `fastify` (若不需要本地服务器)。

## 6. 结论与建议

建议采用 **方案 1 (Node.js/Bun + TUI)**。

**理由**：
1.  **即刻可用**：核心逻辑无需修改即可运行。
2.  **轻量化显著**：彻底摆脱 Electron，满足“减少依赖”和“体积小”的核心诉求。
3.  **扩展性**：基于 React 的 TUI 易于维护，且未来若需集成到 VS Code (作为 Webview 或 纯命令工具)，逻辑层是通用的。

**下一步行动**：
1.  完善 TUI 功能（添加搜索、Diff 视图、配置管理）。
2.  配置打包脚本（如使用 `pkg` 或迁移至 `bun` 进行单文件打包）。
3.  逐步移除 `package.json` 中 TUI 不需要的大型依赖（如 `unified` 生态若在 TUI 中不渲染 Markdown 可移除，或仅保留必要部分）。
