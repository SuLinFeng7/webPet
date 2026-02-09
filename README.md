# webPet（Chrome 浏览器宠物插件）项目雏形

目标：先搭建 **可扩展、规范化** 的浏览器插件骨架（Chrome/Manifest V3），后续逐步迭代“宠物在网页游荡、点击交互/对话、浏览数据记录”等能力。

## 目录结构

- `public/`
  - `manifest.json`：扩展清单（MV3）
  - `assets/`：图标等静态资源
- `src/`
  - `background/`：后台 Service Worker（事件、存储、数据采集协调）
  - `content/`：内容脚本（注入到网页，负责宠物渲染/交互）
  - `ui/`
    - `popup/`：插件弹窗 UI
    - `options/`：设置页 UI
  - `shared/`：跨端共享（types、消息协议、utils）
- `scripts/`：构建脚本（esbuild 打包到 `dist/`）
- `dist/`：构建产物（用于 Chrome 加载，gitignore）

## 开发准备

需要 Node.js（建议 18+ 或 20+）。

## 安装依赖

```bash
npm install
```

## 构建

```bash
npm run build
```

构建后会生成 `dist/`，里面包含：
- `dist/manifest.json`
- `dist/background/service-worker.js`
- `dist/content/content-script.js`
- `dist/ui/popup/*`
- `dist/ui/options/*`

## 在 Chrome 里加载

- 打开 `chrome://extensions`
- 打开“开发者模式”
- 点击“加载已解压的扩展程序”
- 选择本项目的 `dist/` 目录

## 接下来（路线）

- 宠物渲染：Canvas/WebComponent/DOM Sprite（先从 DOM overlay 起步）
- 宠物行为：状态机（idle/walk/drag/talk/sleep）
- 通信：content ↔ background（统一消息协议）
- 数据：浏览事件采集（权限最小化），存储（chrome.storage）

