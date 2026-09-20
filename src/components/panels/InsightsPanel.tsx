"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { actions, useDoc } from "@/lib/api";
import { useDocStats } from "@/lib/editorHooks";
import { useActiveEditor, useUI, type StatsMode } from "@/lib/store";
import { cn } from "@/lib/utils";
import { inputClass, PanelSection, ProgressRing, Segmented } from "../ui";

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(value, { stiffness: 260, damping: 32 });
  const display = useTransform(spring, (v) => v.toLocaleString("en", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }));
  useEffect(() => spring.set(value), [spring, value]);
  return <motion.span>{display}</motion.span>;
}

export function InsightsPanel({ docId }: { docId: string }) {
  const editor = useActiveEditor();
  const stats = useDocStats(editor);
  const { data: doc } = useDoc(docId);
  const statsMode = useUI((s) => s.statsMode);
  const words = stats?.words ?? doc?.wordCount ?? 0;
  const goal = doc?.wordGoal ?? null;
  const progress = goal ? words / goal : 0;
  const [draft, setDraft] = useState(goal ? String(goal) : "");

  const commitGoal = (value: string) => {
    const n = Number.parseInt(value, 10);
    actions.updateNode(docId, { wordGoal: n > 0 ? n : null });
  };

  const items: [string, number, number?][] = [
    ["Pages", stats?.pages ?? 0, 1],
    ["Words", words],
    ["Characters", stats?.characters ?? 0],
    ["Paragraphs", stats?.paragraphs ?? 0],
    ["Outline topics", (stats?.headings ?? 0) + (doc?.outline.topics.length ?? 0)],
    ["Minutes to read", stats?.readingMinutes ?? 0],
  ];

  return (
    <div className="h-full overflow-y-auto">
      <PanelSection title="Word goal">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <ProgressRing value={progress} size={76} stroke={5} />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-semibold tabular-nums">
              {goal ? <><AnimatedNumber value={Math.round(progress * 100)} />%</> : <span className="text-faint">0%</span>}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              type="number"
              min={0}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commitGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitGoal(draft)}
              placeholder="Set a word goal"
              className={cn(inputClass, "font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")}
            />
            <p className="text-xs text-mute">
              {!goal ? "Track progress toward a length." : words >= goal ? <span className="text-accent">Goal reached.</span> : `${(goal - words).toLocaleString()} words to go`}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[500, 1000, 2500, 5000].map((n) => (
            <button
              key={n}
              onClick={() => {
                setDraft(String(n));
                actions.updateNode(docId, { wordGoal: n });
              }}
              className={cn(
                "h-6 flex-1 rounded-md border font-mono text-[11px] transition-colors",
                goal === n ? "border-accent/50 bg-accent/10 text-accent" : "border-line-strong text-mute hover:border-faint hover:text-dim",
              )}
            >
              {n >= 1000 ? `${n / 1000}k` : n}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Statistics">
        <dl className="grid grid-cols-2 gap-2">
          {items.map(([label, value, decimals]) => (
            <div key={label} className="rounded-lg border border-line bg-bg/50 px-3 py-2.5">
              <dt className="text-[11px] text-mute">{label}</dt>
              <dd className="mt-0.5 font-mono text-lg text-fg tabular-nums">
                <AnimatedNumber value={value} decimals={decimals} />
              </dd>
            </div>
          ))}
        </dl>
      </PanelSection>

      <PanelSection title="Top bar widget" className="border-b-0">
        <Segmented<StatsMode>
          layoutId="stats-mode"
          value={statsMode}
          onChange={(v) => useUI.setState({ statsMode: v })}
          options={[
            { value: "words", label: "Word count" },
            { value: "full", label: "Full" },
            { value: "off", label: "Off" },
          ]}
        />
      </PanelSection>
    </div>
  );
}
