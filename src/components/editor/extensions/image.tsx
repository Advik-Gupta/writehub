import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { TextAlignCenter as AlignCenter, TextAlignStart as AlignLeft, TextAlignEnd as AlignRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { assetObjectUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

type Align = "left" | "center" | "right";

function ImageView({ node, updateAttributes, selected, editor }: ReactNodeViewProps) {
  const { src, alt, width, align } = node.attrs as { src: string; alt: string | null; width: number | null; align: Align };
  const [draft, setDraft] = useState<number | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    assetObjectUrl(src)
      .then((url) => {
        if (active) setResolved(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [src]);

  const startResize = (event: React.PointerEvent, side: 1 | -1) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = frame.current!.getBoundingClientRect().width;
    const maxWidth = frame.current!.closest(".prose-doc")?.clientWidth ?? 2000;
    const factor = align === "center" ? 2 : 1;
    let latest = startWidth;
    const move = (e: PointerEvent) => {
      latest = Math.round(Math.max(80, Math.min(maxWidth, startWidth + (e.clientX - startX) * side * factor)));
      setDraft(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      updateAttributes({ width: latest });
      setDraft(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const shownWidth = draft ?? width;
  const alignButtons: [Align, typeof AlignLeft][] = [
    ["left", AlignLeft],
    ["center", AlignCenter],
    ["right", AlignRight],
  ];

  return (
    <NodeViewWrapper className={cn("my-6 flex", align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center")} data-drag-handle>
      <div ref={frame} className={cn("group relative max-w-full rounded-md transition-shadow", selected && "ring-2 ring-accent ring-offset-2 ring-offset-bg")} style={{ width: shownWidth ? `${shownWidth}px` : undefined }}>
        {resolved ? (
          <img src={resolved} alt={alt ?? ""} draggable={false} className="block w-full rounded-md" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-md border border-line bg-raised text-xs text-mute">Decrypting image</div>
        )}
        {editor.isEditable && (
          <>
            {([-1, 1] as const).map((side) => (
              <span
                key={side}
                onPointerDown={(e) => startResize(e, side)}
                className={cn(
                  "absolute bottom-2 h-10 w-1.5 cursor-ew-resize rounded-full border border-black/40 bg-white/85 opacity-0 shadow transition-opacity group-hover:opacity-100",
                  side === -1 ? "left-2" : "right-2",
                  (selected || draft) && "opacity-100",
                )}
              />
            ))}
            {selected && (
              <div className="menu-content absolute top-2 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-lg border border-line-strong bg-raised/95 p-0.5 shadow-xl backdrop-blur">
                {alignButtons.map(([value, Icon]) => (
                  <button
                    key={value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      updateAttributes({ align: value });
                    }}
                    className={cn("flex size-7 items-center justify-center rounded-md text-mute hover:bg-hover hover:text-fg", align === value && "text-accent")}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => (el.getAttribute("width") ? Number(el.getAttribute("width")) : null),
        renderHTML: (a) => (a.width ? { width: a.width } : {}),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? el.closest("figure")?.className.match(/align-(\w+)/)?.[1] ?? "center",
        renderHTML: (a) => ({ "data-align": a.align }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
}).configure({ allowBase64: true, resize: false });
