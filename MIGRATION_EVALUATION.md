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

## 5. 方案对比：TUI 模式 vs 原生 Server 模式 (Standalone)

代码库中已包含 `Standalone Server` (基于 Fastify)，用于 Docker 部署。本节对比 **Server 模式** 与 **TUI 模式** 的差异，以回应“为了 TUI 而 TUI，引入新依赖”的质疑。

| 特性 | TUI 模式 (Terminal UI) | Server 模式 (Standalone) |
| :--- | :--- | :--- |
| **交互界面** | 纯终端字符界面 (ink) | 完整 Web UI (React/Browser) |
| **依赖变更** | 移除 Electron / Fastify<br>新增 `ink` (~180KB) | 移除 Electron<br>保留 `fastify`, `react-dom` |
| **运行时环境** | 仅需 Terminal | Terminal (后端) + Browser (前端) |
| **使用场景** | SSH 远程操作、纯键盘党、低资源环境 | 本地开发、需要富文本/图表展示 |
| **体积 (Bun打包后)** | ~90MB (包含 UI 渲染逻辑) | ~95MB (包含静态资源) |
| **体验差异** | **无上下文切换**，沉浸式操作 | 需切换到浏览器窗口 |

**分析结论**：
- 如果目标仅仅是“移除 Electron”，**Server 模式** 是现成的且成本最低（零新代码，零新依赖）。
- **TUI 模式** 的核心价值在于 **Usage Context**（使用场景）：它解决了在远程服务器（SSH）上查看日志时，无需配置端口转发、无需打开浏览器的痛点。
- 关于依赖：TUI 引入的 `ink` 及其依赖（`yoga-layout` 等）相比 Electron 的体积是微不足道的。若使用 Server 模式，虽然不引入 `ink`，但运行时仍需携带完整的前端构建产物（HTML/CSS/JS）。

## 6. 安全评估 (Security Assessment)

针对当前代码库及迁移方案的安全审计结果：

### 6.1 依赖风险
- **Electron 生态**：当前 `electron-builder` 依赖的 `tar` 包存在多个高危漏洞（路径遍历、符号链接攻击）。**迁移到 TUI/Server 模式将直接消除此风险**，因为不再需要打包 Electron 应用。
- **Markdown 渲染**：Web/Electron 端使用 `react-markdown`。虽然库本身默认防御 XSS，但若配置不当（如启用 `rehype-raw` 或 `dangerouslySetInnerHTML`）可能存在风险。
    - **TUI 优势**：TUI 模式不使用 HTML 渲染引擎，天然免疫 XSS 攻击。Markdown 仅作为纯文本或格式化文本展示。

### 6.2 代码风险
- **文件系统访问**：`LocalFileSystemProvider` 直接使用 `fs.promises`。虽然目前主要用于读取 `~/.claude`，但缺乏严格的沙箱机制（如 chroot）。
    - **建议**：在 `LocalFileSystemProvider` 中增加路径校验，确保只能访问 `~/.claude` 或显式授权的项目目录，防止路径遍历（`../`）。
- **远程命令执行 (RCE)**：
    - `SshConnectionManager` 包含 `execRemoteCommand` 功能，这是设计所需（用于获取远程项目路径）。
    - **风险**：如果恶意构造的 `host` 配置被注入，可能导致连接到恶意服务器。
    - **缓解**：仅信任 `~/.ssh/config` 中的配置和用户输入的连接信息。
- **网络暴露**：
    - **Server 模式**：默认监听 `0.0.0.0`（在 Docker 中）。若在宿主机直接运行，建议绑定到 `127.0.0.1` 以防止局域网访问。
    - **TUI 模式**：无网络监听端口，攻击面最小。

### 6.3 结论
从安全角度看，**TUI 模式是最安全的架构**。它移除了浏览器引擎（XSS 攻击面）、Electron 构建链（供应链漏洞）和 HTTP 服务端口（网络攻击面），仅保留最核心的本地文件读取逻辑。

## 7. 构建系统与 Electron 依赖 (Build System)

### 7.1 为什么需要 `electron-vite`？
当前项目使用 `electron-vite` 是因为它是为 Electron 应用设计的。它通过多入口配置同时构建：
- **Main Process** (`dist-electron/main`)：Node.js 环境。
- **Preload Scripts** (`dist-electron/preload`)：桥接环境。
- **Renderer Process** (`out/renderer`)：React 前端资源。

### 7.2 Server 模式需要 Electron 吗？
**不需要**。目前的 Server 模式 (`src/main/standalone.ts`) 是一个纯 Node.js 服务。
但 `package.json` 中的 `standalone:build` 脚本调用了 `electron-vite build`，这仅仅是为了利用现有的配置来构建 React 前端资源 (`out/renderer`)。

### 7.3 优化方案
我们已验证（见 `vite.renderer.config.ts`），可以使用纯 `vite` 构建前端资源，从而彻底移除对 `electron` 和 `electron-vite` 的依赖。

**剥离步骤**：
1.  **Server 模式**：使用 `vite build -c vite.renderer.config.ts` 构建前端，使用 `tsc` 或 `esbuild` 构建后端 (`src/main/standalone.ts`)。
2.  **TUI 模式**：使用 `tsc` 或 `esbuild` 直接构建 `src/tui/index.tsx`，无需构建任何 Web 前端资源。

**结论**：`electron-vite` 仅是当前构建流的一部分遗留，并非 Server/TUI 模式的技术硬性依赖。迁移后可以完全移除。

## 8. 原型实现 (Proof of Concept)

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
