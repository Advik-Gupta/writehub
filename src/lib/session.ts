"use client";

import { create } from "zustand";
import { SESSION_EMAIL_STORAGE, SESSION_KEY_STORAGE } from "./config";
import { createDataKey, deriveCredentials, decryptJson, encryptJson, exportDataKey, importDataKey, randomSalt, unwrapDataKey, wrapDataKey } from "./crypto";
import { queryClient } from "./queryClient";
import type { Encrypted, Profile, Settings } from "./types";

export type SessionStatus = "loading" | "signedOut" | "locked" | "ready";

export interface AppLock {
  salt: string;
  wrappedKey: Encrypted;
}

interface SessionState {
  status: SessionStatus;
  email: string | null;
  createdAt: number | null;
  kdfSalt: string | null;
  wrappedKey: Encrypted | null;
  appLock: AppLock | null;
  profileBlob: Encrypted | null;
  profile: Profile | null;
  key: CryptoKey | null;
}

const storage = {
  read() {
    try {
      return sessionStorage.getItem(SESSION_KEY_STORAGE);
    } catch {
      return null;
    }
  },
  write(value: string | null, email: string | null) {
    try {
      if (value && email) {
        sessionStorage.setItem(SESSION_KEY_STORAGE, value);
        sessionStorage.setItem(SESSION_EMAIL_STORAGE, email);
      } else {
        sessionStorage.removeItem(SESSION_KEY_STORAGE);
        sessionStorage.removeItem(SESSION_EMAIL_STORAGE);
      }
    } catch {
      return;
    }
  },
};

export const useSession = create<SessionState>(() => ({
  status: "loading",
  email: null,
  createdAt: null,
  kdfSalt: null,
  wrappedKey: null,
  appLock: null,
  profileBlob: null,
  profile: null,
  key: null,
}));

export function dataKey() {
  const key = useSession.getState().key;
  if (!key) throw new Error("Workspace is locked");
  return key;
}

async function request<T>(url: string, method: string, payload?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

interface SessionPayload {
  email: string;
  kdfSalt: string;
  wrappedKey: Encrypted;
  appLock?: AppLock | null;
  profile?: Encrypted | null;
  createdAt: number;
}

async function adopt(payload: SessionPayload, key: CryptoKey) {
  storage.write(await exportDataKey(key), payload.email);
  const profile = payload.profile ? await decryptJson<Profile>(key, payload.profile).catch(() => null) : null;
  useSession.setState({
    status: "ready",
    email: payload.email,
    createdAt: payload.createdAt,
    kdfSalt: payload.kdfSalt,
    wrappedKey: payload.wrappedKey,
    appLock: payload.appLock ?? null,
    profileBlob: payload.profile ?? null,
    profile,
    key,
  });
}

export async function loadSession() {
  try {
    const payload = await request<SessionPayload>("/api/auth/session", "GET");
    const stored = storage.read();
    if (stored) {
      await adopt(payload, await importDataKey(stored));
      return;
    }
    useSession.setState({
      status: "locked",
      email: payload.email,
      createdAt: payload.createdAt,
      kdfSalt: payload.kdfSalt,
      wrappedKey: payload.wrappedKey,
      appLock: payload.appLock ?? null,
      profileBlob: payload.profile ?? null,
      profile: null,
      key: null,
    });
  } catch {
    storage.write(null, null);
    useSession.setState({ status: "signedOut", email: null, createdAt: null, kdfSalt: null, wrappedKey: null, appLock: null, profileBlob: null, profile: null, key: null });
  }
}

export async function signIn(email: string, password: string) {
  const { kdfSalt } = await request<{ kdfSalt: string }>("/api/auth/challenge", "POST", { email });
  const { wrappingKey, authSecret } = await deriveCredentials(password, kdfSalt);
  const payload = await request<SessionPayload>("/api/auth/login", "POST", { email, authSecret });
  const key = await unwrapDataKey(wrappingKey, payload.wrappedKey).catch(() => {
    throw new Error("Email or password is incorrect");
  });
  await adopt(payload, key);
}

export async function register(input: { email: string; password: string; profile: Profile; settings: Settings }) {
  const kdfSalt = randomSalt();
  const { wrappingKey, authSecret } = await deriveCredentials(input.password, kdfSalt);
  const key = await createDataKey();
  const wrappedKey = await wrapDataKey(wrappingKey, key);
  const profile = await encryptJson(key, input.profile);
  const payload = await request<{ email: string; createdAt: number }>("/api/auth/register", "POST", {
    email: input.email,
    authSecret,
    kdfSalt,
    wrappedKey,
    profile,
    settings: await encryptJson(key, input.settings),
  });
  await adopt({ email: payload.email, createdAt: payload.createdAt, kdfSalt, wrappedKey, profile }, key);
}

export async function unlock(password: string, mode: "account" | "app" = "account") {
  const { kdfSalt, wrappedKey, appLock, email, createdAt, profileBlob } = useSession.getState();
  if (!email) throw new Error("No session to unlock");
  if (mode === "app") {
    if (!appLock) throw new Error("No app password is set");
    const { wrappingKey } = await deriveCredentials(password, appLock.salt);
    const key = await unwrapDataKey(wrappingKey, appLock.wrappedKey).catch(() => {
      throw new Error("That app password is not right");
    });
    await adopt({ email, createdAt: createdAt ?? Date.now(), kdfSalt: kdfSalt as string, wrappedKey: wrappedKey as Encrypted, appLock, profile: profileBlob }, key);
    return;
  }
  if (!kdfSalt || !wrappedKey) throw new Error("No session to unlock");
  const { wrappingKey } = await deriveCredentials(password, kdfSalt);
  const key = await unwrapDataKey(wrappingKey, wrappedKey).catch(() => {
    throw new Error("That password does not match this account");
  });
  await adopt({ email, createdAt: createdAt ?? Date.now(), kdfSalt, wrappedKey, appLock, profile: profileBlob }, key);
}

export function lockNow() {
  if (useSession.getState().status !== "ready") return;
  storage.write(null, null);
  queryClient.clear();
  useSession.setState({ status: "locked", key: null, profile: null });
}

export async function signOut() {
  await request("/api/auth/logout", "POST", {}).catch(() => undefined);
  storage.write(null, null);
  queryClient.clear();
  useSession.setState({ status: "signedOut", email: null, createdAt: null, kdfSalt: null, wrappedKey: null, appLock: null, profileBlob: null, profile: null, key: null });
}

export async function setAppPassword(password: string | null) {
  if (!password) {
    await request("/api/auth/applock", "PATCH", { appLock: null });
    useSession.setState({ appLock: null });
    return;
  }
  const salt = randomSalt();
  const { wrappingKey } = await deriveCredentials(password, salt);
  const appLock: AppLock = { salt, wrappedKey: await wrapDataKey(wrappingKey, dataKey()) };
  await request("/api/auth/applock", "PATCH", { appLock });
  useSession.setState({ appLock });
}

export async function updateEmail(currentPassword: string, email: string) {
  const { kdfSalt } = useSession.getState();
  if (!kdfSalt) throw new Error("No session");
  const { authSecret } = await deriveCredentials(currentPassword, kdfSalt);
  const result = await request<{ email: string }>("/api/auth/account", "PATCH", { authSecret, email });
  useSession.setState({ email: result.email });
}

export async function changePassword(currentPassword: string, nextPassword: string) {
  const state = useSession.getState();
  if (!state.kdfSalt || !state.key) throw new Error("Workspace is locked");
  const { authSecret } = await deriveCredentials(currentPassword, state.kdfSalt);
  const kdfSalt = randomSalt();
  const next = await deriveCredentials(nextPassword, kdfSalt);
  const wrappedKey = await wrapDataKey(next.wrappingKey, state.key);
  await request("/api/auth/account", "PATCH", { authSecret, credentials: { authSecret: next.authSecret, kdfSalt, wrappedKey } });
  useSession.setState({ kdfSalt, wrappedKey, appLock: null });
}

export async function updateProfile(profile: Profile) {
  const blob = await encryptJson(dataKey(), profile);
  await request("/api/auth/profile", "PATCH", { profile: blob });
  useSession.setState({ profile, profileBlob: blob });
}

export async function deleteAccount(password: string) {
  const { kdfSalt } = useSession.getState();
  if (!kdfSalt) throw new Error("No session");
  const { authSecret } = await deriveCredentials(password, kdfSalt);
  await request("/api/auth/account", "DELETE", { authSecret });
  storage.write(null, null);
  queryClient.clear();
  useSession.setState({ status: "signedOut", email: null, createdAt: null, kdfSalt: null, wrappedKey: null, appLock: null, profileBlob: null, profile: null, key: null });
}
