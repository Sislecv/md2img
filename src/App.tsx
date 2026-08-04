import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrandSettings } from "./lib/types";
import { getTheme, getSize, getCustomSize } from "./lib/themes";
import { injectPreviewFonts } from "./lib/fonts";
import { measurePosterHeight, prefetchImages, renderPosterSvg, type PosterProps } from "./lib/poster";
import { downloadBlob, stampFilename, svgToPngBlob } from "./lib/export";
import {
  compressLogo,
  DEFAULT_BRAND,
  loadBrand,
  loadCustomSize,
  loadDarkMode,
  loadMarkdown,
  loadSizeId,
  loadThemeId,
  saveBrand,
  saveCustomSize,
  saveDarkMode,
  saveMarkdown,
  saveSizeId,
  saveThemeId,
  type CustomSize,
} from "./lib/brand";
import { useDebouncedValue } from "./lib/hooks";
import EditorPanel from "./components/EditorPanel";
import PreviewPanel from "./components/PreviewPanel";
import Toolbar from "./components/Toolbar";
import BrandDrawer from "./components/BrandDrawer";
import { SAMPLE_MARKDOWN } from "./lib/sample";

export default function App() {
  const [markdown, setMarkdown] = useState<string>(() => loadMarkdown() || SAMPLE_MARKDOWN);
  const [themeId, setThemeId] = useState<string>(() => loadThemeId());
  const [sizeId, setSizeId] = useState<string>(() => loadSizeId());
  const [customSize, setCustomSize] = useState<CustomSize>(() => loadCustomSize());
  const [brand, setBrand] = useState<BrandSettings>(() => loadBrand());
  const [darkMode, setDarkMode] = useState<boolean>(() => loadDarkMode());
  const [svg, setSvg] = useState<string>("");
  const [height, setHeight] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string>("");
  const [contentOverflow, setContentOverflow] = useState(false);

  const debouncedMd = useDebouncedValue(markdown, 500);
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const size = useMemo(() => {
    if (sizeId === "custom") return getCustomSize(customSize);
    return getSize(sizeId);
  }, [sizeId, customSize]);

  const propsRef = useRef<PosterProps>(null!);
  const renderSeq = useRef(0);

  const renderPipeline = useCallback(async () => {
    // 预取 markdown 图片（远程 URL → data URL）并探测尺寸，satori 才能渲染
    const { markdown, sizes } = await prefetchImages(debouncedMd);
    const p: PosterProps = { markdown, theme, size, brand, imageSizes: sizes };
    propsRef.current = p;
    const seq = ++renderSeq.current;
    setRendering(true);
    setError("");
    try {
      const h = await measurePosterHeight(p);
      const svgStr = await renderPosterSvg(p, h);
      // 仅最新一次渲染可提交结果，避免旧渲染覆盖新状态（竞态）
      if (seq !== renderSeq.current) return;
      setHeight(h);
      setSvg(svgStr);
      setContentOverflow(h > size.minHeight * 2.2);
    } catch (e) {
      if (seq !== renderSeq.current) return;
      setError(e instanceof Error ? e.message : "渲染失败");
      setSvg("");
    } finally {
      if (seq === renderSeq.current) setRendering(false);
    }
  }, [debouncedMd, theme, size, brand]);

  useEffect(() => {
    // 暗色模式：切换 html.dark 类 + 背景色
    document.documentElement.classList.toggle("dark", darkMode);
    saveDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    injectPreviewFonts();
  }, []);

  useEffect(() => {
    void renderPipeline();
  }, [renderPipeline]);

  const handleExport = useCallback(async () => {
    if (!svg || exporting) return;
    setExporting(true);
    setError("");
    try {
      const h = height || size.minHeight;
      const blob = await svgToPngBlob(svg, size.width, h);
      downloadBlob(blob, stampFilename());
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  }, [svg, exporting, height, size]);

  const handleLogo = useCallback(
    async (file: File) => {
      try {
        const logo = await compressLogo(file);
        const next = { ...brand, logo };
        setBrand(next);
        saveBrand(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Logo 处理失败");
      }
    },
    [brand]
  );

  const patchBrand = useCallback(
    (patch: Partial<BrandSettings>) => {
      const next = { ...brand, ...patch };
      setBrand(next);
      saveBrand(next);
    },
    [brand]
  );

  const handleMarkdown = useCallback((md: string) => {
    setMarkdown(md);
    saveMarkdown(md);
  }, []);

  const handleTheme = useCallback((id: string) => {
    setThemeId(id);
    saveThemeId(id);
  }, []);

  const handleSize = useCallback((id: string) => {
    setSizeId(id);
    saveSizeId(id);
  }, []);

  const handleCustomSize = useCallback((patch: Partial<CustomSize>) => {
    setCustomSize((prev) => {
      const next = { ...prev, ...patch };
      saveCustomSize(next);
      return next;
    });
  }, []);

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-night-bg">
      <Toolbar
        themeId={themeId}
        sizeId={sizeId}
        customSize={customSize}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onThemeChange={handleTheme}
        onSizeChange={handleSize}
        onCustomSizeChange={handleCustomSize}
        onOpenBrand={() => setDrawerOpen(true)}
        onExport={handleExport}
        exporting={exporting}
        rendering={rendering}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 移动端：编辑/预览 Tab 切换 */}
        <div className="flex shrink-0 border-b border-slate-200 bg-white dark:border-night-border dark:bg-night-panel lg:hidden">
          <button
            onClick={() => setMobileTab("edit")}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
              mobileTab === "edit" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 dark:text-night-text-dim"
            }`}
          >
            编辑
          </button>
          <button
            onClick={() => setMobileTab("preview")}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
              mobileTab === "preview" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 dark:text-night-text-dim"
            }`}
          >
            预览
            {rendering && <span className="ml-1 text-xs text-slate-400">…</span>}
          </button>
        </div>
        <EditorPanel
          markdown={markdown}
          onChange={handleMarkdown}
          className={mobileTab === "edit" ? "flex lg:flex" : "hidden lg:flex"}
        />
        <PreviewPanel
          svg={svg}
          width={size.width}
          height={height || size.minHeight}
          rendering={rendering}
          error={error}
          overflow={contentOverflow}
          className={mobileTab === "preview" ? "flex lg:flex" : "hidden lg:flex"}
        />
      </div>
      <BrandDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        brand={brand}
        onChange={patchBrand}
        onLogo={handleLogo}
      />
    </div>
  );
}
