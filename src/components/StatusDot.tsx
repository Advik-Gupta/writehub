import type { DocStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_COLORS: Record<DocStatus, string> = {
  not_started: "var(--color-faint)",
  drafting: "var(--color-info)",
  revising: "var(--color-warn)",
  done: "var(--color-accent)",
};

export function StatusDot({ status, className }: { status: DocStatus; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: STATUS_COLORS[status] }} />;
}
