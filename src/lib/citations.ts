import type { CitationStyle, Source } from "./types";
import { escapeHtml } from "./utils";

export type Seg = string | { i: string };
type Name = { first: string; last: string };

export const STYLE_LABELS: Record<CitationStyle, string> = { mla: "MLA 9", apa: "APA 7", chicago: "Chicago" };

export function referencesTitle(style: CitationStyle) {
  return style === "mla" ? "Works Cited" : style === "apa" ? "References" : "Bibliography";
}

function parseNames(authors: string): Name[] {
  return authors
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      if (a.includes(",")) {
        const [last, ...rest] = a.split(",");
        return { last: last.trim(), first: rest.join(",").trim() };
      }
      const parts = a.split(/\s+/);
      const last = parts.pop() ?? "";
      return { first: parts.join(" "), last };
    });
}

const full = (n: Name) => [n.first, n.last].filter(Boolean).join(" ");
const inverted = (n: Name) => (n.first ? `${n.last}, ${n.first}` : n.last);
const initials = (first: string) =>
  first
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");
const apaName = (n: Name) => (n.first ? `${n.last}, ${initials(n.first)}` : n.last);
const dot = (s: string) => (!s || /[.?!]$/.test(s) ? s : `${s}.`);
const yearOf = (date: string) => date.match(/\d{4}/)?.[0] ?? "";
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function mlaDate(date: string) {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}${d.getMonth() === 4 ? "" : "."} ${d.getFullYear()}`;
}

function authorList(names: Name[], style: CitationStyle) {
  if (!names.length) return "";
  if (style === "apa") {
    const list = names.map(apaName);
    if (list.length === 1) return list[0];
    return `${list.slice(0, -1).join(", ")}, & ${list[list.length - 1]}`;
  }
  if (names.length === 1) return inverted(names[0]);
  if (style === "mla") {
    return names.length === 2 ? `${inverted(names[0])}, and ${full(names[1])}` : `${inverted(names[0])}, et al.`;
  }
  const rest = names.slice(1).map(full);
  return `${inverted(names[0])}, ${rest.length > 1 ? `${rest.slice(0, -1).join(", ")}, and ` : "and "}${rest[rest.length - 1]}`;
}

function shortAuthor(names: Name[], style: CitationStyle) {
  if (!names.length) return "";
  if (names.length === 1) return names[0].last;
  if (names.length === 2) return `${names[0].last} ${style === "apa" ? "&" : "and"} ${names[1].last}`;
  return `${names[0].last} et al.`;
}

const compact = (segs: (Seg | false | undefined | null)[]) => segs.filter((s): s is Seg => !!s && (typeof s !== "object" || !!s.i));

export function reference(source: Source, style: CitationStyle): Seg[] {
  const names = parseNames(source.authors);
  const authors = authorList(names, style);
  const { title, container, publisher, pages, url, accessed, kind } = source;
  const year = yearOf(source.date);
  const site = container || hostOf(url);

  if (style === "apa") {
    const when = kind === "website" ? source.date || "n.d." : year || "n.d.";
    const lead = authors ? `${dot(authors)} (${when}). ` : "";
    const titleFirst = !authors;
    const titleSeg: Seg[] = kind === "book" || kind === "website" ? [{ i: title }] : [title];
    const head: Seg[] = titleFirst ? [...titleSeg, `. (${when}). `] : [lead, ...titleSeg, ". "];
    if (kind === "book") return compact([...head, publisher && dot(publisher), url && ` ${url}`]);
    if (kind === "article") return compact([...head, { i: container }, pages && `, ${pages}`, container && ".", url && ` ${url}`]);
    if (kind === "website") return compact([...head, site && `${dot(site)} `, url]);
    return compact([...head, "Personal communication."]);
  }

  const lead = authors ? `${dot(authors)} ` : "";
  if (style === "mla") {
    if (kind === "book") return compact([lead, { i: title }, ". ", dot([publisher, year].filter(Boolean).join(", "))]);
    if (kind === "article")
      return compact([lead, `“${dot(title)}” `, { i: container }, container && ", ", dot([source.date || year, pages && `pp. ${pages}`].filter(Boolean).join(", ")), url && ` ${dot(url)}`]);
    if (kind === "website")
      return compact([lead, `“${dot(title)}” `, { i: site }, site && ", ", dot([mlaDate(source.date), url].filter(Boolean).join(", ")), accessed && ` Accessed ${dot(mlaDate(accessed))}`]);
    return compact([lead, dot(title || "Personal interview"), source.date && ` ${dot(mlaDate(source.date))}`]);
  }

  if (kind === "book") return compact([lead, { i: title }, ". ", dot([publisher, year].filter(Boolean).join(", "))]);
  if (kind === "article")
    return compact([lead, `“${dot(title)}” `, { i: container }, year && ` (${year})`, pages && `: ${pages}`, ".", url && ` ${dot(url)}`]);
  if (kind === "website") return compact([lead, `“${dot(title)}” `, site && `${dot(site)} `, source.date && `${dot(source.date)} `, url && dot(url)]);
  return compact([lead, dot(title || "Interview"), source.date && ` ${dot(source.date)}`]);
}

export function inText(source: Source, style: CitationStyle, locator = ""): Seg[] {
  const names = parseNames(source.authors);
  const who = shortAuthor(names, style);
  const shortTitle = source.title.split(/[:.?]/)[0].trim();
  if (style === "apa") return [`(${who || shortTitle}, ${yearOf(source.date) || "n.d."}${locator ? `, p. ${locator}` : ""})`];
  if (style === "mla") return [`(${who || shortTitle}${locator ? ` ${locator}` : ""})`];
  return compact([who && `${who}, `, source.kind === "book" ? { i: shortTitle } : `“${shortTitle}”`, locator && `, ${locator}`, "."]);
}

export function footnote(source: Source | undefined, style: CitationStyle, quote: string, locator: string): Seg[] {
  const cite: Seg[] = source ? inText(source, style, locator) : ["(missing source)"];
  return quote ? [`“${quote}” `, ...cite] : cite;
}

export function sortKey(source: Source) {
  return (parseNames(source.authors)[0]?.last || source.title).toLowerCase();
}

export function renderSegs(segs: Seg[], format: "html" | "md" | "txt") {
  return segs
    .map((s) => {
      if (typeof s === "string") return format === "html" ? escapeHtml(s) : s;
      if (format === "html") return `<i>${escapeHtml(s.i)}</i>`;
      return format === "md" ? `*${s.i}*` : s.i;
    })
    .join("");
}
