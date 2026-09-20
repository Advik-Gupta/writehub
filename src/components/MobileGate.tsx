import { Monitor } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export function MobileGate() {
  return (
    <div className="desktop-only-gate fixed inset-0 z-[200] flex-col items-center justify-center gap-4 bg-bg px-8 text-center">
      <Monitor className="size-8 text-accent" />
      <h1 className="text-lg font-semibold">{APP_NAME} is built for desktop</h1>
      <p className="max-w-xs text-[13px] leading-relaxed text-mute">
        The binder, split view and corkboard need a keyboard, a pointer and a wide screen. Open this on a laptop or desktop to start writing.
      </p>
    </div>
  );
}
