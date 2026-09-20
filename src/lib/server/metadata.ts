import type { SourceInput } from "../types";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function metaValues(html: string, key: string) {
  const values: string[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) => tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
    const id = attr("property") ?? attr("name") ?? attr("itemprop");
    const content = attr("content");
    if (id && content && (id[2] ?? id[3]).toLowerCase() === key) values.push(decode(content[2] ?? content[3]));
  }
  return values;
}

function jsonLd(html: string) {
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of blocks) {
    try {
      const data = JSON.parse(raw);
      const items = [data, ...(Array.isArray(data) ? data : []), ...(data["@graph"] ?? [])];
      const article = items.find((i) => i && typeof i === "object" && (i.headline || i.datePublished || i.author));
      if (article) return article;
    } catch {}
  }
  return null;
}

function ldAuthors(author: unknown): string[] {
  if (!author) return [];
  const list = Array.isArray(author) ? author : [author];
  return list.map((a) => (typeof a === "string" ? a : (a as { name?: string })?.name ?? "")).filter(Boolean);
}

export async function fetchSourceMetadata(url: string): Promise<Partial<SourceInput>> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", accept: "text/html" },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  const html = (await res.text()).slice(0, 600_000);
  const first = (...keys: string[]) => keys.map((k) => metaValues(html, k)[0]).find(Boolean) ?? "";
  const ld = jsonLd(html);
  const host = new URL(res.url || url).hostname.replace(/^www\./, "");

  const citationAuthors = metaValues(html, "citation_author");
  const metaAuthor = first("author", "article:author", "parsely-author", "sailthru.author", "dc.creator");
  const authors = citationAuthors.length ? citationAuthors : ldAuthors(ld?.author).length ? ldAuthors(ld?.author) : metaAuthor && !metaAuthor.startsWith("http") ? [metaAuthor] : [];

  const journal = first("citation_journal_title");
  const ogType = first("og:type");
  const title = first("citation_title", "og:title", "twitter:title") || decode(ld?.headline ?? "") || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const date = (first("citation_publication_date", "article:published_time", "date", "dc.date") || ld?.datePublished || "").slice(0, 10).replace(/\//g, "-");

  return {
    kind: journal || ogType === "article" ? "article" : "website",
    title,
    authors: authors.join("; "),
    container: journal || first("og:site_name", "application-name") || host,
    publisher: first("citation_publisher", "dc.publisher"),
    date,
    url: res.url || url,
    accessed: new Date().toISOString().slice(0, 10),
  };
}
