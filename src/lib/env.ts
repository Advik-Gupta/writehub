function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function env() {
  return {
    mongoUri: required("MONGODB_URI"),
    mongoDb: process.env.MONGODB_DB ?? "writehub",
    sessionSecret: required("SESSION_SECRET"),
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  };
}
