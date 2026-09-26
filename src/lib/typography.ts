// 中文排版优化：渲染前对文本做三合一处理
// 1. 中英文混排间隙（CJK 与 Latin/数字之间插入窄空格 U+2009，约 1/4 em）
// 2. 连续标点压缩（全角标点相邻时保留一个）
// 3. 标点与引号规范化

// 汉字字符集（仅匹配汉字，排除中文标点，因为全角标点自带字距）
const CJK_IDEOGRAPH = "\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff";
const LATIN = "A-Za-z";
const DIGIT = "0-9";
const HALF = `${LATIN}${DIGIT}`;

// 汉字 ↔ 西文/数字 之间补窄空格 (U+2009，约 1/4 em)
// 采用零宽断言（lookaround），避免相邻字符被前一次匹配消耗
const CJK_TO_HALF_RE = new RegExp(`(?<=[${CJK_IDEOGRAPH}])(?=[${HALF}])`, "g");
const HALF_TO_CJK_RE = new RegExp(`(?<=[${HALF}])(?=[${CJK_IDEOGRAPH}])`, "g");

// 汉字 ↔ 常用西文计算符号（%，#，@，&，+，-，=，<，>）
const SYMBOLS = "%#@&+\\-×÷=<>";
const CJK_TO_SYM_RE = new RegExp(`(?<=[${CJK_IDEOGRAPH}])(?=[${SYMBOLS}])`, "g");
const SYM_TO_CJK_RE = new RegExp(`(?<=[${SYMBOLS}])(?=[${CJK_IDEOGRAPH}])`, "g");

// 连续全角标点压缩：同一字符连续出现 ≥2 次时只保留一个（如重复的逗号、句号）
function compressPunctuation(s: string): string {
  return s.replace(/([，。！？；：、]){2,}/g, "$1");
}

// 中文引号规范化：成对半角引号夹在中文外侧时转为标准全角引号
function normalizeQuotes(s: string): string {
  // 先处理双引号成对情况 "..." -> “...”
  let res = s.replace(/"([^"]*)"/g, "“$1”");
  // 紧贴中文的半角引号前后修补（处理单边遗漏）
  res = res
    .replace(new RegExp(`(["'])\\s*([${CJK_IDEOGRAPH}])`, "g"), "“$2")
    .replace(new RegExp(`([${CJK_IDEOGRAPH}])\\s*(["'])`, "g"), "$1”");
  return res;
}

const RE_HAS_CJK = new RegExp(`[${CJK_IDEOGRAPH}]`);

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
  s = normalizeQuotes(s);
  s = s
    .replace(CJK_TO_HALF_RE, "\u2009")
    .replace(HALF_TO_CJK_RE, "\u2009")
    .replace(CJK_TO_SYM_RE, "\u2009")
    .replace(SYM_TO_CJK_RE, "\u2009");
  s = compressPunctuation(s);
  return s;
}
