import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BrandSettings, PosterSize, ThemeTokens } from "./types";
import { renderMarkdownTree } from "./markdown";
import { loadAllFonts, loadFontData, SATORI_FONT_NAMES } from "./fonts";
import satori from "satori";

import { hexToRgba } from "./typography";

export interface PosterProps {
  markdown: string;
  theme: ThemeTokens;
  size: PosterSize;
  brand: BrandSettings;
  /** markdown 图片尺寸表（src → 原始宽高），用于等比缩放 */
  imageSizes?: Map<string, { w: number; h: number }>;
}

export const MIN_CONTENT_HEIGHT = 200;

/** 组装整张卡片（品牌头部 + 正文 + footer）为 React 树；satori 与 DOM 测量共用同一棵树
 *  @param height 显式高度：satori 渲染传入（内容自适应后的总高），DOM 测量时不传（minHeight 自然撑开）
 */
export function buildPosterTree(props: PosterProps, height?: number): React.ReactElement {
  const { theme: s, size, brand } = props;
  const accent = brand.accentColor || s.accent;
  const content = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%" }}>
      {renderMarkdownTree(props.markdown, {
        theme: s,
        accent,
        imageSizes: props.imageSizes,
        contentWidth: Math.max(200, size.width - s.padding * 2),
      })}
    </div>
  );

  const hasLogo = Boolean(brand.showLogo && brand.logo);
  const showHeader = s.showBrandHeader && (hasLogo || brand.headerTag || brand.showDate);

  let logoElement: React.ReactNode = null;
  if (hasLogo && brand.logo) {
    const naturalW = brand.logoWidth || 200;
    const naturalH = brand.logoHeight || 52;
    const targetH = 48;
    const targetW = Math.max(1, Math.min(220, Math.round((targetH / naturalH) * naturalW)));
    logoElement = (
      <img
        src={brand.logo}
        width={targetW}
        height={targetH}
        style={{
          width: targetW,
          height: targetH,
          objectFit: "contain",
        }}
      />
    );
  }

  const header = showHeader ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 36,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {logoElement}
      </div>

      {(brand.headerTag || brand.showDate) ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {brand.headerTag ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 14px",
                borderRadius: 20,
                fontSize: 16,
                fontWeight: 700,
                color: accent,
                backgroundColor: hexToRgba(accent, s.isDark ? 0.2 : 0.1),
                fontFamily: `"${s.fontHeading}"`,
                letterSpacing: 0.5,
              }}
            >
              {brand.headerTag}
            </div>
          ) : null}
          {brand.showDate ? (
            <div
              style={{
                marginLeft: brand.headerTag ? 12 : 0,
                fontSize: 16,
                color: s.footerColor,
                fontFamily: `"${s.fontMono}"`,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {new Date().toISOString().slice(0, 10).replace(/-/g, ".")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null;

  const footer = (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 40 }}>
      <div
        style={{
          width: "100%",
          height: 1,
          backgroundColor: hexToRgba(s.hr, s.isDark ? 0.6 : 0.9),
          marginBottom: 16,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginRight: 10 }} />
          {brand.footerText ? (
            <div
              style={{
                fontSize: s.fontSize.small,
                color: s.footerColor,
                fontFamily: `"${s.fontBody}"`,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {brand.footerText}
            </div>
          ) : (
            <div
              style={{
                fontSize: s.fontSize.small - 2,
                color: s.footerColor,
                fontFamily: `"${s.fontMono}"`,
                opacity: 0.7,
              }}
            >
              md2img
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: size.width,
        ...(height !== undefined ? { height } : { minHeight: size.minHeight }),
        backgroundColor: s.background,
        ...(s.backgroundImage ? { backgroundImage: s.backgroundImage } : {}),
        ...(s.border ? { border: s.border } : {}),
        padding: s.padding,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {header}
      {content}
      {footer}
    </div>
  );
}

// ---------- DOM 测量（高度自适应） ----------
const measureRoot = (() => {
  let el: HTMLDivElement | null = null;
  return () => {
    if (!el) {
      el = document.createElement("div");
      el.style.position = "fixed";
      el.style.left = "-99999px";
      el.style.top = "0";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
    }
    return el;
  };
})();

// 测量互斥锁：React 19 异步渲染 + 共享单例容器，并发测量会互相污染（卸载/挂载交错）
let measureChain: Promise<unknown> = Promise.resolve();

function withMeasureLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = measureChain.then(fn, fn);
  // 链上保持错误不中断后续测量
  measureChain = run.catch(() => {});
  return run;
}

/** 在 DOM 中渲染同一棵树并测量实际内容高度（字体就绪后结果与 satori 接近） */
export function measurePosterHeight(props: PosterProps): Promise<number> {
  // 串行执行，避免并发测量互相污染
  return withMeasureLock(() => measurePosterHeightUnlocked(props));
}

async function measurePosterHeightUnlocked(props: PosterProps): Promise<number> {
  await loadAllFonts();
  // 显式加载浏览器 @font-face，确保 DOM 度量用真实字体（否则 fallback 字形行高偏小）
  await ensureBrowserFontsLoaded();
  const root = measureRoot();
  const { theme: s, size } = props;
  root.style.width = `${size.width}px`;
  const tree = buildPosterTree(props);
  const node = document.createElement("div");
  node.style.width = `${size.width}px`;
  root.appendChild(node);
  const domRoot: Root = createRoot(node);
  let measured = size.minHeight;
  await new Promise<void>((resolve) => {
    // 先挂到 document.fonts 就绪再测，避免 fallback 字形高度偏差
    document.fonts.ready.then(() => {
      domRoot.render(tree);
      // 双 rAF 等待渲染与字体生效
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          measured = Math.max(size.minHeight, node.scrollHeight);
          resolve();
        })
      );
    });
  });
  domRoot.unmount();
  root.removeChild(node);
  return measured;
}

async function ensureBrowserFontsLoaded(): Promise<void> {
  const families = [
    '"Noto Sans SC"',
    '"Noto Serif SC"',
    '"LXGW WenKai"',
    '"Smiley Sans"',
    '"JetBrains Mono"',
    '"Inter"',
    '"Playfair Display"',
    '"Fusion Pixel"',
  ];
  try {
    await Promise.all(families.map((f) => document.fonts.load(`16px ${f}`)));
    await document.fonts.ready;
  } catch {
    // 字体加载失败不阻塞，退化为现有度量
  }
}

// ---------- Markdown 图片预取 ----------
const IMG_MD_RE = /!\[([^\]]*)\]\(\s*([^\s)]+)\s*\)/g;
// 言论卡片头像（`> ![..]`）：压缩到小尺寸，避免巨型 path 干扰后续布局
const AVATAR_MD_RE = />\s*!\[([^\]]*)\]\(\s*([^\s)]+)\s*\)/g;

export interface PrefetchedImages {
  /** 预取后的 markdown（远程 URL 替换为 data URL） */
  markdown: string;
  /** 图片尺寸表：src → 原始宽高（探测失败的图不在表中） */
  sizes: Map<string, { w: number; h: number }>;
}

/** 扫描 markdown 中所有图片 URL（远程或 data URL），fetch 转为 data URL、压缩尺寸并探测实际宽高。
 *  satori 无法在浏览器安全沙箱内加载远程跨域图片，且需要显式宽高属性避免排版塌陷。
 *  言论卡片头像缩到 96px（渲染 44px），普通正文图片缩到 1000px，输出 PNG 格式保证完全兼容。 */
const MAX_BODY_W = 1000;
const MAX_AVATAR_W = 96;

async function compressBlobToPng(blob: Blob, maxW: number): Promise<{ dataUrl: string; w: number; h: number }> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read fail"));
    reader.readAsDataURL(blob);
  });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode fail"));
    img.src = raw;
  });
  const naturalW = img.naturalWidth || maxW;
  const naturalH = img.naturalHeight || maxW;
  const scale = Math.min(1, maxW / Math.max(1, naturalW));
  const targetW = Math.max(1, Math.round(naturalW * scale));
  const targetH = Math.max(1, Math.round(naturalH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: raw, w: naturalW, h: naturalH };
  ctx.drawImage(img, 0, 0, targetW, targetH);
  // 使用 PNG 格式，Satori 完美支持且不破坏透明背景
  return {
    dataUrl: canvas.toDataURL("image/png"),
    w: naturalW,
    h: naturalH,
  };
}

export async function prefetchImages(markdown: string): Promise<PrefetchedImages> {
  const urls = [...markdown.matchAll(IMG_MD_RE)].map((m) => m[2]);
  const avatarUrls = new Set([...markdown.matchAll(AVATAR_MD_RE)].map((m) => m[2]));
  const uniq = [...new Set(urls)];
  const sizes = new Map<string, { w: number; h: number }>();
  if (uniq.length === 0) return { markdown, sizes };

  const resolved = await Promise.all(
    uniq.map(async (url) => {
      // 1. 如果已经是 data URL，只需探测自然尺寸
      if (url.startsWith("data:image/")) {
        try {
          const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => reject(new Error("dim fail"));
            img.src = url;
          });
          sizes.set(url, dim);
        } catch {
          /* 探测失败静默 */
        }
        return { url, data: url };
      }

      // 2. 远程 HTTP/HTTPS 图片：先尝试直接抓取，若遇 CORS 限制则通过公开反向代理降级
      try {
        let blob: Blob | null = null;
        try {
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) blob = await res.blob();
        } catch {
          /* 直接 fetch 跨域失败 */
        }

        if (!blob) {
          try {
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=png`;
            const proxyRes = await fetch(proxyUrl);
            if (proxyRes.ok) blob = await proxyRes.blob();
          } catch {
            /* 代理失败 */
          }
        }

        if (!blob) return { url, data: url };

        const maxW = avatarUrls.has(url) ? MAX_AVATAR_W : MAX_BODY_W;
        const { dataUrl, w, h } = await compressBlobToPng(blob, maxW);
        sizes.set(url, { w, h });
        sizes.set(dataUrl, { w, h });
        return { url, data: dataUrl };
      } catch {
        return { url, data: url };
      }
    })
  );

  let out = markdown;
  resolved.forEach(({ url, data }) => {
    if (data !== url) {
      out = out.split(url).join(data);
      const dim = sizes.get(url);
      if (dim) sizes.set(data, dim);
    }
  });
  return { markdown: out, sizes };
}

// ---------- satori SVG 渲染 ----------
export async function renderPosterSvg(props: PosterProps, height?: number): Promise<string> {
  const fonts = await loadAllFonts();
  let finalHeight = height ?? props.size.minHeight;
  const satoriOpts = (h: number) => ({
    width: props.size.width,
    height: h,
    fonts: fonts.map((f) => ({
      name: f.name,
      weight: f.weight as 400 | 700 | 600,
      style: f.style,
      data: f.data,
    })),
  });
  let svg = await satori(buildPosterTree(props, finalHeight), satoriOpts(finalHeight));
  // satori 浏览器端对某些块（图片/引用后内容）布局高度会超出 DOM 测量，
  // 渲染后检测内容是否越界，越界则放大高度重渲染一次（迭代上限 3 次）
  for (let i = 0; i < 3; i++) {
    const maxBottom = detectContentBottom(svg);
    if (maxBottom <= finalHeight + 5) break;
    finalHeight = Math.ceil(maxBottom);
    svg = await satori(buildPosterTree(props, finalHeight), satoriOpts(finalHeight));
  }
  return svg;
}

/** 解析 SVG，返回内容（图片/文本 path）的最大底部 y；忽略 mask 相关元素 */
function detectContentBottom(svg: string): number {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  let maxBottom = 0;
  doc.querySelectorAll("image, path").forEach((el) => {
    if (el.tagName === "image") {
      const y = parseFloat(el.getAttribute("y") ?? "0");
      const h = parseFloat(el.getAttribute("height") ?? "0");
      if (!isNaN(y) && !isNaN(h)) maxBottom = Math.max(maxBottom, y + h);
      return;
    }
    // path：跳过 mask 里的（父元素是 mask）与 clipPath
    if (el.parentElement?.tagName === "mask" || el.parentElement?.tagName === "clipPath") return;
    const d = el.getAttribute("d") ?? "";
    // path 的 d 含多段 M，取最大 y（粗略，考虑文本基线偏移）
    let maxY = 0;
    const re = /M[\d.]+[ ,]([\d.]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d))) maxY = Math.max(maxY, parseFloat(m[1]));
    if (maxY > 0) maxBottom = Math.max(maxBottom, maxY);
  });
  return maxBottom;
}
