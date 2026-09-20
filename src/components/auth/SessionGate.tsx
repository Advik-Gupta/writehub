"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { loadSession, useSession } from "@/lib/session";
import { LockScreen } from "./LockScreen";

export function SessionGate({ children }: { children: ReactNode }) {
  const status = useSession((state) => state.status);
  const router = useRouter();

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);

  if (status === "ready") return <>{children}</>;
  if (status === "locked") return <LockScreen />;
  return <div className="h-screen w-screen bg-bg" />;
}
