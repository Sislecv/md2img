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

interface CodeToken {
  type: "keyword" | "string" | "number" | "comment" | "function" | "operator" | "identifier" | "whitespace" | "other";
  text: string;
}

function tokenizeCode(code: string): CodeToken[][] {
  const rawLines = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }
  const tokenRegex = /(\/\/[^\n]*|\/\*.*?\*\/|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b(?:const|let|var|function|return|if|else|for|while|switch|case|default|break|continue|new|this|class|extends|super|import|export|from|as|async|await|try|catch|finally|throw|typeof|instanceof|void|type|interface|enum|def|fn|struct|pub|use|mod|match|mut|impl|trait|package|func|select|where|insert|update|delete|create|table|true|false|null|undefined|nil|None|self)\b)|([a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|([+\-*/%=<>!&|^~?:;.,()[\]{}]+)|([a-zA-Z_$][a-zA-Z0-9_$]*)|(\s+)|(.)/g;

  return rawLines.map((line) => {
    if (!line) return [{ type: "whitespace", text: "" }];
    const lineTokens: CodeToken[] = [];
    let m: RegExpExecArray | null;
    tokenRegex.lastIndex = 0;
    while ((m = tokenRegex.exec(line)) !== null) {
      if (m[1]) lineTokens.push({ type: "comment", text: m[1] });
      else if (m[2]) lineTokens.push({ type: "string", text: m[2] });
      else if (m[3]) lineTokens.push({ type: "number", text: m[3] });
      else if (m[4]) lineTokens.push({ type: "keyword", text: m[4] });
      else if (m[5]) lineTokens.push({ type: "function", text: m[5] });
      else if (m[6]) lineTokens.push({ type: "operator", text: m[6] });
      else if (m[7]) lineTokens.push({ type: "identifier", text: m[7] });
      else if (m[8]) lineTokens.push({ type: "whitespace", text: m[8].replace(/ /g, "\u00a0") });
      else lineTokens.push({ type: "other", text: m[9] });
    }
    return lineTokens;
  });
}

function getSyntaxColor(type: CodeToken["type"], s: ThemeTokens, accent: string): string {
  const mode = s.codeSyntaxTheme ?? (s.isDark ? "dark" : "light");
  if (mode === "crt") {
    switch (type) {
      case "keyword": return "#a4ffc2";
      case "string": return "#00ff41";
      case "comment": return "#1c562b";
      case "number": return "#7dff9e";
      case "function": return "#37d968";
      case "operator": return "#00ff41";
      default: return s.text;
    }
  }
  if (mode === "aurora") {
    switch (type) {
      case "keyword": return "#c084fc";
      case "string": return "#6ee7b7";
      case "comment": return "#64748b";
      case "number": return "#f472b6";
      case "function": return "#38bdf8";
      case "operator": return "#cbd5e1";
      default: return s.text;
    }
  }
  if (mode === "warm") {
    switch (type) {
      case "keyword": return "#b45309";
      case "string": return "#15803d";
      case "comment": return "#a8a29e";
      case "number": return "#c2410c";
      case "function": return "#9a3412";
      case "operator": return "#78716c";
      default: return s.text;
    }
  }
  if (s.isDark) {
    switch (type) {
      case "keyword": return "#f472b6";
      case "string": return "#fde047";
      case "comment": return "#64748b";
      case "number": return "#fb923c";
      case "function": return "#38e1d8";
      case "operator": return "#94a3b8";
      default: return s.text;
    }
  }
  // light
  switch (type) {
    case "keyword": return "#7c3aed";
    case "string": return "#059669";
    case "comment": return "#94a3b8";
    case "number": return "#ea580c";
    case "function": return "#0284c7";
    case "operator": return "#64748b";
    default: return s.text;
  }
}

// ---------- 块级 token → React 节点 ----------
interface BlockCtx extends RenderCtx {
  orderedCounters: number[];
}

/** 列表项内容：支持普通项目以及任务列表（- [ ] 和 - [x]） */
function renderListItemText(item: Token[], ctx: BlockCtx, prefix: string): React.ReactNode {
  const paraIdx = item.findIndex((t) => t.type === "paragraph_open");
  const hasNested = item.some(
    (t) => t.type !== "paragraph_open" && t.type !== "paragraph_close" && t.type !== "inline"
  );
  if (paraIdx >= 0 && paraIdx + 1 < item.length && item[paraIdx + 1].type === "inline" && !hasNested) {
    const inline = item[paraIdx + 1];
    const children = inlineChildren(inline);
    const firstChild = children[0];

    // 任务列表判断：首个文本以 [ ] 或 [x] 开头
    if (firstChild && firstChild.type === "text") {
      const taskMatch = /^\[([ xX])\]\s*/.exec(firstChild.content);
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === "x";
        const clonedFirst = Object.assign(Object.create(Object.getPrototypeOf(firstChild)), firstChild) as Token;
        clonedFirst.content = firstChild.content.slice(taskMatch[0].length);
        const restChildren: Token[] = [clonedFirst, ...children.slice(1)];
        return (
          <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: isChecked ? ctx.accent : "transparent",
                border: isChecked ? `2px solid ${ctx.accent}` : `2px solid ${hexToRgba(ctx.theme.text, 0.35)}`,
                marginRight: 12,
                marginTop: 4,
                flexShrink: 0,
              }}
            >
              {isChecked ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ctx.theme.isDark && ctx.accent === "#ffe600" ? "#0f1013" : "#ffffff"}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </span>
            <span style={{ flex: 1, textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.75 : 1 }}>
              {renderInline(restChildren, ctx, "task")}
            </span>
          </div>
        );
      }
    }

    return (
      <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
        <span style={{ color: ctx.accent, fontWeight: 700, marginRight: 10, flexShrink: 0 }}>{prefix}</span>
        <span style={{ flex: 1 }}>{renderInline(children, ctx, "li")}</span>
      </div>
    );
  }
  return <div style={{ display: "flex", flexDirection: "column" }}>{renderBlocks(item, ctx)}</div>;
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

        if (level === 1) {
          out.push(
            <div
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 8,
                marginBottom: 24,
                width: "100%",
              }}
            >
              <h1
                style={{
                  fontSize: fs,
                  fontWeight: s.headingWeight,
                  color: s.heading,
                  fontFamily: `"${s.fontHeading}"`,
                  lineHeight: 1.28,
                  letterSpacing: s.fontHeading === "Smiley Sans" ? 1 : 0.5,
                  margin: 0,
                }}
              >
                {s.headingStyle === "terminal" ? (
                  <span style={{ color: ctx.accent, marginRight: 12 }}>&gt;</span>
                ) : null}
                {renderInline(inlineChildren(inline), ctx, key)}
              </h1>
              {s.headingStyle === "underline" ? (
                <div style={{ width: 80, height: 4, borderRadius: 2, backgroundColor: ctx.accent, marginTop: 14 }} />
              ) : null}
            </div>
          );
        } else if (level === 2) {
          out.push(
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 40,
                marginBottom: 16,
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: Math.round(fs * 0.75),
                  borderRadius: 3,
                  backgroundColor: ctx.accent,
                  marginRight: 12,
                  flexShrink: 0,
                }}
              />
              <h2
                style={{
                  fontSize: fs,
                  fontWeight: s.headingWeight,
                  color: s.heading,
                  fontFamily: `"${s.fontHeading}"`,
                  lineHeight: 1.35,
                  margin: 0,
                }}
              >
                {renderInline(inlineChildren(inline), ctx, key)}
              </h2>
            </div>
          );
        } else {
          out.push(
            <h3
              key={key}
              style={{
                fontSize: s.fontSize.h3,
                fontWeight: 600,
                color: s.heading,
                fontFamily: `"${s.fontHeading}"`,
                lineHeight: 1.4,
                marginTop: 26,
                marginBottom: 12,
              }}
            >
              {renderInline(inlineChildren(inline), ctx, key)}
            </h3>
          );
        }
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
        // 他人言论卡片：首段以 @昵称 开头时启用
        const quote = parseQuoteCard(children);
        if (quote) {
          out.push(renderQuoteCard(quote, ctx, key));
          i = j;
          break;
        }
        // 荧光笔高亮块
        out.push(
          <blockquote
            key={key}
            style={{
              backgroundColor: hexToRgba(ctx.accent, ctx.theme.isDark ? 0.18 : 0.08),
              borderLeft: `5px solid ${ctx.accent}`,
              borderRadius: 8,
              padding: "16px 22px",
              margin: "0 0 22px 0",
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
                <li
                  key={`${key}-li-${idx}`}
                  style={{
                    marginBottom: 12,
                    lineHeight: s.lineHeight,
                    fontSize: s.fontSize.body,
                    color: s.text,
                    fontFamily: `"${s.fontBody}"`,
                    listStyle: "none",
                  }}
                >
                  {renderListItemText(item, ctx, `${n}. `)}
                </li>
              );
            })}
          </ol>
        ) : (
          <ul key={key} style={{ margin: "0 0 20px 0", padding: 0 }}>
            {items.map((item, idx) => (
              <li
                key={`${key}-li-${idx}`}
                style={{
                  marginBottom: 12,
                  lineHeight: s.lineHeight,
                  fontSize: s.fontSize.body,
                  color: s.text,
                  fontFamily: `"${s.fontBody}"`,
                  listStyle: "none",
                }}
              >
                {renderListItemText(item, ctx, "• ")}
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
        const lang = tok.type === "fence" ? (tok.info || "").trim() : "";
        const tokenLines = tokenizeCode(tok.content);
        const showLineNumbers = tokenLines.length > 1;
        const lineNumDigits = String(tokenLines.length).length;
        const lineNumWidth = Math.max(24, lineNumDigits * 12 + 10);
        const lineNumColor = s.isDark ? "#475569" : "#94a3b8";

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
              margin: "0 0 24px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                backgroundColor: hexToRgba(ctx.accent, ctx.theme.isDark ? 0.12 : 0.05),
                borderBottom: `1px solid ${s.codeBlockBorder}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, marginRight: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff5f57" }} />
                  <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#febc2e" }} />
                  <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#28c840" }} />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: ctx.accent,
                    fontFamily: `"${s.fontMono}"`,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {lang || "code"}
                </span>
              </div>

              {tokenLines.length > 1 ? (
                <span
                  style={{
                    fontSize: 12,
                    color: s.footerColor,
                    fontFamily: `"${s.fontMono}"`,
                    opacity: 0.7,
                  }}
                >
                  {tokenLines.length} lines
                </span>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 18px",
              }}
            >
              {tokenLines.map((lineToks, lineIdx) => (
                <div
                  key={`line-${lineIdx}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    lineHeight: 1.7,
                  }}
                >
                  {showLineNumbers ? (
                    <span
                      style={{
                        width: lineNumWidth,
                        marginRight: 14,
                        color: lineNumColor,
                        fontFamily: `"${s.fontMono}"`,
                        fontSize: s.fontSize.code - 3,
                        textAlign: "right",
                        flexShrink: 0,
                        userSelect: "none",
                      }}
                    >
                      {lineIdx + 1}
                    </span>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      flex: 1,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {lineToks.length === 0 || (lineToks.length === 1 && lineToks[0].text === "") ? (
                      <span style={{ fontSize: s.fontSize.code, fontFamily: `"${s.fontMono}"` }}>{'\u00a0'}</span>
                    ) : (
                      lineToks.map((t, ti) => (
                        <span
                          key={`tok-${ti}`}
                          style={{
                            color: getSyntaxColor(t.type, s, ctx.accent),
                            fontFamily: `"${s.fontMono}"`,
                            fontSize: s.fontSize.code,
                            fontWeight: t.type === "keyword" ? 600 : 400,
                          }}
                        >
                          {t.text}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      }
      case "hr": {
        out.push(
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "32px 0",
              width: "100%",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                height: 1,
                backgroundColor: s.hr,
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                display: "flex",
                gap: 6,
                padding: "0 12px",
                backgroundColor: s.background,
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: ctx.accent, opacity: 0.6 }} />
              <div style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: ctx.accent }} />
              <div style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: ctx.accent, opacity: 0.6 }} />
            </div>
          </div>
        );
        break;
      }
      case "table_open": {
        const rows: { cells: React.ReactNode[]; header: boolean }[] = [];
        let j = i + 1;
        let depth = 1;
        let inHeader = false;
        let guard = 0;
        while (j < tokens.length && depth > 0 && guard++ < 1000) {
          const t = tokens[j];
          if (t.type === "table_open") depth++;
          else if (t.type === "table_close") {
            depth--;
            if (depth === 0) break;
          } else if (t.type === "thead_open") {
            inHeader = true;
            j++;
          } else if (t.type === "tbody_open") {
            inHeader = false;
            j++;
          } else if (t.type === "tr_open") {
            const cells: React.ReactNode[] = [];
            let m = j + 1;
            let cguard = 0;
            while (m < tokens.length && tokens[m].type !== "tr_close" && cguard++ < 500) {
              const c = tokens[m];
              if (c.type === "th_open" || c.type === "td_open") {
                const isTh = c.type === "th_open";
                const inline = tokens[m + 1];
                if (inline && inline.type === "inline") {
                  cells.push(
                    <div
                      key={`cell-${m}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        minWidth: 0,
                        padding: "12px 16px",
                        fontSize: isTh ? s.fontSize.quote - 2 : s.fontSize.body - 4,
                        fontWeight: isTh ? 700 : 400,
                        color: isTh ? s.heading : s.text,
                        fontFamily: `"${s.fontBody}"`,
                        lineHeight: 1.5,
                        backgroundColor: isTh
                          ? hexToRgba(ctx.accent, ctx.theme.isDark ? 0.15 : 0.08)
                          : "transparent",
                        borderRight: `1px solid ${s.codeBlockBorder}`,
                      }}
                    >
                      {renderInline(inlineChildren(inline), ctx, `tbl-${m}`)}
                    </div>
                  );
                }
                m += 3;
              } else {
                m++;
              }
            }
            rows.push({ cells, header: inHeader });
            j = m + 1;
          } else {
            j++;
          }
        }
        out.push(
          <div
            key={key}
            style={{
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${s.codeBlockBorder}`,
              borderRadius: 12,
              overflow: "hidden",
              margin: "0 0 24px 0",
            }}
          >
            {rows.map((row, ri) => (
              <div
                key={`row-${ri}`}
                style={{
                  display: "flex",
                  width: "100%",
                  backgroundColor: !row.header && ri % 2 === 1 ? hexToRgba(s.text, s.isDark ? 0.04 : 0.02) : "transparent",
                  borderBottom: ri < rows.length - 1 ? `1px solid ${s.codeBlockBorder}` : "none",
                }}
              >
                {row.cells}
              </div>
            ))}
          </div>
        );
        i = j;
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
