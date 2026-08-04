import type { ThemeTokens, PosterSize } from "./types";

export const THEMES: ThemeTokens[] = [
  {
    id: "clean",
    name: "简约白",
    background: "#ffffff",
    text: "#333333",
    heading: "#111111",
    accent: "#2563eb",
    quoteBg: "#f5f7fb",
    quoteBar: "#2563eb",
    codeBg: "#f1f3f5",
    codeBlockBg: "#f8f9fa",
    codeBlockBorder: "#e9ecef",
    hr: "#e9ecef",
    padding: 72,
    fontHeading: "Noto Sans SC",
    fontBody: "Noto Sans SC",
    fontMono: "JetBrains Mono",
    lineHeight: 1.8,
    fontSize: { h1: 56, h2: 38, h3: 30, body: 30, quote: 26, code: 22, small: 20 },
    headingWeight: 700,
    align: "left",
    showBrandHeader: true,
    footerColor: "#999999",
    isDark: false,
  },
  {
    id: "dark",
    name: "暗夜代码",
    // 深炭蓝黑（Night Owl 风格），比默认 slate 更有层次
    background: "#0b1020",
    text: "#b8c7e0",
    heading: "#e8f1ff",
    accent: "#38e1d8",
    quoteBg: "#131a30",
    quoteBar: "#38e1d8",
    codeBg: "#131a30",
    codeBlockBg: "#0d1428",
    codeBlockBorder: "#1e2a4a",
    hr: "#1e2a4a",
    padding: 72,
    fontHeading: "Noto Sans SC",
    fontBody: "Noto Sans SC",
    fontMono: "JetBrains Mono",
    lineHeight: 1.8,
    fontSize: { h1: 56, h2: 38, h3: 30, body: 30, quote: 26, code: 22, small: 20 },
    headingWeight: 700,
    align: "left",
    showBrandHeader: true,
    footerColor: "#5c6b8a",
    isDark: true,
  },
  {
    id: "warm",
    name: "暖色文艺",
    background: "#faf6ef",
    text: "#4a3f35",
    heading: "#2d2620",
    accent: "#c2703d",
    quoteBg: "#f3ece0",
    quoteBar: "#c2703d",
    codeBg: "#efe7da",
    codeBlockBg: "#f5efe6",
    codeBlockBorder: "#e5dccb",
    hr: "#e0d5c0",
    padding: 72,
    fontHeading: "LXGW WenKai",
    fontBody: "LXGW WenKai",
    fontMono: "JetBrains Mono",
    lineHeight: 1.9,
    fontSize: { h1: 56, h2: 38, h3: 30, body: 30, quote: 26, code: 22, small: 20 },
    headingWeight: 700,
    align: "left",
    showBrandHeader: true,
    footerColor: "#a09080",
    isDark: false,
  },
  {
    id: "serif",
    name: "墨绿极简",
    background: "#eef3ef",
    text: "#33413a",
    heading: "#1d2a24",
    accent: "#1f6f50",
    quoteBg: "#e4ece6",
    quoteBar: "#1f6f50",
    codeBg: "#dfe8e2",
    codeBlockBg: "#e8efe9",
    codeBlockBorder: "#d3ded6",
    hr: "#cfdcd3",
    padding: 72,
    fontHeading: "Noto Serif SC",
    fontBody: "Noto Serif SC",
    fontMono: "JetBrains Mono",
    lineHeight: 1.85,
    fontSize: { h1: 56, h2: 38, h3: 30, body: 30, quote: 26, code: 22, small: 20 },
    headingWeight: 700,
    align: "left",
    showBrandHeader: true,
    footerColor: "#7d8f85",
    isDark: false,
  },
  {
    id: "crt",
    name: "复古 CRT",
    // 老式单色显示器：深绿黑屏幕 + 磷光绿 + 荧光绿 accent + 扫描线
    background: "#0a120c",
    backgroundImage:
      "linear-gradient(rgba(0, 255, 65, 0.05) 50%, rgba(0, 0, 0, 0) 50%)",
    text: "#37d968",
    heading: "#a4ffc2",
    accent: "#00ff41",
    quoteBg: "#0f1c13",
    quoteBar: "#00ff41",
    codeBg: "#0f1c13",
    codeBlockBg: "#060d08",
    codeBlockBorder: "#173a22",
    hr: "#173a22",
    padding: 72,
    fontHeading: "Fusion Pixel",
    fontBody: "Fusion Pixel",
    fontMono: "Fusion Pixel",
    lineHeight: 1.8,
    fontSize: { h1: 56, h2: 38, h3: 30, body: 30, quote: 26, code: 22, small: 20 },
    headingWeight: 700,
    align: "left",
    showBrandHeader: true,
    footerColor: "#2a5c3a",
    isDark: true,
  },
];

export const SIZES: PosterSize[] = [
  { id: "xiaohongshu", name: "小红书竖图", width: 1080, minHeight: 1350, ratio: "3:4" },
  { id: "square", name: "朋友圈方图", width: 1080, minHeight: 1080, ratio: "1:1" },
  { id: "landscape", name: "公众号横图", width: 1200, minHeight: 630, ratio: "16:9" },
  { id: "custom", name: "自定义尺寸", width: 1080, minHeight: 1350, ratio: "自定义" },
];

export const CUSTOM_SIZE_LIMITS = { min: 200, max: 4000 };

export function getSize(id: string): PosterSize {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}

export function getTheme(id: string): ThemeTokens {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** 自定义尺寸：返回可编辑的宽/高（minHeight 即高度） */
export function getCustomSize(custom: { width: number; height: number }): PosterSize {
  const clamp = (n: number) => Math.min(CUSTOM_SIZE_LIMITS.max, Math.max(CUSTOM_SIZE_LIMITS.min, Math.round(n) || CUSTOM_SIZE_LIMITS.min));
  return {
    id: "custom",
    name: "自定义尺寸",
    width: clamp(custom.width),
    minHeight: clamp(custom.height),
    ratio: `${clamp(custom.width)}×${clamp(custom.height)}`,
  };
}
