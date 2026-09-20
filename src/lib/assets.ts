"use client";

import { decryptBytes, encryptBytes, packBytes, toBase64, unpackBytes } from "./crypto";
import { dataKey } from "./session";
import type { Encrypted } from "./types";

const objectUrls = new Map<string, string>();
const dataUrls = new Map<string, string>();

export const ASSET_PREFIX = "asset:";

export const assetId = (src: string) => (src.startsWith(ASSET_PREFIX) ? src.slice(ASSET_PREFIX.length) : null);

export async function uploadAsset(file: File) {
  const packed = packBytes(file.type || "image/png", new Uint8Array(await file.arrayBuffer()));
  const blob = await encryptBytes(dataKey(), packed);
  const res = await fetch("/api/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ iv: blob.iv, data: blob.ct }),
  });
  if (!res.ok) throw new Error("Upload failed");
  const { id } = (await res.json()) as { id: string };
  return `${ASSET_PREFIX}${id}`;
}

async function fetchAsset(id: string) {
  const res = await fetch(`/api/assets/${id}`);
  if (!res.ok) throw new Error("Image not found");
  const { iv, data } = (await res.json()) as { iv: string; data: string };
  return unpackBytes(await decryptBytes(dataKey(), { iv, ct: data } satisfies Encrypted));
}

export async function assetObjectUrl(src: string) {
  const id = assetId(src);
  if (!id) return src;
  const cached = objectUrls.get(id);
  if (cached) return cached;
  const { type, bytes } = await fetchAsset(id);
  const url = URL.createObjectURL(new Blob([bytes.slice()], { type }));
  objectUrls.set(id, url);
  return url;
}

export async function assetDataUrl(src: string) {
  const id = assetId(src);
  if (!id) return src;
  const cached = dataUrls.get(id);
  if (cached) return cached;
  const { type, bytes } = await fetchAsset(id);
  const url = `data:${type};base64,${toBase64(bytes)}`;
  dataUrls.set(id, url);
  return url;
}
