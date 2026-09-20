"use client";

import { AnimatePresence, motion, type Transition } from "motion/react";
import { Dialog as RDialog, Tooltip } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const spring: Transition = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 };
export const softSpring: Transition = { type: "spring", stiffness: 300, damping: 34 };

export function Tip({ label, shortcut, side = "bottom", children }: { label: ReactNode; shortcut?: string; side?: "top" | "bottom" | "left" | "right"; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="menu-content z-50 flex items-center gap-2 rounded-md border border-line-strong bg-raised px-2 py-1 text-xs text-dim shadow-xl shadow-black/40"
        >
          {label}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-bg px-1 font-mono text-[10px] leading-4 text-mute">{children}</kbd>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "subtle" | "danger"; size?: "sm" | "md" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "subtle", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-[background,color,transform,border-color] duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-accent text-accent-fg hover:brightness-110",
        variant === "subtle" && "border border-line-strong bg-raised text-fg hover:border-faint hover:bg-hover",
        variant === "ghost" && "text-dim hover:bg-hover hover:text-fg",
        variant === "danger" && "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
        className,
      )}
      {...props}
    />
  );
});

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; shortcut?: string; active?: boolean; size?: "sm" | "md"; side?: "top" | "bottom" | "left" | "right" };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, shortcut, active, size = "md", side, className, ...props }, ref) {
  return (
    <Tip label={label} shortcut={shortcut} side={side}>
      <button
        ref={ref}
        aria-label={label}
        data-active={active || undefined}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-md text-mute transition-[background,color,transform] duration-150 hover:bg-hover hover:text-fg active:scale-90 disabled:pointer-events-none disabled:opacity-30",
          size === "sm" ? "size-6 [&_svg]:size-[14px]" : "size-8 [&_svg]:size-4",
          active && "bg-hover text-accent hover:text-accent",
          className,
        )}
        {...props}
      />
    </Tip>
  );
});

export const inputClass =
  "w-full rounded-md border border-line-strong bg-bg px-2.5 py-1.5 text-[13px] text-fg placeholder:text-faint outline-none transition-colors focus:border-accent/60";

export const menuContentClass = "menu-content z-50 min-w-[180px] overflow-hidden rounded-lg border border-line-strong bg-raised p-1 text-[13px] shadow-2xl shadow-black/50";
export const menuItemClass =
  "flex h-7 cursor-default items-center gap-2 rounded-md px-2 text-fg outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-hover [&_svg]:size-3.5 [&_svg]:text-mute";
export const menuSeparatorClass = "my-1 h-px bg-line";
export const menuLabelClass = "px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-mute uppercase";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  width = 520,
  bare,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
  bare?: boolean;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <RDialog.Portal forceMount>
            <RDialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
            </RDialog.Overlay>
            <RDialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed top-[14vh] left-1/2 z-50 max-h-[76vh] w-full overflow-hidden rounded-xl border border-line-strong bg-panel shadow-2xl shadow-black/60 outline-none"
                style={{ maxWidth: width, x: "-50%" }}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.12 } }}
                transition={spring}
              >
                {bare ? (
                  <>
                    <RDialog.Title className="sr-only">{title}</RDialog.Title>
                    {children}
                  </>
                ) : (
                  <div className="flex max-h-[76vh] flex-col">
                    <div className="border-b border-line px-5 py-4">
                      <RDialog.Title className="text-sm font-semibold">{title}</RDialog.Title>
                      {description && <RDialog.Description className="mt-1 text-xs text-mute">{description}</RDialog.Description>}
                    </div>
                    <div className="overflow-y-auto px-5 py-4">{children}</div>
                  </div>
                )}
              </motion.div>
            </RDialog.Content>
          </RDialog.Portal>
        )}
      </AnimatePresence>
    </RDialog.Root>
  );
}

export function ProgressRing({ value, size = 22, stroke = 2.5 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line-strong)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={false}
        animate={{ strokeDashoffset: circumference * (1 - clamped) }}
        transition={softSpring}
      />
    </svg>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, layoutId }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; layoutId: string }) {
  return (
    <div className="flex rounded-lg border border-line bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn("relative flex-1 rounded-md px-2 py-1 text-xs transition-colors", value === o.value ? "text-fg" : "text-mute hover:text-dim")}
        >
          {value === o.value && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-md border border-line-strong bg-raised" transition={spring} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PanelSection({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border-b border-line px-4 py-3.5", className)}>
      <div className="mb-2.5 flex h-5 items-center justify-between">
        <h3 className="text-[11px] font-medium tracking-wider text-mute uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 text-faint [&_svg]:size-6">{icon}</div>}
      <p className="text-[13px] text-dim">{title}</p>
      {children && <div className="mt-1.5 text-xs leading-relaxed text-mute">{children}</div>}
    </div>
  );
}

export function Checkbox({ checked, onChange, className }: { checked: boolean; onChange: (value: boolean) => void; className?: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border transition-[background,border-color,transform] duration-150 active:scale-90",
        checked ? "border-accent bg-accent" : "border-line-strong hover:border-faint",
        className,
      )}
    >
      <svg viewBox="0 0 12 12" className="size-2.5">
        <motion.path
          d="M2.5 6.3l2.3 2.2 4.7-5"
          fill="none"
          stroke="var(--color-accent-fg)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        />
      </svg>
    </button>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-[18px] w-8 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line-strong")}>
      <motion.span className="absolute top-[2px] size-3.5 rounded-full bg-white shadow" initial={false} animate={{ left: checked ? 16 : 2 }} transition={spring} />
    </button>
  );
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PanelHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
      <h2 className="text-[13px] font-medium text-fg">{title}</h2>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}
