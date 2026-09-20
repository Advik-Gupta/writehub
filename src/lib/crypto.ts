import { KDF_ITERATIONS } from "./config";
import type { Encrypted } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const randomSalt = () => toBase64(crypto.getRandomValues(new Uint8Array(16)));

export async function deriveCredentials(password: string, salt: string) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromBase64(salt), iterations: KDF_ITERATIONS, hash: "SHA-256" }, base, 512),
  );
  const wrappingKey = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { wrappingKey, authSecret: toBase64(bits.slice(32)) };
}

export const createDataKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

export const exportDataKey = async (key: CryptoKey) => toBase64(await crypto.subtle.exportKey("raw", key));

export const importDataKey = (raw: string) => crypto.subtle.importKey("raw", fromBase64(raw), "AES-GCM", true, ["encrypt", "decrypt"]);

export async function encryptBytes(key: CryptoKey, bytes: BufferSource): Promise<Encrypted> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { ct: toBase64(ct), iv: toBase64(iv) };
}

export async function decryptBytes(key: CryptoKey, blob: Encrypted) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(blob.iv) }, key, fromBase64(blob.ct)));
}

export const encryptJson = <T>(key: CryptoKey, value: T) => encryptBytes(key, encoder.encode(JSON.stringify(value)));

export async function decryptJson<T>(key: CryptoKey, blob: Encrypted) {
  return JSON.parse(decoder.decode(await decryptBytes(key, blob))) as T;
}

export async function wrapDataKey(wrappingKey: CryptoKey, dataKey: CryptoKey) {
  return encryptBytes(wrappingKey, new Uint8Array(await crypto.subtle.exportKey("raw", dataKey)));
}

export async function unwrapDataKey(wrappingKey: CryptoKey, blob: Encrypted) {
  return crypto.subtle.importKey("raw", await decryptBytes(wrappingKey, blob), "AES-GCM", true, ["encrypt", "decrypt"]);
}

export function packBytes(type: string, bytes: Uint8Array) {
  const label = encoder.encode(type);
  const packed = new Uint8Array(new ArrayBuffer(1 + label.length + bytes.length));
  packed[0] = label.length;
  packed.set(label, 1);
  packed.set(bytes, 1 + label.length);
  return packed;
}

export function unpackBytes(packed: Uint8Array) {
  const length = packed[0];
  return { type: decoder.decode(packed.subarray(1, 1 + length)), bytes: packed.subarray(1 + length) };
}
