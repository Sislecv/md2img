import { useState, useRef, useEffect } from "react";
import { SIZES, THEMES, CUSTOM_SIZE_LIMITS } from "../lib/themes";
import type { CustomSize } from "../lib/brand";

interface Props {
  themeId: string;
  sizeId: string;
  customSize: CustomSize;
  darkMode: boolean;
  onToggleDark: () => void;
  onThemeChange: (id: string) => void;
  onSizeChange: (id: string) => void;
  onCustomSizeChange: (patch: Partial<CustomSize>) => void;
  onOpenBrand: () => void;
  onExport: () => void;
  exporting: boolean;
  rendering: boolean;
}

export default function Toolbar({
  themeId,
  sizeId,
  customSize,
  darkMode,
  onToggleDark,
  onThemeChange,
  onSizeChange,
  onCustomSizeChange,
  onOpenBrand,
  onExport,
  exporting,
  rendering,
}: Props) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-night-border dark:bg-night-panel">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-xs">M</div>
        <span className="text-base font-semibold text-slate-800 dark:text-night-text">md2img</span>
      </div>

      {/* 主题选择器（可视化色盘下拉） */}
      <div className="relative ml-2" ref={themeMenuRef}>
        <button
          onClick={() => setThemeMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-night-border dark:bg-night-raised dark:text-night-text dark:hover:bg-night-border"
          title="选择主题"
        >
          <div className="flex items-center -space-x-1">
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: currentTheme.previewColors[0] }}
            />
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: currentTheme.previewColors[1] }}
            />
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: currentTheme.previewColors[2] }}
            />
          </div>
          <span className="font-medium">{currentTheme.name}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {themeMenuOpen && (
          <div className="absolute top-full left-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-night-border dark:bg-night-panel dark:shadow-black/70">
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {THEMES.map((t) => {
                const active = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onThemeChange(t.id);
                      setThemeMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                      active
                        ? "bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
                        : "text-slate-700 hover:bg-slate-100 dark:text-night-text dark:hover:bg-night-raised"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex shrink-0 items-center -space-x-1">
                        <span
                          className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: t.previewColors[0] }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: t.previewColors[1] }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: t.previewColors[2] }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">{t.name}</span>
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] font-medium text-slate-500 dark:bg-night-border dark:text-night-text-dim">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate dark:text-night-text-dim">
                          {t.description}
                        </p>
                      </div>
                    </div>
                    {active && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 shrink-0 ml-1">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 dark:text-night-text-dim">尺寸</label>
        <select
          value={sizeId}
          onChange={(e) => onSizeChange(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-night-border dark:bg-night-raised dark:text-night-text"
        >
          {SIZES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.id === "custom" ? "" : `${s.width}×${s.minHeight} (${s.ratio})`}
            </option>
          ))}
        </select>
      </div>
      {sizeId === "custom" && (
        <div className="flex w-full basis-full items-center gap-1 sm:w-auto sm:basis-auto">
          <span className="text-xs text-slate-400 sm:hidden">自定义：</span>
          <input
            type="number"
            value={customSize.width}
            min={CUSTOM_SIZE_LIMITS.min}
            max={CUSTOM_SIZE_LIMITS.max}
            onChange={(e) => onCustomSizeChange({ width: Number(e.target.value) })}
            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-night-border dark:bg-night-raised dark:text-night-text"
            aria-label="自定义宽度"
          />
          <span className="text-xs text-slate-400">×</span>
          <input
            type="number"
            value={customSize.height}
            min={CUSTOM_SIZE_LIMITS.min}
            max={CUSTOM_SIZE_LIMITS.max}
            onChange={(e) => onCustomSizeChange({ height: Number(e.target.value) })}
            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-night-border dark:bg-night-raised dark:text-night-text"
            aria-label="自定义高度"
          />
          <span className="text-xs text-slate-400">px</span>
        </div>
      )}

      <button
        onClick={onOpenBrand}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-night-border dark:bg-night-raised dark:text-night-text dark:hover:bg-night-border"
      >
        品牌设置
      </button>

      <button
        onClick={onToggleDark}
        title={darkMode ? "切换到亮色模式" : "切换到暗色模式"}
        aria-label={darkMode ? "切换到亮色模式" : "切换到暗色模式"}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-night-border dark:bg-night-raised dark:text-night-text-dim dark:hover:bg-night-border"
      >
        {darkMode ? (
          /* 太阳 icon */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
          </svg>
        ) : (
          /* 月亮 icon */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
      </button>

      <div className="flex-1" />

      {rendering && <span className="text-xs text-slate-400">渲染中…</span>}
      <button
        onClick={onExport}
        disabled={exporting || rendering}
        className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? "导出中…" : "导出 PNG"}
      </button>
    </header>
  );
}
