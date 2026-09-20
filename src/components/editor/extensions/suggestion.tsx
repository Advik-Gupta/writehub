import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  id: string;
  title: string;
  hint?: string;
  icon?: ReactNode;
}

interface MenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface MenuProps {
  items: MenuItem[];
  command: (item: MenuItem) => void;
}

const SuggestionMenu = forwardRef<MenuHandle, MenuProps>(function SuggestionMenu({ items, command }, ref) {
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => setIndex(0), [items]);
  useEffect(() => list.current?.children[index]?.scrollIntoView({ block: "nearest" }), [index]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        if (!items.length) return false;
        if (event.key === "ArrowDown") return setIndex((i) => (i + 1) % items.length), true;
        if (event.key === "ArrowUp") return setIndex((i) => (i - 1 + items.length) % items.length), true;
        if (event.key === "Enter" || event.key === "Tab") return command(items[index]), true;
        return false;
      },
    }),
    [items, index, command],
  );

  if (!items.length) return null;

  return (
    <div ref={list} className="menu-content max-h-80 w-72 overflow-y-auto rounded-lg border border-line-strong bg-raised p-1 shadow-2xl shadow-black/50">
      {items.map((item, i) => (
        <button
          key={item.id}
          onMouseDown={(e) => {
            e.preventDefault();
            command(item);
          }}
          onMouseMove={() => setIndex(i)}
          className={cn("flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors", i === index ? "bg-hover text-fg" : "text-dim")}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded border border-line-strong bg-bg text-mute [&_svg]:size-3">{item.icon}</span>
          <span className="flex-1 truncate">{item.title}</span>
          {item.hint && <span className="max-w-24 truncate font-mono text-[11px] text-faint">{item.hint}</span>}
        </button>
      ))}
    </div>
  );
});

export function suggestionRender<T extends MenuItem = MenuItem>(): SuggestionOptions<T, T>["render"] {
  return () => {
    let renderer: ReactRenderer<MenuHandle, MenuProps> | null = null;

    const toProps = (props: SuggestionProps<T, T>): MenuProps => ({ items: props.items, command: props.command as (item: MenuItem) => void });

    const place = (props: SuggestionProps<T, T>) => {
      const rect = props.clientRect?.();
      if (!rect || !renderer) return;
      const el = renderer.element as HTMLElement;
      computePosition({ getBoundingClientRect: () => rect }, el, {
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      });
    };

    return {
      onStart: (props) => {
        renderer = new ReactRenderer(SuggestionMenu, { props: toProps(props), editor: props.editor });
        const el = renderer.element as HTMLElement;
        Object.assign(el.style, { position: "fixed", zIndex: "60", left: "0px", top: "0px" });
        document.body.appendChild(el);
        place(props);
      },
      onUpdate: (props) => {
        renderer?.updateProps(toProps(props));
        place(props);
      },
      onKeyDown: ({ event }) => (event.key === "Escape" ? false : (renderer?.ref?.onKeyDown(event) ?? false)),
      onExit: () => {
        renderer?.element.remove();
        renderer?.destroy();
        renderer = null;
      },
    };
  };
}
