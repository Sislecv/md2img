import { useMemo, useRef } from "react";

interface Props {
  svg: string;
  width: number;
  height: number;
  rendering: boolean;
  error: string;
  overflow: boolean;
  className?: string;
}

export default function PreviewPanel({ svg, width, height, rendering, error, overflow, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const src = useMemo(() => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ""), [svg]);

  return (
    <section
      ref={containerRef}
      className={`flex min-h-[300px] flex-1 flex-col overflow-auto bg-slate-100 lg:min-h-0 dark:bg-night-bg ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-slate-500 dark:text-night-text-dim">
          预览 {width}×{height}px
        </span>
        {overflow && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">内容较长，导出高度已自适应</span>
        )}
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto p-4">
        {error ? (
          <div className="mt-16 rounded-lg bg-red-50 px-6 py-4 text-sm text-red-600">{error}</div>
        ) : rendering ? (
          <div className="mt-16 text-sm text-slate-400">渲染中…</div>
        ) : src ? (
          <img
            src={src}
            alt="Markdown 预览"
            className="max-h-full max-w-full rounded-lg object-contain shadow-md dark:shadow-black/50"
            style={{ width: "auto", maxWidth: "min(100%, 720px)" }}
          />
        ) : (
          <div className="mt-16 text-sm text-slate-400">输入内容后自动预览</div>
        )}
      </div>
    </section>
  );
}
