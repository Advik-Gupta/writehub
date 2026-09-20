import type { JSONContent } from "@tiptap/core";
import { footnote, reference, referencesTitle, renderSegs, sortKey } from "./citations";
import type { CitationStyle, ExportFormat, Source } from "./types";
import { escapeHtml } from "./utils";

export interface RenderContext {
  sources: Map<string, Source>;
  titles: Map<string, string>;
  style: CitationStyle;
  bibliography?: string[];
  linkHref?: (docId: string) => string | null;
}

interface Citation {
  sourceId: string;
  quote: string;
  locator: string;
}

interface State {
  ctx: RenderContext;
  citations: Citation[];
}

type Mark = NonNullable<JSONContent["marks"]>[number];

export const TAG_PATTERN = /(^|[\s(])#([\p{L}][\p{L}\p{N}_-]*)/gu;

export function walk(node: JSONContent, visit: (node: JSONContent, parent: JSONContent | null) => void, parent: JSONContent | null = null) {
  visit(node, parent);
  node.content?.forEach((child) => walk(child, visit, node));
}

export function extractWikiLinks(doc: JSONContent) {
  const ids = new Set<string>();
  walk(doc, (n) => n.type === "wikiLink" && n.attrs?.id && ids.add(n.attrs.id));
  return [...ids];
}

export function extractCitations(doc: JSONContent): Citation[] {
  const list: Citation[] = [];
  walk(doc, (n) => {
    if (n.type === "citation" && n.attrs?.sourceId) {
      list.push({ sourceId: n.attrs.sourceId, quote: n.attrs.quote ?? "", locator: n.attrs.locator ?? "" });
    }
  });
  return list;
}

export function extractTags(doc: JSONContent) {
  const tags = new Set<string>();
  walk(doc, (n, parent) => {
    if (n.type !== "text" || !n.text || parent?.type === "codeBlock" || n.marks?.some((m) => m.type === "code")) return;
    for (const match of n.text.matchAll(TAG_PATTERN)) tags.add(match[2].toLowerCase());
  });
  return [...tags];
}

export function indexText(node: JSONContent, ctx?: Pick<RenderContext, "titles">): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "wikiLink") return ctx?.titles.get(node.attrs?.id) ?? node.attrs?.label ?? "";
  const inner = (node.content ?? []).map((c) => indexText(c, ctx));
  const isInlineContainer = node.content?.every((c) => c.type === "text" || c.type === "hardBreak" || c.type === "wikiLink" || c.type === "citation");
  return isInlineContainer ? inner.join("") : inner.join("\n");
}

const MARK_ORDER = ["link", "bold", "italic", "strike", "underline", "highlight", "code"];

function relevantMarks(marks: Mark[] = []) {
  return marks.filter((m) => MARK_ORDER.includes(m.type)).sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
}

const sameMark = (a: Mark, b: Mark) => a.type === b.type && (a.type !== "link" || a.attrs?.href === b.attrs?.href);

interface InlineDialect {
  open: (mark: Mark) => string;
  close: (mark: Mark) => string;
  text: (text: string, code: boolean) => string;
  atom: (node: JSONContent, st: State) => string;
}

function renderInline(nodes: JSONContent[] = [], st: State, d: InlineDialect) {
  let out = "";
  let pending = "";
  const active: Mark[] = [];
  const closeTo = (keep: number) => {
    while (active.length > keep) out += d.close(active.pop()!);
  };
  for (const node of nodes) {
    const marks = relevantMarks(node.marks);
    let common = 0;
    while (common < active.length && common < marks.length && sameMark(active[common], marks[common])) common++;
    if (node.type === "text") {
      const text = node.text ?? "";
      const lead = text.match(/^\s*/)![0];
      const core = text.trim();
      if (!core) {
        pending += text;
        continue;
      }
      const trail = text.slice(lead.length + core.length);
      closeTo(common);
      out += pending + lead;
      pending = "";
      for (const m of marks.slice(common)) {
        out += d.open(m);
        active.push(m);
      }
      out += d.text(core, marks.some((m) => m.type === "code"));
      pending = trail;
    } else {
      closeTo(common);
      out += pending;
      pending = "";
      for (const m of marks.slice(common)) {
        out += d.open(m);
        active.push(m);
      }
      out += d.atom(node, st);
    }
  }
  closeTo(0);
  return out + pending;
}

function citationNumber(node: JSONContent, st: State) {
  st.citations.push({ sourceId: node.attrs?.sourceId ?? "", quote: node.attrs?.quote ?? "", locator: node.attrs?.locator ?? "" });
  return st.citations.length;
}

const wikiTitle = (node: JSONContent, st: State) => st.ctx.titles.get(node.attrs?.id) ?? node.attrs?.label ?? "Untitled";

const textOf = (node: JSONContent) => (node.content ?? []).map((c) => c.text ?? "").join("");

const MD_MARKS: Record<string, [string, string]> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  underline: ["<u>", "</u>"],
  highlight: ["<mark>", "</mark>"],
  code: ["`", "`"],
};

function mdDialect(inTable: boolean): InlineDialect {
  return {
    open: (m) => (m.type === "link" ? "[" : MD_MARKS[m.type][0]),
    close: (m) => (m.type === "link" ? `](${m.attrs?.href ?? ""})` : MD_MARKS[m.type][1]),
    text: (text, code) => (code ? text : text.replace(inTable ? /([\\`*_[\]<>~|])/g : /([\\`*_[\]<>~])/g, "\\$1")),
    atom: (node, st) => {
      if (node.type === "hardBreak") return inTable ? "<br>" : "\\\n";
      if (node.type === "citation") return `[^${citationNumber(node, st)}]`;
      if (node.type === "wikiLink") return `[[${wikiTitle(node, st)}]]`;
      return "";
    },
  };
}

const MD_INLINE = mdDialect(false);
const MD_TABLE_INLINE = mdDialect(true);

const isList = (n: JSONContent) => n.type === "bulletList" || n.type === "orderedList" || n.type === "taskList";

function mdJoin(nodes: JSONContent[], st: State) {
  let out = "";
  nodes.forEach((node, i) => {
    const block = mdBlock(node, st);
    if (i > 0) out += isList(node) && !isList(nodes[i - 1]) && nodes[i - 1].type === "paragraph" ? "\n" : "\n\n";
    out += block;
  });
  return out;
}

function mdListItem(item: JSONContent, marker: string, st: State) {
  const body = mdJoin(item.content ?? [], st);
  const pad = " ".repeat(item.type === "taskItem" ? 2 : marker.length);
  return body
    .split("\n")
    .map((line, i) => (i === 0 ? marker + line : line ? pad + line : ""))
    .join("\n");
}

function mdTable(node: JSONContent, st: State) {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).flatMap((cell) => {
      const text = (cell.content ?? []).map((p) => renderInline(p.content, st, MD_TABLE_INLINE)).join("<br>");
      return [text, ...Array(Math.max(0, (cell.attrs?.colspan ?? 1) - 1)).fill("")];
    }),
  );
  if (!rows.length) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? "").join(" | ")} |`;
  return [line(rows[0]), line(Array(width).fill("---")), ...rows.slice(1).map(line)].join("\n");
}

function mdBlock(node: JSONContent, st: State): string {
  switch (node.type) {
    case "paragraph":
      return renderInline(node.content, st, MD_INLINE).replace(/^(\s*)([-+>]|#{1,6}|\d+[.)])(\s)/, "$1\\$2$3");
    case "heading":
      return `${"#".repeat(node.attrs?.level ?? 1)} ${renderInline(node.content, st, MD_INLINE)}`;
    case "blockquote":
      return mdJoin(node.content ?? [], st)
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "codeBlock": {
      const code = textOf(node);
      const fence = "`".repeat(Math.max(3, ...(code.match(/`+/g) ?? []).map((m) => m.length + 1)));
      return `${fence}${node.attrs?.language ?? ""}\n${code}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "bulletList":
      return (node.content ?? []).map((li) => mdListItem(li, "- ", st)).join("\n");
    case "orderedList": {
      const start = node.attrs?.start ?? 1;
      return (node.content ?? []).map((li, i) => mdListItem(li, `${start + i}. `, st)).join("\n");
    }
    case "taskList":
      return (node.content ?? []).map((li) => mdListItem(li, li.attrs?.checked ? "- [x] " : "- [ ] ", st)).join("\n");
    case "image":
      return `![${node.attrs?.alt ?? ""}](${node.attrs?.src ?? ""}${node.attrs?.title ? ` "${node.attrs.title}"` : ""})`;
    case "table":
      return mdTable(node, st);
    default:
      return mdJoin(node.content ?? [], st);
  }
}

const HTML_MARKS: Record<string, string> = { bold: "strong", italic: "em", strike: "s", underline: "u", highlight: "mark", code: "code" };

const HTML_INLINE: InlineDialect = {
  open: (m) => (m.type === "link" ? `<a href="${escapeHtml(m.attrs?.href ?? "")}">` : `<${HTML_MARKS[m.type]}>`),
  close: (m) => (m.type === "link" ? "</a>" : `</${HTML_MARKS[m.type]}>`),
  text: (text) => escapeHtml(text),
  atom: (node, st) => {
    if (node.type === "hardBreak") return "<br>";
    if (node.type === "citation") {
      const n = citationNumber(node, st);
      return `<sup class="footnote-ref"><a href="#fn${n}" id="fnref${n}">${n}</a></sup>`;
    }
    if (node.type === "wikiLink") {
      const href = st.ctx.linkHref?.(node.attrs?.id);
      const title = escapeHtml(wikiTitle(node, st));
      return href ? `<a class="wikilink" href="${escapeHtml(href)}">${title}</a>` : `<span class="wikilink">${title}</span>`;
    }
    return "";
  },
};

function htmlChildren(node: JSONContent, st: State, unwrapSingleParagraph = false) {
  const children = node.content ?? [];
  if (unwrapSingleParagraph && children.length === 1 && children[0].type === "paragraph") return renderInline(children[0].content, st, HTML_INLINE);
  return children.map((c) => htmlBlock(c, st)).join("");
}

function spanAttrs(node: JSONContent) {
  const colspan = node.attrs?.colspan ?? 1;
  const rowspan = node.attrs?.rowspan ?? 1;
  return `${colspan > 1 ? ` colspan="${colspan}"` : ""}${rowspan > 1 ? ` rowspan="${rowspan}"` : ""}`;
}

function htmlBlock(node: JSONContent, st: State): string {
  switch (node.type) {
    case "paragraph": {
      const inner = renderInline(node.content, st, HTML_INLINE);
      return inner ? `<p>${inner}</p>\n` : "";
    }
    case "heading": {
      const level = node.attrs?.level ?? 1;
      return `<h${level}>${renderInline(node.content, st, HTML_INLINE)}</h${level}>\n`;
    }
    case "blockquote":
      return `<blockquote>\n${htmlChildren(node, st)}</blockquote>\n`;
    case "codeBlock": {
      const lang = node.attrs?.language ? ` class="language-${escapeHtml(node.attrs.language)}"` : "";
      return `<pre><code${lang}>${escapeHtml(textOf(node))}</code></pre>\n`;
    }
    case "horizontalRule":
      return "<hr>\n";
    case "bulletList":
      return `<ul>\n${htmlChildren(node, st)}</ul>\n`;
    case "orderedList": {
      const start = node.attrs?.start ?? 1;
      return `<ol${start !== 1 ? ` start="${start}"` : ""}>\n${htmlChildren(node, st)}</ol>\n`;
    }
    case "taskList":
      return `<ul class="task-list">\n${htmlChildren(node, st)}</ul>\n`;
    case "listItem":
      return `<li>${htmlChildren(node, st, true)}</li>\n`;
    case "taskItem": {
      const checked = !!node.attrs?.checked;
      return `<li class="task-item" data-checked="${checked}"><input type="checkbox" disabled${checked ? " checked" : ""}> ${htmlChildren(node, st, true)}</li>\n`;
    }
    case "image": {
      const { src = "", alt = "", title, width, align = "center" } = node.attrs ?? {};
      const extra = `${title ? ` title="${escapeHtml(title)}"` : ""}${width ? ` width="${Math.round(width)}"` : ""}`;
      return `<figure class="align-${align}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt ?? "")}"${extra}></figure>\n`;
    }
    case "table":
      return `<table>\n<tbody>\n${htmlChildren(node, st)}</tbody>\n</table>\n`;
    case "tableRow":
      return `<tr>${htmlChildren(node, st)}</tr>\n`;
    case "tableHeader":
      return `<th${spanAttrs(node)}>${htmlChildren(node, st, true)}</th>`;
    case "tableCell":
      return `<td${spanAttrs(node)}>${htmlChildren(node, st, true)}</td>`;
    default:
      return htmlChildren(node, st);
  }
}

const TXT_INLINE: InlineDialect = {
  open: () => "",
  close: () => "",
  text: (text) => text,
  atom: (node, st) => {
    if (node.type === "hardBreak") return "\n";
    if (node.type === "citation") return `[${citationNumber(node, st)}]`;
    if (node.type === "wikiLink") return wikiTitle(node, st);
    return "";
  },
};

function txtBlock(node: JSONContent, st: State, marker = ""): string {
  const inline = () => renderInline(node.content, st, TXT_INLINE);
  const blocks = (nodes: JSONContent[] = []) => nodes.map((n) => txtBlock(n, st)).join("\n\n");
  const indent = (text: string, first: string) =>
    text
      .split("\n")
      .map((l, i) => (i === 0 ? first + l : l ? " ".repeat(first.length) + l : ""))
      .join("\n");
  switch (node.type) {
    case "paragraph":
    case "heading":
      return inline();
    case "codeBlock":
      return textOf(node);
    case "horizontalRule":
      return "* * *";
    case "blockquote":
      return indent(blocks(node.content), "    ");
    case "bulletList":
      return (node.content ?? []).map((li) => indent(txtItem(li, st), "- ")).join("\n");
    case "orderedList":
      return (node.content ?? []).map((li, i) => indent(txtItem(li, st), `${(node.attrs?.start ?? 1) + i}. `)).join("\n");
    case "taskList":
      return (node.content ?? []).map((li) => indent(txtItem(li, st), li.attrs?.checked ? "[x] " : "[ ] ")).join("\n");
    case "image":
      return node.attrs?.alt ? `[Image: ${node.attrs.alt}]` : "[Image]";
    case "table":
      return (node.content ?? [])
        .map((row) => (row.content ?? []).map((cell) => (cell.content ?? []).map((p) => renderInline(p.content, st, TXT_INLINE)).join(" ")).join(" | "))
        .join("\n");
    default:
      return marker + blocks(node.content);
  }
}

function txtItem(item: JSONContent, st: State) {
  return (item.content ?? []).map((n) => txtBlock(n, st)).join("\n");
}

function bibliographySources(st: State) {
  const ids = new Set([...st.citations.map((c) => c.sourceId), ...(st.ctx.bibliography ?? [])]);
  return [...ids]
    .map((id) => st.ctx.sources.get(id))
    .filter((s): s is Source => !!s)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export function renderDocument(title: string, content: JSONContent | null, ctx: RenderContext, format: ExportFormat) {
  const st: State = { ctx, citations: [] };
  const doc = content ?? { type: "doc", content: [] };
  const style = ctx.style;

  if (format === "md") {
    const body = mdJoin(doc.content ?? [], st);
    const notes = st.citations.map((c, i) => `[^${i + 1}]: ${renderSegs(footnote(ctx.sources.get(c.sourceId), style, c.quote, c.locator), "md")}`);
    const refs = bibliographySources(st).map((s) => renderSegs(reference(s, style), "md"));
    return [title && `# ${title}`, body, notes.join("\n"), refs.length && `## ${referencesTitle(style)}\n\n${refs.join("\n\n")}`].filter(Boolean).join("\n\n") + "\n";
  }

  if (format === "txt") {
    const body = (doc.content ?? []).map((n) => txtBlock(n, st)).join("\n\n");
    const notes = st.citations.map((c, i) => `[${i + 1}] ${renderSegs(footnote(ctx.sources.get(c.sourceId), style, c.quote, c.locator), "txt")}`);
    const refs = bibliographySources(st).map((s) => renderSegs(reference(s, style), "txt"));
    return [title, body, notes.length && `Notes\n\n${notes.join("\n")}`, refs.length && `${referencesTitle(style)}\n\n${refs.join("\n\n")}`].filter(Boolean).join("\n\n") + "\n";
  }

  const body = (doc.content ?? []).map((n) => htmlBlock(n, st)).join("");
  const notes = st.citations.length
    ? `<section class="footnotes">\n<ol>\n${st.citations
        .map((c, i) => `<li id="fn${i + 1}">${renderSegs(footnote(ctx.sources.get(c.sourceId), style, c.quote, c.locator), "html")} <a href="#fnref${i + 1}" class="footnote-back">↩</a></li>`)
        .join("\n")}\n</ol>\n</section>\n`
    : "";
  const refs = bibliographySources(st);
  const refList = refs.length
    ? `<section class="references">\n<h2>${referencesTitle(style)}</h2>\n${refs.map((s) => `<p>${renderSegs(reference(s, style), "html")}</p>`).join("\n")}\n</section>\n`
    : "";
  return `${title ? `<h1>${escapeHtml(title)}</h1>\n` : ""}${body}${notes}${refList}`;
}

export function wrapHtmlDocument(title: string, fragment: string) {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(title)}</title>\n</head>\n<body>\n<article>\n${fragment}</article>\n</body>\n</html>\n`;
}
