import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import React from "react";
import type { ThemeTokens } from "./types";
import { formatCjkText, hexToRgba } from "./typography";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

export interface RenderCtx {
  theme: ThemeTokens;
  accent: string;
  /** markdown 图片尺寸表（src → 原始宽高） */
  imageSizes?: Map<string, { w: number; h: number }>;
  /** 内容区宽度（卡片宽 - 2×padding），图片等比缩放上限 */
  contentWidth?: number;
}

function inlineChildren(tok: Token): Token[] {
  return tok.children ?? [];
}

// ---------- 行内 token → React 节点 ----------
function renderInline(children: Token[], ctx: RenderCtx, keyPrefix: string): React.ReactNode[] {
  const s = ctx.theme;
  const out: React.ReactNode[] = [];
  let k = 0;
  for (const tok of children) {
    const key = `${keyPrefix}-${k++}`;
    switch (tok.type) {
      case "text":
        out.push(formatCjkText(tok.content));
        break;
      case "strong":
        out.push(
          <strong key={key} style={{ fontWeight: 700 }}>
            {renderInline(inlineChildren(tok), ctx, key)}
          </strong>
        );
        break;
      case "em":
        out.push(<em key={key}>{renderInline(inlineChildren(tok), ctx, key)}</em>);
        break;
      case "code": {
        // 行内代码：accent 色文字 + accent 浅底，比灰底更精致
        out.push(
          <code
            key={key}
            style={{
              fontFamily: `"${s.fontMono}"`,
              fontSize: s.fontSize.code,
              color: ctx.accent,
              backgroundColor: hexToRgba(ctx.accent, ctx.theme.isDark ? 0.22 : 0.1),
              padding: "1px 7px",
              borderRadius: 5,
              fontWeight: 600,
            }}
          >
            {tok.content}
          </code>
        );
        break;
      }
      case "link":
        out.push(
          <a key={key} href={tok.attrGet("href") ?? "#"} style={{ color: ctx.accent, textDecoration: "underline" }}>
            {renderInline(inlineChildren(tok), ctx, key)}
          </a>
        );
        break;
      case "image": {
        const src = tok.attrGet("src") ?? "";
        // 等比缩放：卡片内容宽为上限，居中显示
        const contentW = ctx.contentWidth ?? Math.max(200, 1080 - s.padding * 2);
        const dim = ctx.imageSizes?.get(src);
        let imgW = contentW;
        let imgH: number | undefined;
        if (dim && Number.isFinite(dim.w) && dim.w > 0 && Number.isFinite(dim.h) && dim.h > 0) {
          imgW = Math.min(contentW, dim.w);
          imgH = Math.round((imgW / dim.w) * dim.h);
        }
        out.push(
          <div
            key={key}
            style={{ display: "flex", justifyContent: "center", marginBottom: 20, width: "100%" }}
          >
            <img
              src={src}
              alt={tok.content}
              width={imgW}
              height={imgH ?? imgW}
              style={{
                width: imgW,
                height: imgH ?? "auto",
                borderRadius: 10,
                objectFit: "cover",
              }}
            />
          </div>
        );
        break;
      }
      case "s":
      case "del":
        out.push(
          <s key={key} style={{ textDecoration: "line-through" }}>
            {renderInline(inlineChildren(tok), ctx, key)}
          </s>
        );
        break;
      case "br":
        out.push(<br key={key} />);
        break;
      case "softbreak":
        out.push("\n");
        break;
      default:
        if (tok.content) out.push(tok.content);
        else if (tok.children) out.push(...renderInline(inlineChildren(tok), ctx, key));
        break;
    }
  }
  return out;
}

// ---------- 块级 token → React 节点 ----------
interface BlockCtx extends RenderCtx {
  orderedCounters: number[];
}

function renderBlocks(tokens: Token[], ctx: BlockCtx): React.ReactNode[] {
  const s = ctx.theme;
  const out: React.ReactNode[] = [];
  let k = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const key = `b-${k++}`;
    switch (tok.type) {
      case "heading_open": {
        const level = Number(tok.tag[1]);
        const inline = tokens[i + 1];
        const fs = level === 1 ? s.fontSize.h1 : level === 2 ? s.fontSize.h2 : s.fontSize.h3;
        out.push(
          <h2
            key={key}
            style={{
              fontSize: fs,
              fontWeight: s.headingWeight,
              color: s.heading,
              fontFamily: `"${s.fontHeading}"`,
              lineHeight: 1.35,
              marginTop: level === 1 ? 8 : 40,
              marginBottom: level === 1 ? 24 : 16,
            }}
          >
            {renderInline(inlineChildren(inline), ctx, key)}
          </h2>
        );
        i += 2;
        break;
      }
      case "paragraph_open": {
        const inline = tokens[i + 1];
        out.push(
          <p
            key={key}
            style={{
              fontSize: s.fontSize.body,
              lineHeight: s.lineHeight,
              color: s.text,
              fontFamily: `"${s.fontBody}"`,
              margin: "0 0 20px 0",
              textAlign: s.align,
            }}
          >
            {renderInline(inlineChildren(inline), ctx, key)}
          </p>
        );
        i += 2;
        break;
      }
      case "blockquote_open": {
        const children: Token[] = [];
        let j = i + 1;
        let depth = 1;
        while (j < tokens.length && depth > 0) {
          const t = tokens[j];
          if (t.type === "blockquote_open") depth++;
          else if (t.type === "blockquote_close") {
            depth--;
            if (depth === 0) break;
          }
          children.push(t);
          j++;
        }
        // 他人言论卡片：首段以 @昵称 开头时启用（可配头像图片）
        const quote = parseQuoteCard(children);
        if (quote) {
          out.push(renderQuoteCard(quote, ctx, key));
          i = j;
          break;
        }
        // 荧光笔高亮：accent 色半透明色带 + 左侧粗竖条（圆角），更接近真实荧光笔
        out.push(
          <blockquote
            key={key}
            style={{
              backgroundColor: hexToRgba(ctx.accent, ctx.theme.isDark ? 0.3 : 0.16),
              borderLeft: `5px solid ${ctx.accent}`,
              borderRadius: 8,
              padding: "14px 22px",
              margin: "0 0 20px 0",
              fontSize: s.fontSize.quote,
              lineHeight: s.lineHeight,
              color: s.heading,
            }}
          >
            {renderBlocks(children, ctx)}
          </blockquote>
        );
        i = j;
        break;
      }
      case "bullet_list_open":
      case "ordered_list_open": {
        const ordered = tok.type === "ordered_list_open";
        const items: Token[][] = [];
        let j = i + 1;
        let depth = 1;
        while (j < tokens.length && depth > 0) {
          const t = tokens[j];
          if (t.type === "bullet_list_open" || t.type === "ordered_list_open") depth++;
          else if (t.type === "bullet_list_close" || t.type === "ordered_list_close") {
            depth--;
            if (depth === 0) break;
          }
          if (t.type === "list_item_open") {
            const itemTokens: Token[] = [];
            let d2 = 1;
            let m = j + 1;
            while (m < tokens.length && d2 > 0) {
              const t2 = tokens[m];
              if (t2.type === "list_item_open") d2++;
              else if (t2.type === "list_item_close") {
                d2--;
                if (d2 === 0) break;
              }
              itemTokens.push(t2);
              m++;
            }
            items.push(itemTokens);
            j = m;
            continue;
          }
          j++;
        }
        ctx.orderedCounters.push(1);
        const listCtx = ctx;
        const listEl = ordered ? (
          <ol key={key} style={{ margin: "0 0 20px 0", padding: 0 }}>
            {items.map((item, idx) => {
              const n = listCtx.orderedCounters[listCtx.orderedCounters.length - 1];
              listCtx.orderedCounters[listCtx.orderedCounters.length - 1] = n + 1;
              return (
                <li key={`${key}-li-${idx}`} style={{ display: "flex", marginBottom: 12, lineHeight: s.lineHeight }}>
                  <span style={{ color: s.accent, marginRight: 14, fontSize: s.fontSize.body, lineHeight: 1 }}>{n}.</span>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, fontSize: s.fontSize.body, color: s.text, fontFamily: `"${s.fontBody}"` }}>
                    {renderBlocks(item, ctx)}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <ul key={key} style={{ margin: "0 0 20px 0", padding: 0 }}>
            {items.map((item, idx) => (
              <li key={`${key}-li-${idx}`} style={{ display: "flex", marginBottom: 12, lineHeight: s.lineHeight }}>
                <span style={{ color: s.accent, marginRight: 14, fontSize: s.fontSize.body, lineHeight: 1 }}>•</span>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, fontSize: s.fontSize.body, color: s.text, fontFamily: `"${s.fontBody}"` }}>
                  {renderBlocks(item, ctx)}
                </div>
              </li>
            ))}
          </ul>
        );
        ctx.orderedCounters.pop();
        out.push(listEl);
        i = j;
        break;
      }
      case "fence":
      case "code_block": {
        // 代码块：外层圆角容器 + 顶部标签条（语言名 + 装饰圆点）+ 代码区
        const lang = tok.type === "fence" ? (tok.info || "").trim() : "";
        out.push(
          <div
            key={key}
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: s.codeBlockBg,
              border: `1px solid ${s.codeBlockBorder}`,
              borderRadius: 12,
              overflow: "hidden",
              margin: "0 0 20px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 14px",
                backgroundColor: hexToRgba(ctx.accent, ctx.theme.isDark ? 0.14 : 0.06),
                borderBottom: `1px solid ${s.codeBlockBorder}`,
              }}
            >
              {/* 装饰圆点（类终端窗口） */}
              <span style={{ display: "flex", gap: 6, marginRight: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff5f57" }} />
                <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#febc2e" }} />
                <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#28c840" }} />
              </span>
              <span
                style={{
                  fontSize: 15,
                  color: ctx.accent,
                  fontFamily: `"${s.fontMono}"`,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                {lang || "code"}
              </span>
            </div>
            <pre
              style={{
                fontFamily: `"${s.fontMono}"`,
                fontSize: s.fontSize.code,
                lineHeight: 1.7,
                color: s.text,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                padding: "16px 18px",
                margin: 0,
              }}
            >
              {tok.content}
            </pre>
          </div>
        );
        break;
      }
      case "hr": {
        out.push(<div key={key} style={{ borderTop: `1px solid ${s.hr}`, margin: "28px 0" }} />);
        break;
      }
      default:
        break;
    }
  }
  return out;
}

export function parseMarkdown(mdText: string): Token[] {
  return md.parse(mdText, {});
}

// ---------- 他人言论卡片 ----------
interface QuoteCard {
  nickname: string;
  avatar?: string; // 头像图片 URL（可为空，用首字占位）
  content: string; // 言论内容纯文本（保留换行）
}

/** 解析 blockquote 子 tokens：首段以 @昵称 开头 → 言论卡片；否则返回 null */
function parseQuoteCard(children: Token[]): QuoteCard | null {
  // 找第一个 paragraph 的 inline token
  const firstPara = children.find((t) => t.type === "paragraph_open");
  if (!firstPara) return null;
  const idx = children.indexOf(firstPara);
  const inline = children[idx + 1];
  if (!inline || inline.type !== "inline") return null;

  const tokens = inlineChildren(inline);
  // 昵称：第一个 text token（@ 开头，到 softbreak/br 前）
  // 剩余 text（softbreak 之后）拼回内容；图片作为头像
  let nickname = "";
  let avatar: string | undefined;
  const contentParts: string[] = [];
  let afterBreak = false;
  for (const t of tokens) {
    if (t.type === "text") {
      const text = t.content;
      if (!afterBreak && !nickname) {
        const m = /^@([^@\s].*)$/.exec(text.trim());
        if (m) {
          nickname = m[1].trim();
          continue;
        }
      }
      contentParts.push(text);
      afterBreak = true;
    } else if (t.type === "image") {
      avatar = t.attrGet("src") ?? undefined;
      afterBreak = true;
    } else if (t.type === "softbreak" || t.type === "hardbreak") {
      afterBreak = true;
      contentParts.push("\n");
    }
  }
  if (!nickname) return null;

  return { nickname, avatar, content: contentParts.join("").trim() };
}

/** 渲染他人言论卡片：圆形头像（accent 细环）+ 加粗昵称 + 装饰引号 + 内容 */
function renderQuoteCard(card: QuoteCard, ctx: BlockCtx, key: string): React.ReactElement {
  const s = ctx.theme;
  const initial = card.nickname.slice(0, 1);
  return (
    <div
      key={key}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: hexToRgba(ctx.accent, ctx.theme.isDark ? 0.12 : 0.07),
        borderLeft: `4px solid ${ctx.accent}`,
        borderRadius: 12,
        padding: "20px 22px",
        margin: "0 0 20px 0",
      }}
    >      {/* 头像 + 昵称行 */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        {/* 头像仅当预取成功（data URL）或本地路径时渲染；远程 http 说明预取失败 → 首字占位 */}
        {card.avatar && !/^https?:\/\//i.test(card.avatar) ? (
          <img
            src={card.avatar}
            width={44}
            height={44}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              objectFit: "cover",
              flexShrink: 0,
              border: `2px solid ${ctx.accent}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: ctx.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 700,
              fontFamily: `"${s.fontHeading}"`,
              border: `2px solid ${hexToRgba(ctx.accent, 0.4)}`,
            }}
          >
            {initial}
          </div>
        )}
        <span
          style={{
            marginLeft: 14,
            color: s.heading,
            fontSize: s.fontSize.quote,
            fontWeight: 700,
            fontFamily: `"${s.fontHeading}"`,
            lineHeight: 1.3,
          }}
        >
          {formatCjkText(card.nickname)}
        </span>
      </div>
      {/* 装饰引号 + 言论内容 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: s.fontSize.quote,
          lineHeight: s.lineHeight,
          color: s.text,
          fontFamily: `"${s.fontBody}"`,
        }}
      >
        <span
          style={{
            fontSize: s.fontSize.quote * 2.8,
            lineHeight: 0.55,
            color: hexToRgba(ctx.accent, 0.5),
            fontFamily: '"Noto Serif SC"',
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          “
        </span>
        {formatCjkText(card.content)}
      </div>
    </div>
  );
}

export function renderMarkdownTree(mdText: string, ctx: RenderCtx): React.ReactNode[] {
  const tokens = parseMarkdown(mdText);
  return renderBlocks(tokens, { ...ctx, orderedCounters: [] });
}
