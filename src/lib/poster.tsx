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

  const header = s.showBrandHeader && brand.showLogo ? (
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
        {brand.logo ? (
          <img src={brand.logo} style={{ height: 52, width: "auto", maxWidth: 220, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: s.isDark && accent === "#ffe600" ? "#0f1013" : "#fff", fontSize: 24, fontWeight: 700, fontFamily: `"${s.fontHeading}"` }}>文</span>
          </div>
        )}
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

        <div
          style={{
            fontSize: s.fontSize.small - 2,
            color: s.footerColor,
            fontFamily: `"${s.fontMono}"`,
            opacity: 0.6,
          }}
        >
          {size.name}
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
const IMG_URL_RE = /(!\[[^\]]*\]\(\s*)(https?:\/\/[^)\s]+)(\s*\))/g;
// 言论卡片头像（`> ![..]`）：压缩到小尺寸，避免巨型 path 干扰后续布局
const AVATAR_URL_RE = /(>\s*!\[[^\]]*\]\(\s*)(https?:\/\/[^)\s]+)(\s*\))/g;

export interface PrefetchedImages {
  /** 预取后的 markdown（远程 URL 替换为 data URL） */
  markdown: string;
  /** 图片尺寸表：src → 原始宽高（探测失败的图不在表中） */
  sizes: Map<string, { w: number; h: number }>;
}

/** 扫描 markdown 中所有远程图片 URL，fetch 为 data URL、压缩尺寸并读取原始尺寸。
 *  satori 无法加载远程图片且需要显式宽高；过大图片会被 satori 转成巨型 path，
 *  干扰后续元素布局（导致段落爆炸/溢出），故预取时按用途压缩：
 *  言论卡片头像缩到 96px（渲染 44px），普通图片缩到 800px。 */
const MAX_BODY_W = 800;
const MAX_AVATAR_W = 96;

async function compressToDataUrl(blob: Blob, maxW: number): Promise<string> {
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
  const w = img.naturalWidth || maxW;
  const h = img.naturalHeight || maxW;
  const scale = Math.min(1, maxW / Math.max(1, w));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function prefetchImages(markdown: string): Promise<PrefetchedImages> {
  const urls = [...markdown.matchAll(IMG_URL_RE)].map((m) => m[2]);
  const avatarUrls = new Set([...markdown.matchAll(AVATAR_URL_RE)].map((m) => m[2]));
  const uniq = [...new Set(urls)];
  const sizes = new Map<string, { w: number; h: number }>();
  if (uniq.length === 0) return { markdown, sizes };

  const resolved = await Promise.all(
    uniq.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return { url, data: url };
        const blob = await res.blob();
        const maxW = avatarUrls.has(url) ? MAX_AVATAR_W : MAX_BODY_W;
        const data = await compressToDataUrl(blob, maxW);
        // 读取压缩后图片的原始尺寸
        try {
          const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => reject(new Error("dim fail"));
            img.src = data;
          });
          sizes.set(url, dim);
        } catch {
          /* 尺寸探测失败不影响使用 */
        }
        return { url, data };
      } catch {
        return { url, data: url }; // 网络失败保留原文，satori 会跳过该图
      }
    })
  );

  let out = markdown;
  resolved.forEach(({ url, data }) => {
    if (data !== url) {
      out = out.replace(url, data);
      // 同时记录 data URL → 尺寸（渲染时 src 已被替换为 data URL）
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
