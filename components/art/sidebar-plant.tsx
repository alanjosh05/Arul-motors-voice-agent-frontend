import { cn } from "@/lib/utils";
import { LEAF, LEAF_BASE } from "./leaves";

// The leafy plants from unDraw's "on the way" (as on the login page), for the
// bottom of the sidebar. Each sways gently from its base; still for "reduce
// motion" users. Decorative only.
const CSS = `
@media (prefers-reduced-motion: no-preference) {
  .sp-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: sp-sway var(--sp-time) ease-in-out var(--sp-delay) infinite alternate; }
}
@keyframes sp-sway { from { transform: rotate(-2.5deg); } to { transform: rotate(2.5deg); } }
`;

const GREENS = ["#22c55e", "#16a34a", "#15803d"];
const VEIN = "#bbf7d0";

/** One plant; `sway` = [seconds per swing, delay] so the plants move out of step. */
function Plant({ x, kind, s, shade, sway }: { x: number; kind: "big" | "small"; s: number; shade: number; sway: [number, number] }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <g className="sp-sway" style={{ "--sp-time": `${sway[0]}s`, "--sp-delay": `${sway[1]}s` } as React.CSSProperties}>
        <g transform={LEAF_BASE[kind]}>
          {LEAF[kind].map(({ d, t, vein }) => (
            <path key={t} d={d} transform={t} fill={vein ? VEIN : GREENS[shade]} />
          ))}
        </g>
      </g>
    </g>
  );
}

export function SidebarPlant({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -176 250 180" aria-hidden focusable="false" className={cn("h-auto w-full", className)}>
      <style>{CSS}</style>
      <Plant x={6} kind="big" s={0.62} shade={1} sway={[3.4, 0]} />
      <Plant x={132} kind="small" s={1.15} shade={0} sway={[2.8, -1.1]} />
      <Plant x={196} kind="small" s={0.8} shade={2} sway={[3.1, -2]} />
    </svg>
  );
}
