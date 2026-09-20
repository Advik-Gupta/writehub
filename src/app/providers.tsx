"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
        {children}
      </Tooltip.Provider>
    </QueryClientProvider>
  );
}
