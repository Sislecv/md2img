import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BrandSettings, PosterSize, ThemeTokens } from "./types";
import { renderMarkdownTree } from "./markdown";
import { loadAllFonts, loadFontData, SATORI_FONT_NAMES } from "./fonts";
import satori from "satori";

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
        marginBottom: 40,
        width: "100%",
      }}
    >
      {brand.logo ? (
        <img src={brand.logo} style={{ height: 56, width: "auto", maxWidth: 240, objectFit: "contain" }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 28, fontWeight: 700, fontFamily: `"${s.fontHeading}"` }}>文</span>
        </div>
      )}
    </div>
  ) : null;

  const footer = (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 40 }}>
      <div style={{ width: 56, height: 4, borderRadius: 2, backgroundColor: accent }} />
      {brand.footerText ? (
        <div
          style={{
            marginTop: 14,
            fontSize: s.fontSize.small,
            color: s.footerColor,
            fontFamily: `"${s.fontBody}"`,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {brand.footerText}
        </div>
      ) : null}
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

export interface PrefetchedImages {
  /** 预取后的 markdown（远程 URL 替换为 data URL） */
  markdown: string;
  /** 图片尺寸表：src → 原始宽高（探测失败的图不在表中） */
  sizes: Map<string, { w: number; h: number }>;
}

/** 扫描 markdown 中所有远程图片 URL，fetch 为 data URL 并读取原始尺寸。
 *  satori 无法加载远程图片且需要显式宽高。失败/非远程则原样保留。 */
export async function prefetchImages(markdown: string): Promise<PrefetchedImages> {
  const urls = [...markdown.matchAll(IMG_URL_RE)].map((m) => m[2]);
  const uniq = [...new Set(urls)];
  const sizes = new Map<string, { w: number; h: number }>();
  if (uniq.length === 0) return { markdown, sizes };

  const resolved = await Promise.all(
    uniq.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return { url, data: url };
        const blob = await res.blob();
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("read fail"));
          reader.readAsDataURL(blob);
        });
        // 读取图片原始尺寸（data URL 可直接加载）
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
  const finalHeight = height ?? props.size.minHeight;
  const svg = await satori(buildPosterTree(props, finalHeight), {
    width: props.size.width,
    height: finalHeight,
    fonts: fonts.map((f) => ({
      name: f.name,
      weight: f.weight as 400 | 700 | 600,
      style: f.style,
      data: f.data,
    })),
  });
  return svg;
}
