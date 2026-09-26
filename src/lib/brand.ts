import type { BrandSettings } from "./types";

const BRAND_KEY = "md2img:brand";
const MARKDOWN_KEY = "md2img:markdown";
const THEME_KEY = "md2img:theme";
const SIZE_KEY = "md2img:size";
const CUSTOM_SIZE_KEY = "md2img:custom-size";
const DARK_MODE_KEY = "md2img:dark-mode";

// 旧命名（md2image:*）兼容：读取时从旧 key 迁移
const LEGACY_KEYS: Record<string, string> = {
  [BRAND_KEY]: "md2image:brand",
  [MARKDOWN_KEY]: "md2image:markdown",
  [THEME_KEY]: "md2image:theme",
  [SIZE_KEY]: "md2image:size",
  [CUSTOM_SIZE_KEY]: "md2image:custom-size",
  [DARK_MODE_KEY]: "md2image:dark-mode",
};

function readWithLegacy(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
    const legacy = LEGACY_KEYS[key];
    if (legacy) {
      const old = localStorage.getItem(legacy);
      if (old !== null) {
        localStorage.setItem(key, old);
        localStorage.removeItem(legacy);
        return old;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const DEFAULT_BRAND: BrandSettings = {
  accentColor: "",
  footerText: "",
  showLogo: true,
  headerTag: "",
  showDate: false,
};

const STORAGE_KEYS = [BRAND_KEY, MARKDOWN_KEY, THEME_KEY, SIZE_KEY] as const;

export function loadBrand(): BrandSettings {
  try {
    const raw = readWithLegacy(BRAND_KEY);
    if (!raw) return { ...DEFAULT_BRAND };
    const parsed = JSON.parse(raw) as Partial<BrandSettings>;
    return {
      accentColor: typeof parsed.accentColor === "string" ? parsed.accentColor : "",
      footerText: typeof parsed.footerText === "string" ? parsed.footerText : "",
      logo: typeof parsed.logo === "string" ? parsed.logo : undefined,
      showLogo: parsed.showLogo !== false,
      headerTag: typeof parsed.headerTag === "string" ? parsed.headerTag : "",
      showDate: Boolean(parsed.showDate),
    };
  } catch {
    return { ...DEFAULT_BRAND };
  }
}

export function saveBrand(brand: BrandSettings): void {
  try {
    localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
  } catch (e) {
    // localStorage 满（如 logo 过大）时静默失败，不阻塞主流程
    console.warn("品牌设置保存失败（可能超出 localStorage 容量）:", e);
  }
}

export function loadMarkdown(): string {
  try {
    return readWithLegacy(MARKDOWN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveMarkdown(md: string): void {
  try {
    localStorage.setItem(MARKDOWN_KEY, md);
  } catch {
    /* ignore */
  }
}

export function loadThemeId(): string {
  try {
    return readWithLegacy(THEME_KEY) ?? "clean";
  } catch {
    return "clean";
  }
}

export function saveThemeId(id: string): void {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadSizeId(): string {
  try {
    return readWithLegacy(SIZE_KEY) ?? "xiaohongshu";
  } catch {
    return "xiaohongshu";
  }
}

export function saveSizeId(id: string): void {
  try {
    localStorage.setItem(SIZE_KEY, id);
  } catch {
    /* ignore */
  }
}

export interface CustomSize {
  width: number;
  height: number;
}

export const DEFAULT_CUSTOM_SIZE: CustomSize = { width: 1080, height: 1350 };

export function loadCustomSize(): CustomSize {
  try {
    const raw = readWithLegacy(CUSTOM_SIZE_KEY);
    if (!raw) return { ...DEFAULT_CUSTOM_SIZE };
    const p = JSON.parse(raw) as Partial<CustomSize>;
    return {
      width: typeof p.width === "number" && p.width > 0 ? p.width : DEFAULT_CUSTOM_SIZE.width,
      height: typeof p.height === "number" && p.height > 0 ? p.height : DEFAULT_CUSTOM_SIZE.height,
    };
  } catch {
    return { ...DEFAULT_CUSTOM_SIZE };
  }
}

export function saveCustomSize(size: CustomSize): void {
  try {
    localStorage.setItem(CUSTOM_SIZE_KEY, JSON.stringify(size));
  } catch {
    /* ignore */
  }
}

export function loadDarkMode(): boolean {
  try {
    const raw = readWithLegacy(DARK_MODE_KEY);
    if (raw !== null) return raw === "1";
    // 默认跟随系统
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    return false;
  }
}

export function saveDarkMode(dark: boolean): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, dark ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function clearStoredState(): void {
  for (const k of STORAGE_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

/** Logo 上传压缩：限制最大边 ≤ 400px，JPEG/WebP 质量 0.85，控制 localStorage 体积 */
export function compressLogo(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("图片解码失败"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法创建 canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
