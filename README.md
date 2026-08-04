# md2img · Markdown 转图片

面向中文技术博主/自媒体作者的高质量宣传图生成工具。粘贴 Markdown，一键导出适合朋友圈 / 公众号 / 小红书 / V2EX 的社交分享图，自带品牌化样式与中文排版优化。

纯前端、本地渲染、无需登录，可部署到 GitHub Pages / Cloudflare Pages。

## 功能

- **Markdown 编辑 + 实时预览**：标题、加粗、斜体、列表、引用、行内代码、代码块、分割线、图片
- **中文排版优化**：中英文混排自动加 0.25em 空隙、标点压缩、中文引号规范化
- **5 套主题**：简约白 / 暗夜代码 / 暖色文艺 / 墨绿极简 / 复古 CRT（像素字体 + 扫描线）
- **他人言论卡片**：`> @昵称` + `> ![头像](url)` + 内容，自动渲染为头像 + 加粗昵称的引用卡片
- **品牌系统**：Logo 上传、主题色、Footer 文字、图标显示开关，设置一次自动带出
- **导出 PNG**：1080×1350 / 1080×1080 / 1200×630 / 自定义尺寸，2x 高清，内容高度自适应
- **UI 暗色模式**：暖调炭黑配色，跟随系统 / 手动切换

## 快速开始

```bash
npm install
npm run dev        # 本地开发 http://127.0.0.1:5173
npm run build      # 构建到 dist/
```

## 技术栈

Vite 6 + React 19 + TypeScript + Tailwind CSS v4，markdown-it 解析，satori 渲染 SVG，canvas 2x 导出 PNG。

## 版权与许可

- 代码：MIT
- 字体：思源黑体/宋体、霞鹜文楷、得意黑、Inter、JetBrains Mono、Playfair Display、Fusion Pixel 均为开源许可（OFL 等），已子集化处理
- 示例图片来自 picsum.photos（随机占位图）
