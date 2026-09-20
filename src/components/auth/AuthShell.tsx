import { Feather } from "lucide-react";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

export function AuthShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center gap-2 px-8">
          <Feather className="size-4 text-accent" />
          <span className="text-[13px] font-semibold tracking-tight">{APP_NAME}</span>
        </header>
        <div className="flex flex-1 items-center justify-center px-8 pb-16">{children}</div>
      </div>
      {aside && <div className="hidden w-[420px] shrink-0 overflow-y-auto border-l border-line bg-panel px-8 py-10 xl:block">{aside}</div>}
    </div>
  );
}
