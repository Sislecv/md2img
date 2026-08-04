import type { FontFace } from "./types";

// 字体清单：name 与 satori 渲染时 fontFamily 对应
// 路径基于 vite BASE_URL（部署到子路径时自动正确解析）
const fontUrl = (p: string) => `${import.meta.env.BASE_URL}fonts/${p}`;

const FONT_FACES: FontFace[] = [
  { name: "Noto Sans SC", weight: 400, style: "normal", url: fontUrl("NotoSansSC-Regular.woff") },
  { name: "Noto Sans SC", weight: 700, style: "normal", url: fontUrl("NotoSansSC-Bold.woff") },
  { name: "Noto Serif SC", weight: 400, style: "normal", url: fontUrl("NotoSerifSC-Regular.woff") },
  { name: "Noto Serif SC", weight: 700, style: "normal", url: fontUrl("NotoSerifSC-Bold.woff") },
  { name: "LXGW WenKai", weight: 400, style: "normal", url: fontUrl("LXGWWenKai-Regular.woff") },
  { name: "Smiley Sans", weight: 400, style: "normal", url: fontUrl("SmileySans-Oblique.woff") },
  { name: "JetBrains Mono", weight: 400, style: "normal", url: fontUrl("JetBrainsMono-Regular.woff") },
  { name: "JetBrains Mono", weight: 700, style: "normal", url: fontUrl("JetBrainsMono-Bold.woff") },
  { name: "Inter", weight: 400, style: "normal", url: fontUrl("Inter-Regular.woff") },
  { name: "Inter", weight: 600, style: "normal", url: fontUrl("Inter-SemiBold.woff") },
  { name: "Inter", weight: 700, style: "normal", url: fontUrl("Inter-Bold.woff") },
  { name: "Playfair Display", weight: 400, style: "normal", url: fontUrl("PlayfairDisplay-400.woff") },
  { name: "Playfair Display", weight: 600, style: "normal", url: fontUrl("PlayfairDisplay-600.woff") },
  { name: "Playfair Display", weight: 700, style: "normal", url: fontUrl("PlayfairDisplay-700.woff") },
  // Fusion Pixel（像素字体）：latin 在前处理西文，zh_hans 兜底中文（单字重，无 bold）
  { name: "Fusion Pixel", weight: 400, style: "normal", url: fontUrl("FusionPixel-latin.woff") },
  { name: "Fusion Pixel", weight: 400, style: "normal", url: fontUrl("FusionPixel-zh-Hans.woff") },
];

// satori 需要的字体名子集（页面渲染时按需预加载）
export const SATORI_FONT_NAMES = ["Noto Sans SC", "Noto Serif SC", "LXGW WenKai", "Smiley Sans", "JetBrains Mono", "Inter", "Playfair Display", "Fusion Pixel"];

const cache = new Map<string, ArrayBuffer>();

export async function loadFontData(url: string): Promise<ArrayBuffer> {
  const hit = cache.get(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`字体加载失败: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  cache.set(url, buf);
  return buf;
}

export interface LoadedFont extends FontFace {
  data: ArrayBuffer;
}

/** 加载 satori 渲染所需的全部字体（懒加载 + 缓存），返回含 ArrayBuffer 的清单 */
export async function loadAllFonts(): Promise<LoadedFont[]> {
  const loaded: LoadedFont[] = [];
  await Promise.all(
    FONT_FACES.map(async (f) => {
      try {
        const data = await loadFontData(f.url);
        loaded.push({ ...f, data });
      } catch (e) {
        console.warn(`跳过字体 ${f.name} ${f.weight}:`, e);
      }
    })
  );
  return loaded;
}

/** 供浏览器 DOM 预览用的 @font-face 注入（保证预览字形与导出一致） */
export function injectPreviewFonts(): void {
  if (document.getElementById("md2img-fonts")) return;
  const style = document.createElement("style");
  style.id = "md2img-fonts";
  style.textContent = FONT_FACES.map(
    (f) =>
      `@font-face{font-family:"${f.name}";font-style:${f.style};font-weight:${f.weight};src:url("${f.url}") format("woff");font-display:swap;}`
  ).join("\n");
  document.head.appendChild(style);
}
