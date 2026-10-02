import React, { useRef } from "react";
import { compressImageFile } from "../lib/brand";

interface Props {
  markdown: string;
  onChange: (md: string) => void;
  className?: string;
}

const SNIPPETS: { label: string; insert: string; before?: string; after?: string }[] = [
  { label: "H1", insert: "# ", before: "" },
  { label: "H2", insert: "## ", before: "" },
  { label: "粗体", insert: "**加粗文本**" },
  { label: "斜体", insert: "*斜体文本*" },
  { label: "引用", insert: "> 引用高亮内容\n", before: "" },
  { label: "言论卡", insert: "> @作者昵称\n> 这是精选的一句金句名言。\n", before: "" },
  { label: "待办", insert: "- [ ] 待办事项\n- [x] 已完成事项\n", before: "" },
  { label: "代码", insert: "`code`" },
  { label: "代码块", insert: "```ts\nconst greeting = \"Hello World\";\n```\n", before: "" },
  { label: "列表", insert: "- 项目清单\n", before: "" },
  { label: "表格", insert: "| 维度 | 说明 |\n|---|---|\n| 体验 | 极致优雅 |\n", before: "" },
  { label: "分割线", insert: "\n---\n", before: "" },
];

export default function EditorPanel({ markdown, onChange, className = "" }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertTextAtCursor = (text: string) => {
    const ta = taRef.current;
    if (!ta) {
      onChange(markdown + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = markdown.slice(0, start) + text + markdown.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const insert = (snippet: (typeof SNIPPETS)[number]) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.slice(start, end);
    const text = selected ? snippet.insert.replace("文本", selected) : snippet.insert;
    insertTextAtCursor(text);
  };

  const handleImageFile = async (file: File) => {
    try {
      const res = await compressImageFile(file, 1200);
      const name = file.name.replace(/\.[^/.]+$/, "") || "图片";
      insertTextAtCursor(`\n![${name}](${res.dataUrl})\n`);
    } catch (err) {
      console.error("处理图片失败:", err);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void handleImageFile(file);
          return;
        }
      }
    }
  };

  const charCount = markdown.length;
  const lineCount = markdown ? markdown.split("\n").length : 0;

  return (
    <section
      className={`flex min-h-[300px] flex-1 flex-col border-b border-slate-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r dark:border-night-border dark:bg-night-panel ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImageFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-night-border-soft">
        <div className="flex flex-wrap items-center gap-1">
          {SNIPPETS.map((s) => (
            <button
              key={s.label}
              onClick={() => insert(s)}
              className="rounded px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:text-night-text-dim dark:hover:bg-night-border"
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="上传本地图片或直接在下方文本框中粘贴截图"
            className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            📷 图片
          </button>
        </div>
        <div className="hidden text-xs text-slate-400 sm:block dark:text-night-text-faint">
          {charCount} 字符 · {lineCount} 行
        </div>
      </div>
      <textarea
        ref={taRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        spellCheck={false}
        placeholder="在这里粘贴或输入 Markdown，支持直接 Ctrl+V / Cmd+V 粘贴截图…"
        className="min-h-[280px] flex-1 resize-none bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-300 dark:bg-night-panel dark:text-night-text dark:placeholder:text-night-text-faint lg:min-h-0"
      />
    </section>
  );
}
