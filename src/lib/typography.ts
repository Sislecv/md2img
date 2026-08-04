// 中文排版优化：渲染前对文本做三合一处理
// 1. 中英文混排间隙（CJK 与 Latin/数字之间插入窄空格 U+2009，约 1/4 em）
// 2. 连续标点压缩（全角标点相邻时保留一个）
// 3. 标点与引号规范化

const CJK = "\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff";
const CJK_PUNCT = "\\u3000-\\u303f\\uff00-\\uffef";
const LATIN = "A-Za-z";
const DIGIT = "0-9";
const HALF = `${LATIN}${DIGIT}`;

// CJK ↔ 西文之间补窄空格
const CJK_LATIN_RE = new RegExp(
  `([${CJK}${CJK_PUNCT}])([${HALF}])|([${HALF}])([${CJK}${CJK_PUNCT}])`,
  "g"
);

// CJK ↔ 特殊符号（%，#，$，@ 等半角符号，但排除闭合括号）
const CJK_SYMBOL_RE = new RegExp(
  `([${CJK}])([%#@&+\\-×÷=<>])|([%#@&+\\-×÷=<>])([${CJK}])`,
  "g"
);

const QUOTE_PAIRS: Record<string, string> = {
  '"': "“",
  "'": "’",
};

// 连续全角标点压缩：同一字符连续出现 ≥2 次时只保留一个（如 "……" 由 "。。" 而来）
function compressPunctuation(s: string): string {
  return s.replace(/([，。！？；：、]){2,}/g, "$1");
}

// 中文引号规范化：半角引号夹在中文之间时转全角
function normalizeQuotes(s: string): string {
  return s
    .replace(/([${CJK}])\s*(["'])/g, (m, c) => c + QUOTE_PAIRS[m[m.length - 1]])
    .replace(/(["'])\s*([${CJK}])/g, (m, q) => QUOTE_PAIRS[q] + m[m.length - 1]);
}

const RE_HAS_CJK = new RegExp(`[${CJK}]`);

/** 十六进制颜色转 rgba 字符串（支持 #rgb / #rrggbb / #rrggbbaa），用于荧光笔等半透明效果 */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 8) h = h.slice(0, 6); // 丢弃自带 alpha，用传入值
  if (h.length !== 6) return hex; // 非 hex（如命名色/渐变），原样返回
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatCjkText(input: string): string {
  if (!RE_HAS_CJK.test(input)) return input;
  let s = input;
  s = s.replace(CJK_LATIN_RE, (m, a, b, c, d) => {
    if (a !== undefined) return `${a}\u2009${b}`;
    return `${c}\u2009${d}`;
  });
  s = s.replace(CJK_SYMBOL_RE, (m, a, b, c, d) => {
    if (a !== undefined) return `${a}\u2009${b}`;
    return `${c}\u2009${d}`;
  });
  s = compressPunctuation(s);
  s = normalizeQuotes(s);
  return s;
}
