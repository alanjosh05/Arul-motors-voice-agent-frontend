import { cn } from "@/lib/utils";

// Drawn for the CRM (not unDraw): a bike, the voice agent's call and a booked
// date. For the login page's blue panel: white is currentColor, and the marks
// inside the bubble and calendar use the panel's blue.
//
// Animated as if riding: the wheels spin, the road and speed lines slide back,
// the bike bobs and the voice bars pulse. Still for "reduce motion" users.
const BLUE = { stroke: "oklch(0.42 0.19 263)" };
const AMBER = "#fbbf24";

const CSS = `
@media (prefers-reduced-motion: no-preference) {
  .la-wheel { animation: la-spin .5s linear infinite; }
  .la-road { animation: la-road .45s linear infinite; }
  .la-speed path { animation: la-speed .9s ease-in infinite; }
  .la-speed path:nth-child(2) { animation-delay: -.3s; }
  .la-speed path:nth-child(3) { animation-delay: -.6s; }
  .la-bike { animation: la-bob .36s ease-in-out infinite alternate; }
  .la-bars path { transform-box: fill-box; transform-origin: center; animation: la-bar .7s ease-in-out infinite alternate; }
  .la-bars path:nth-child(2n) { animation-delay: -.35s; }
  .la-bars path:nth-child(3n) { animation-delay: -.2s; }
  .la-float { animation: la-float 2.4s ease-in-out infinite alternate; }
}
@keyframes la-spin { to { transform: rotate(360deg); } }
@keyframes la-road { to { stroke-dashoffset: 38; } }
@keyframes la-speed { from { transform: translateX(16px); opacity: 0; } 30% { opacity: 1; } to { transform: translateX(-34px); opacity: 0; } }
@keyframes la-bob { to { transform: translateY(-3px); } }
@keyframes la-bar { from { transform: scaleY(.45); } to { transform: scaleY(1); } }
@keyframes la-float { to { transform: translateY(-6px); } }
`;

/** Wheel at (cx, cy): tyre, spokes (they show the spin) and hub. */
function Wheel({ cx, cy }: { cx: number; cy: number }) {
  const r = 30;
  const spokes = [0, 45, 90, 135].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = Math.round(Math.cos(a) * r * 100) / 100;
    const dy = Math.round(Math.sin(a) * r * 100) / 100;
    return `M${cx - dx} ${cy - dy}L${cx + dx} ${cy + dy}`;
  });
  return (
    <g>
      <circle cx={cx} cy={cy} r={38} fill="none" stroke="currentColor" strokeWidth={11} />
      <g className="la-wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={spokes.join("")} stroke="currentColor" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={9} fill="currentColor" />
    </g>
  );
}

export function LoginArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 270" aria-hidden focusable="false" className={cn("h-auto w-full", className)}>
      <style>{CSS}</style>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* the road, sliding back */}
        <path className="la-road" d="M20 258H460" strokeOpacity={0.35} strokeWidth={3} strokeDasharray="26 12" />
        <g className="la-speed" strokeOpacity={0.4} strokeWidth={5}>
          <path d="M30 178H70" />
          <path d="M40 200H88" />
          <path d="M54 222H96" />
        </g>
      </g>

      <g className="la-bike">
        <Wheel cx={150} cy={214} />
        <Wheel cx={338} cy={214} />
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* swingarm, fork, handlebar, mudguard, exhaust */}
          <path d="M150 214L222 196" strokeWidth={9} />
          <path d="M338 214L304 122" strokeWidth={9} />
          <path d="M302 118L284 104" strokeWidth={7} />
          <path d="M302 180A42 42 0 0 1 368 176" strokeWidth={7} strokeOpacity={0.8} />
          <path d="M206 222L118 236" strokeWidth={8} strokeOpacity={0.55} />
        </g>
        <g fill="currentColor">
          <path d="M200 168H262L274 206L212 214Z" fillOpacity={0.4} />
          <path d="M136 140L224 148L222 164L160 166Z" fillOpacity={0.75} />
          <path d="M218 150Q246 118 296 128L306 152L226 168Z" />
        </g>
        <path d="M294 126Q320 106 330 134L306 152Z" fill={AMBER} />
      </g>

      {/* the agent's call */}
      <g className="la-float">
        <path
          d="M332 26H436A16 16 0 0 1 452 42V82A16 16 0 0 1 436 98H372L354 114L358 98H332A16 16 0 0 1 316 82V42A16 16 0 0 1 332 26Z"
          fill="currentColor"
        />
        <g className="la-bars" fill="none" strokeLinecap="round" strokeWidth={7} style={BLUE}>
          <path d="M344 56V68" />
          <path d="M360 48V76" />
          <path d="M376 40V84" />
          <path d="M392 50V74" />
          <path d="M408 44V80" />
          <path d="M424 56V68" />
        </g>
      </g>

      {/* the booked date */}
      <g className="la-float" style={{ animationDelay: "-1.2s" }}>
        <rect x={40} y={36} width={104} height={96} rx={14} fill="currentColor" />
        <path d="M40 50A14 14 0 0 1 54 36H130A14 14 0 0 1 144 50V62H40Z" fill={AMBER} />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" style={BLUE}>
          <path d="M66 28V44M118 28V44" strokeWidth={7} />
          <path d="M70 98L86 112L116 80" strokeWidth={9} />
        </g>
      </g>

      <g fill="currentColor" fillOpacity={0.6}>
        <circle cx={196} cy={62} r={5} />
        <circle cx={262} cy={40} r={3.5} />
        <circle cx={232} cy={86} r={3} />
      </g>
    </svg>
  );
}
