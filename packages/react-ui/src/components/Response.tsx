import { useMemo } from "react";

export interface ResponseProps {
  /** Markdown content to render. Supports streaming — just append tokens. */
  children: string;
  className?: string;
}

/**
 * Lightweight markdown renderer for AI responses.
 * Handles bold, italic, inline code, code blocks, lists, and paragraphs.
 * No external dependencies — uses regex-based parsing.
 *
 * For streaming, just update the children string as tokens arrive:
 * ```tsx
 * const [text, setText] = useState("");
 * // As tokens stream in:
 * setText(prev => prev + token);
 * return <Response>{text}</Response>;
 * ```
 */
export function Response({ children, className }: ResponseProps) {
  const html = useMemo(() => renderMarkdown(children), [children]);

  return (
    <div
      className={className}
      data-agent-response
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (const line of lines) {
    // Code block fences
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        out.push(
          `<pre data-lang="${esc(codeLang)}"><code>${esc(codeLines.join("\n"))}</code></pre>`,
        );
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
      } else {
        if (inList) { out.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
        codeLang = line.trimStart().slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line — close list, add spacing
    if (!trimmed) {
      if (inList) { out.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { out.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
      const level = headingMatch[1].length;
      out.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(trimmed)) {
      if (!inList || listType !== "ul") {
        if (inList) out.push("</ol>");
        out.push("<ul>");
        inList = true;
        listType = "ul";
      }
      out.push(`<li>${inline(trimmed.replace(/^[-*+]\s/, ""))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) out.push("</ul>");
        out.push("<ol>");
        inList = true;
        listType = "ol";
      }
      out.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      if (inList) { out.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
      out.push("<hr />");
      continue;
    }

    // Paragraph
    if (inList) { out.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
    out.push(`<p>${inline(trimmed)}</p>`);
  }

  if (inCodeBlock) {
    out.push(`<pre data-lang="${esc(codeLang)}"><code>${esc(codeLines.join("\n"))}</code></pre>`);
  }
  if (inList) out.push(listType === "ul" ? "</ul>" : "</ol>");

  return out.join("");
}

/** Process inline markdown: bold, italic, code, links */
function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
