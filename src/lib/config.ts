export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "WriteHub";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const KDF_ITERATIONS = Number(process.env.NEXT_PUBLIC_KDF_ITERATIONS ?? 600000);
export const SESSION_KEY_STORAGE = "writehub.key";
export const SESSION_EMAIL_STORAGE = "writehub.email";
