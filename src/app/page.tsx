"use client";

import dynamic from "next/dynamic";
import { SessionGate } from "@/components/auth/SessionGate";
import { Providers } from "./providers";

const Workspace = dynamic(() => import("@/components/workspace/Workspace").then((module) => module.Workspace), { ssr: false });

export default function Home() {
  return (
    <Providers>
      <SessionGate>
        <Workspace />
      </SessionGate>
    </Providers>
  );
}
