import { useRef } from "react";

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
  { label: "引用", insert: "> 引用内容\n", before: "" },
  { label: "代码", insert: "`code`" },
  { label: "代码块", insert: "```\n// 代码\n```", before: "" },
  { label: "列表", insert: "- 项目\n", before: "" },
  { label: "分割线", insert: "\n---\n", before: "" },
];

export default function EditorPanel({ markdown, onChange, className = "" }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insert = (snippet: (typeof SNIPPETS)[number]) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.slice(start, end);
    const text = selected ? snippet.insert.replace("文本", selected) : snippet.insert;
    const next = markdown.slice(0, start) + text + markdown.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <section
      className={`flex min-h-[300px] flex-1 flex-col border-b border-slate-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r dark:border-night-border dark:bg-night-panel ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2 dark:border-night-border-soft">
        {SNIPPETS.map((s) => (
          <button
            key={s.label}
            onClick={() => insert(s)}
            className="rounded px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:text-night-text-dim dark:hover:bg-night-border"
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="在这里粘贴或输入 Markdown…"
        className="min-h-[280px] flex-1 resize-none bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-300 dark:bg-night-panel dark:text-night-text dark:placeholder:text-night-text-faint lg:min-h-0"
      />
    </section>
  );
}
