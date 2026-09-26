// 主题设计令牌 —— 每套主题定义配色、字体、字号梯度、行高、间距
export interface ThemeTokens {
  id: string;
  name: string;
  /** 背景（可含渐变） */
  background: string;
  /** 可选背景图（linear-gradient 等），设置后优先于 background；用于扫描线等特殊质感 */
  backgroundImage?: string;
  category?: string;
  description?: string;
  /** 预览色块 [背景, 文字/标题, 强调色]，用于在工具栏可视化展示 */
  previewColors: [string, string, string];
  /** 外层卡片边框（如 1px solid rgba(...)） */
  border?: string;
  /** 卡片圆角（默认 0） */
  borderRadius?: number;
  /** 主文字色 */
  text: string;
  /** 标题色 */
  heading: string;
  /** 强调色（引用条、分隔线、footer、accent） */
  accent: string;
  /** 引用块背景 */
  quoteBg: string;
  /** 引用块左侧条颜色 */
  quoteBar: string;
  /** 行内代码背景 */
  codeBg: string;
  /** 代码块背景 */
  codeBlockBg: string;
  /** 代码块边框 */
  codeBlockBorder: string;
  /** 分割线颜色 */
  hr: string;
  /** 卡片内边距 */
  padding: number;
  /** 标题字体系列（satori fontFamily 名） */
  fontHeading: string;
  /** 正文字体系列 */
  fontBody: string;
  /** 代码字体 */
  fontMono: string;
  /** 正文行高（倍数） */
  lineHeight: number;
  /** 字号梯度：h1 / h2 / h3 / body / quote / code / small */
  fontSize: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    quote: number;
    code: number;
    small: number;
  };
  /** 标题字重 */
  headingWeight: 400 | 500 | 600 | 700;
  /** 标题装饰风格: "clean" | "pill" | "bar" | "underline" | "quote" | "terminal" */
  headingStyle?: "clean" | "pill" | "bar" | "underline" | "quote" | "terminal";
  /** 正文对齐：left | center */
  align: "left" | "center";
  /** 是否显示顶部品牌栏 */
  showBrandHeader: boolean;
  /** 底部 footer 文字颜色 */
  footerColor: string;
  /** 深色主题（用于决定半透明高亮/荧光笔的透明度与配色策略） */
  isDark: boolean;
  /** 代码高亮配色模式 */
  codeSyntaxTheme?: "dark" | "light" | "crt" | "aurora" | "warm";
}

export interface PosterSize {
  id: string;
  name: string;
  width: number;
  minHeight: number;
  /** 小红书竖图 3:4 / 方图 1:1 / 横图 */
  ratio: string;
}

export interface BrandSettings {
  logo?: string; // dataURL
  accentColor: string;
  footerText: string;
  /** 是否在卡片顶部显示图标（Logo 或默认占位） */
  showLogo: boolean;
  /** 可选：顶部右侧分类/标签（如 "TECH NOTES"） */
  headerTag?: string;
  /** 是否在卡片中显示日期 */
  showDate?: boolean;
}

export interface FontFace {
  name: string;
  weight: number;
  style: "normal" | "italic";
  url: string;
}
