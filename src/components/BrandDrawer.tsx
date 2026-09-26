import { useRef } from "react";
import type { BrandSettings } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  brand: BrandSettings;
  onChange: (patch: Partial<BrandSettings>) => void;
  onLogo: (file: File) => void;
}

export default function BrandDrawer({ open, onClose, brand, onChange, onLogo }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-80 flex-col gap-5 overflow-y-auto bg-white p-6 shadow-xl dark:bg-night-panel dark:shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-night-text">品牌设置</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-night-border">
            ✕
          </button>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-night-text">显示图标</label>
            <button
              onClick={() => onChange({ showLogo: !brand.showLogo })}
              role="switch"
              aria-checked={brand.showLogo}
              className={`relative h-6 w-11 rounded-full transition ${brand.showLogo ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${brand.showLogo ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-night-text">Logo（可选）</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLogo(f);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3">
            {brand.logo ? (
              <img src={brand.logo} alt="Logo" className="h-14 w-14 rounded-lg border border-slate-200 object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 dark:bg-night-raised">
                无 Logo
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-night-border dark:text-night-text dark:hover:bg-night-border"
              >
                上传图片
              </button>
              {brand.logo && (
                <button
                  onClick={() => onChange({ logo: undefined })}
                  className="rounded-md px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  移除
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">自动压缩至 ≤400px，仅保存在本地浏览器</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-night-text">自定义强调色</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brand.accentColor || "#2563eb"}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300"
            />
            <button
              onClick={() => onChange({ accentColor: "" })}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-night-border dark:text-night-text-dim dark:hover:bg-night-border"
            >
              恢复主题默认
            </button>
          </div>
          {/* 预设快捷色 */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {[
              { label: "蔚蓝", color: "#2563eb" },
              { label: "紫霓", color: "#a855f7" },
              { label: "潮黄", color: "#ffe600" },
              { label: "琥珀", color: "#d97706" },
              { label: "墨竹", color: "#1f6f50" },
              { label: "绯红", color: "#e11d48" },
              { label: "赛博", color: "#06b6d4" },
              { label: "薄荷", color: "#0d9488" },
            ].map((c) => (
              <button
                key={c.color}
                title={c.label}
                onClick={() => onChange({ accentColor: c.color })}
                style={{ backgroundColor: c.color }}
                className="h-6 w-6 rounded-full border border-black/10 shadow-xs transition hover:scale-110 active:scale-95"
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">用于卡片引用条、徽标、代码块高亮及强调</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-night-text">顶部标签 / 分类（可选）</label>
          <input
            value={brand.headerTag || ""}
            onChange={(e) => onChange({ headerTag: e.target.value })}
            placeholder="例如：TECH NOTES · 产品复盘"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-night-border dark:bg-night-raised dark:text-night-text"
          />
          <p className="mt-1.5 text-xs text-slate-400">显示在卡片右上角的胶囊分类标签</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-night-text">卡片显示当前日期</label>
            <p className="text-xs text-slate-400">在卡片顶部或底部附带 YYYY.MM.DD</p>
          </div>
          <button
            onClick={() => onChange({ showDate: !brand.showDate })}
            role="switch"
            aria-checked={brand.showDate}
            className={`relative h-6 w-11 rounded-full transition ${brand.showDate ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${brand.showDate ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-night-text">Footer 文字（可选）</label>
          <input
            value={brand.footerText}
            onChange={(e) => onChange({ footerText: e.target.value })}
            placeholder="例如：@你的昵称 · 独立开发者"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-night-border dark:bg-night-raised dark:text-night-text"
          />
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          品牌设置保存后，所有导出的图片都会自动带上 Logo、主题色与 footer，无需重复配置。
        </div>
      </aside>
    </div>
  );
}
