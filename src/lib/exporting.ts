"use client";

import type { JSONContent } from "@tiptap/core";
import { actions, api, keys, loadDoc, loadSettings, loadSources, saveContent } from "./api";
import { assetDataUrl } from "./assets";
import { queryClient } from "./queryClient";
import { renderDocument, walk, wrapHtmlDocument, type RenderContext } from "./serialize";
import type { CompileRequest, DocRecord, ExportFormat, Tree } from "./types";
import { downloadFile, safeFilename } from "./utils";

const MIME: Record<ExportFormat, string> = {
  md: "text/markdown;charset=utf-8",
  html: "text/html;charset=utf-8",
  txt: "text/plain;charset=utf-8",
};

const cached = <T>(key: readonly unknown[], queryFn: () => Promise<T>) => queryClient.ensureQueryData({ queryKey: key, queryFn, staleTime: Infinity });

function bibliographyFor(docId: string) {
  const tree = queryClient.getQueryData<Tree>(keys.tree);
  return [...new Set([...(tree?.indexes[docId]?.citations ?? []), ...(tree?.metas[docId]?.manualSources ?? [])])];
}

async function renderContext(bibliography: string[]): Promise<RenderContext> {
  const [sources, settings] = await Promise.all([cached(keys.sources, loadSources), cached(keys.settings, loadSettings)]);
  const tree = queryClient.getQueryData<Tree>(keys.tree);
  return {
    sources: new Map(sources.map((source) => [source.id, source])),
    titles: new Map((tree?.nodes ?? []).map((node) => [node.id, node.title])),
    style: settings.citationStyle,
    bibliography,
  };
}

async function inlineAssets(content: JSONContent | null) {
  if (!content) return content;
  const clone = structuredClone(content) as JSONContent;
  const jobs: Promise<void>[] = [];
  walk(clone, (node) => {
    if (node.type === "image" && node.attrs?.src) {
      jobs.push(
        assetDataUrl(node.attrs.src as string)
          .then((url) => {
            node.attrs!.src = url;
          })
          .catch(() => undefined),
      );
    }
  });
  await Promise.all(jobs);
  return clone;
}

const docFor = (id: string) => cached<DocRecord>(keys.doc(id), () => loadDoc(id));

export async function renderDoc(docId: string, format: ExportFormat) {
  const doc = await docFor(docId);
  const context = await renderContext(bibliographyFor(docId));
  const body = renderDocument(doc.title, await inlineAssets(doc.content), context, format);
  return { title: doc.title, body: format === "html" ? wrapHtmlDocument(doc.title, body) : body };
}

export async function exportDocument(docId: string, format: ExportFormat) {
  const { title, body } = await renderDoc(docId, format);
  downloadFile(`${safeFilename(title)}.${format}`, body, MIME[format]);
}

export async function copyFormatted(docId: string) {
  const doc = await docFor(docId);
  const context = await renderContext(bibliographyFor(docId));
  const content = await inlineAssets(doc.content);
  const html = renderDocument(doc.title, content, context, "html");
  const text = renderDocument(doc.title, content, context, "txt");
  await navigator.clipboard.write([
    new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) }),
  ]);
}

export async function compile(request: CompileRequest): Promise<{ docId: string } | { body: string; mime: string }> {
  const docs = await Promise.all(request.docIds.map(docFor));
  const content: JSONContent[] = [];
  docs.forEach((doc, position) => {
    if (position > 0 && request.separator === "rule") content.push({ type: "horizontalRule" });
    if (request.includeTitles) content.push({ type: "heading", attrs: { level: 1 }, content: doc.title ? [{ type: "text", text: doc.title }] : [] });
    content.push(...(doc.content?.content ?? []));
  });
  const merged: JSONContent = { type: "doc", content };

  if (request.createDocument) {
    const tree = queryClient.getQueryData<Tree>(keys.tree);
    const projectId = docs[0]?.projectId ?? tree?.projects[0]?.id;
    const manuscript = tree?.nodes.find((node) => node.projectId === projectId && node.role === "manuscript");
    if (!manuscript) throw new Error("No manuscript folder to write into");
    const node = await actions.createNode(manuscript.id, "document", request.title);
    await saveContent(node.id, merged);
    const sources = [...new Set(request.docIds.flatMap(bibliographyFor))];
    for (const sourceId of sources) await actions.attachSource(node.id, sourceId, true);
    return { docId: node.id };
  }

  const bibliography = [...new Set(request.docIds.flatMap(bibliographyFor))];
  const context = await renderContext(bibliography);
  const body = renderDocument(request.title, await inlineAssets(merged), context, request.format);
  return { body: request.format === "html" ? wrapHtmlDocument(request.title, body) : body, mime: MIME[request.format] };
}

export async function publishShare(docId: string) {
  const doc = await docFor(docId);
  const [settings, context] = await Promise.all([cached(keys.settings, loadSettings), renderContext(bibliographyFor(docId))]);
  context.linkHref = undefined;
  const html = renderDocument(doc.title, await inlineAssets(doc.content), context, "html");
  const { slug } = await api.post<{ slug: string }>(`/api/nodes/${docId}/share`, {
    title: doc.title || "Untitled",
    author: settings.author,
    html,
    wordCount: doc.wordCount,
  });
  queryClient.setQueryData<DocRecord>(keys.doc(docId), (current) => current && { ...current, shareSlug: slug });
  queryClient.setQueryData<Tree>(keys.tree, (tree) =>
    tree ? { ...tree, nodes: tree.nodes.map((node) => (node.id === docId ? { ...node, shareSlug: slug } : node)) } : tree,
  );
  return slug;
}
