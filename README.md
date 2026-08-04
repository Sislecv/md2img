# md2img · Markdown 转图片

**Markdown 进，宣传图出。** 面向中文技术博主 / 自媒体作者的高质量宣传图生成工具：粘贴 Markdown，实时预览，一键导出适合朋友圈、公众号、小红书、V2EX 的社交分享图。

纯前端、本地渲染、无需登录，部署即用（GitHub Pages / Cloudflare Pages 均可）。

在线体验：https://sislecv.github.io/md2img/

## 特性

### 排版
- **Markdown 全语法**：标题、加粗、斜体、列表、引用、行内代码、代码块、分割线、图片
- **中文排版优化**：中英文混排自动插入 0.25em 空隙、连续标点压缩、中文引号规范化，代码块不受影响
- **实时预览**：右侧所见即所得，预览与导出一致（同一份 SVG 渲染）

### 主题（5 套）
| 主题 | 风格 |
|---|---|
| 简约白 | 白底黑字，思源黑体，大留白 |
| 暗夜代码 | 深炭蓝黑 + 霓虹青绿，代码编辑器氛围 |
| 暖色文艺 | 奶油底 + 霞鹜文楷，书卷气 |
| 墨绿极简 | 墨绿 + 米白，思源宋体 |
| 复古 CRT | 深绿屏幕 + 磷光绿 + 扫描线 + **像素字体** |

### 品牌系统
- 上传 Logo（自动压缩 ≤400px）、自定义主题色、Footer 文字
- 图标显示开关（可隐藏顶部品牌栏）
- 设置保存在本地浏览器，之后所有导出自动带上

### 导出
- 尺寸：1080×1350（小红书）/ 1080×1080（朋友圈）/ 1200×630（横图）/ **自定义宽高**
- 2x 高清 PNG，内容超出自动增高，不裁切
- 导出的 PNG 与预览像素级一致

### 界面
- 响应式：桌面双栏，移动端"编辑 / 预览"Tab 切换
- UI 暗色模式（暖调炭黑，跟随系统 / 手动切换）

## 使用指南

### 基本操作
1. 左侧输入 / 粘贴 Markdown（工具栏可快速插入语法）
2. 右侧实时预览，切换主题、尺寸
3. 打开"品牌设置"配置 Logo / 主题色 / Footer / 图标
4. 点击"导出 PNG"下载

### 特殊语法

**他人言论卡片** —— 引用块首行以 `@` 开头时，自动渲染为头像 + 加粗昵称的引用卡片：

```markdown
> @独立开发者老张
> ![头像](https://example.com/avatar.png)
> 工具就该小而美，先服务好 100 个用户。
```

头像可省略（显示昵称首字圆形占位）；远程头像自动预取，也可用本地图片或 data URL。

**普通引用** —— 不满足言论卡片语法时保持荧光笔高亮样式：

```markdown
> 这是普通引用，渲染为荧光笔高亮色带。
```

**图片**：

```markdown
![配图](https://example.com/photo.jpg)
```

远程图片自动预取为 data URL，按内容宽度等比缩放、居中显示。

### 自定义尺寸
尺寸下拉选择"自定义尺寸"后，可输入宽高（200–4000px），预览与导出实时生效。

## 本地开发

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # 构建到 dist/
npm run preview    # 预览生产构建
```

## 技术架构

```
Markdown ──► markdown-it tokens ──► JSX 树 ──► satori ──► SVG ──► 预览 / 导出
              (token 级渲染)      (主题+品牌)   (字体注入)  (canvas 2x → PNG)
```

- **单渲染管线**：预览与导出共用同一份 SVG，所见即所得
- **文本层中文排版**（`lib/typography.ts`）：混排空隙 / 标点压缩 / 引号规范化在渲染前处理，代码块跳过
- **字体系统**：6 款开源字体（思源黑体/宋体、霞鹜文楷、得意黑、Inter、JetBrains Mono、Playfair Display）+ Fusion Pixel 像素字体，fonttools 子集化为 GB2312 WOFF（1–3MB/个），按需加载
- **高度自适应**：DOM 测量内容高度（带互斥锁 + 字体就绪等待），超出最小高度自动增高
- 状态持久化：localStorage（含旧版本 key 自动迁移）

## 部署

### GitHub Pages

仓库已配置 Actions workflow（`.github/workflows/deploy.yml`），推送 `main` 自动构建部署。

若 fork 到自己的仓库，更新 `vite.config.ts` 的 `base` 为 `/你的仓库名/`。

### Cloudflare Pages

```bash
npm run build
```

构建输出 `dist/`，在 Cloudflare Pages 选择"直接上传"或连接仓库构建（构建命令 `npm run build`，输出目录 `dist`）。

## 许可

- 代码：MIT
- 字体：思源黑体/宋体、霞鹜文楷、得意黑、Inter、JetBrains Mono、Playfair Display、Fusion Pixel 均为开源许可（SIL OFL 等），已子集化
- 示例图片：picsum.photos 随机占位图
