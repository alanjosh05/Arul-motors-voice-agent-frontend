import { cn } from "@/lib/utils";

// Drawn for the CRM (not unDraw): a rider on a bike going along the road past
// trees, the voice agent's call and a booked date. Colours are fixed (it sits
// on the login page's blue panel, which doesn't change with the theme).
//
// Animated as if riding: the wheels spin, the road, trees and speed lines go
// past, the bike and rider bob and the voice bars pulse. Still for "reduce
// motion" users.
const C = {
  tyre: "#111827",
  spoke: "#9ca3af",
  hub: "#e5e7eb",
  body: "#ef4444",
  bodyDark: "#b91c1c",
  seat: "#111827",
  engine: "#9ca3af",
  chrome: "#e5e7eb",
  light: "#fbbf24",
  helmet: "#fbbf24",
  visor: "#1f2937",
  jacket: "#14b8a6",
  jacketDark: "#0f766e",
  pants: "#1e293b",
  boot: "#0f172a",
  road: "#1e293b",
  leaf: ["#22c55e", "#16a34a", "#15803d"],
  trunk: "#92400e",
  check: "#16a34a",
  bars: ["#22c55e", "#f59e0b", "#f43f5e", "#38bdf8", "#a855f7", "#22c55e"],
};

const CSS = `
@media (prefers-reduced-motion: no-preference) {
  .la-wheel { animation: la-spin .5s linear infinite; }
  .la-road { animation: la-road .45s linear infinite; }
  .la-trees { animation: la-trees 5s linear infinite; }
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
@keyframes la-trees { to { transform: translateX(-480px); } }
@keyframes la-speed { from { transform: translateX(16px); opacity: 0; } 30% { opacity: 1; } to { transform: translateX(-34px); opacity: 0; } }
@keyframes la-bob { to { transform: translateY(-3px); } }
@keyframes la-bar { from { transform: scaleY(.45); } to { transform: scaleY(1); } }
@keyframes la-float { to { transform: translateY(-6px); } }
`;

/** Wheel at (cx, cy): black tyre, spinning spokes and hub. */
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
      <circle cx={cx} cy={cy} r={38} fill="none" stroke={C.tyre} strokeWidth={12} />
      <circle cx={cx} cy={cy} r={31} fill="none" stroke={C.spoke} strokeWidth={2} />
      <g className="la-wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={spokes.join("")} stroke={C.spoke} strokeWidth={3} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={9} fill={C.hub} />
    </g>
  );
}

/** A roadside tree (round or pine) standing on the ground at x. */
function Tree({ x, pine, s = 1 }: { x: number; pine?: boolean; s?: number }) {
  return pine ? (
    <g transform={`translate(${x} 252) scale(${s})`}>
      <rect x={-4} y={-22} width={8} height={22} fill={C.trunk} />
      <path d="M0 -112L-30 -46H30Z" fill={C.leaf[2]} />
      <path d="M0 -80L-36 -18H36Z" fill={C.leaf[1]} />
    </g>
  ) : (
    <g transform={`translate(${x} 252) scale(${s})`}>
      <rect x={-4} y={-50} width={8} height={50} fill={C.trunk} />
      <circle cx={0} cy={-74} r={32} fill={C.leaf[1]} />
      <circle cx={-22} cy={-58} r={20} fill={C.leaf[0]} />
      <circle cx={22} cy={-60} r={22} fill={C.leaf[2]} />
    </g>
  );
}

/** One stretch of trees (480 wide); drawn twice so the scroll loops. */
function Trees() {
  return (
    <g opacity={0.95}>
      <Tree x={40} s={0.9} />
      <Tree x={150} pine s={0.85} />
      <Tree x={250} s={0.75} />
      <Tree x={350} pine s={1} />
      <Tree x={440} s={0.85} />
    </g>
  );
}

export function LoginArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 270" aria-hidden focusable="false" className={cn("h-auto w-full", className)}>
      <style>{CSS}</style>

      {/* trees going past, then the road */}
      <g className="la-trees">
        <Trees />
        <g transform="translate(480 0)">
          <Trees />
        </g>
      </g>
      <rect x={0} y={250} width={480} height={20} rx={4} fill={C.road} />
      <path className="la-road" d="M10 261H470" stroke="#f8fafc" strokeWidth={3} strokeDasharray="26 12" strokeLinecap="round" />
      <g className="la-speed" fill="none" stroke="#fff" strokeOpacity={0.55} strokeLinecap="round" strokeWidth={5}>
        <path d="M30 178H70" />
        <path d="M40 200H88" />
        <path d="M54 222H96" />
      </g>
      <ellipse cx={244} cy={252} rx={130} ry={4} fill="#000" opacity={0.25} />

      <g className="la-bike">
        <Wheel cx={150} cy={214} />
        <Wheel cx={338} cy={214} />
        {/* swingarm, fork, handlebar, exhaust */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M150 214L222 196" stroke={C.engine} strokeWidth={9} />
          <path d="M338 214L304 122" stroke={C.chrome} strokeWidth={9} />
          <path d="M302 118L284 104" stroke={C.seat} strokeWidth={7} />
          <path d="M302 180A42 42 0 0 1 368 176" stroke={C.body} strokeWidth={7} />
          <path d="M206 222L118 236" stroke={C.chrome} strokeWidth={8} />
        </g>
        {/* engine, seat, tail, tank */}
        <path d="M200 168H262L274 206L212 214Z" fill={C.engine} />
        <path d="M200 176H258M204 188H264M208 200H268" stroke="#6b7280" strokeWidth={3} />
        <path d="M136 140L224 148L222 164L160 166Z" fill={C.bodyDark} />
        <path d="M150 140L222 146L220 152L156 150Z" fill={C.seat} />
        <path d="M218 150Q246 118 296 128L306 152L226 168Z" fill={C.body} />
        <path d="M232 150Q252 132 290 136" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.85} />

        {/* the rider, leaning into the ride */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* leg: thigh along the tank, shin down to the footpeg, boot */}
          <path d="M196 142L240 156L224 196" fill="none" stroke={C.pants} strokeWidth={15} />
          <path d="M214 196H236Q240 196 238 202H212Z" fill={C.boot} stroke={C.boot} strokeWidth={4} />
          {/* body */}
          <path d="M180 146L206 148L264 100L246 80Z" fill={C.jacket} stroke={C.jacket} strokeWidth={8} />
          <path d="M196 142L250 96" stroke={C.jacketDark} strokeWidth={4} />
          {/* arm to the handlebar, glove */}
          <path d="M250 92L286 106" fill="none" stroke={C.jacket} strokeWidth={11} />
          <circle cx={288} cy={106} r={6} fill={C.boot} />
          {/* helmet and visor */}
          <circle cx={262} cy={70} r={19} fill={C.helmet} />
          <path d="M266 60Q282 62 283 74L268 78Z" fill={C.visor} />
          <path d="M247 66Q256 52 272 54" fill="none" stroke="#fff" strokeWidth={3} opacity={0.7} />
        </g>
        <path d="M294 126Q320 106 330 134L306 152Z" fill={C.light} />
      </g>

      {/* the agent's call */}
      <g className="la-float">
        <path
          d="M332 26H436A16 16 0 0 1 452 42V82A16 16 0 0 1 436 98H372L354 114L358 98H332A16 16 0 0 1 316 82V42A16 16 0 0 1 332 26Z"
          fill="#fff"
        />
        <g className="la-bars" fill="none" strokeLinecap="round" strokeWidth={7}>
          {["M344 56V68", "M360 48V76", "M376 40V84", "M392 50V74", "M408 44V80", "M424 56V68"].map((d, i) => (
            <path key={d} d={d} stroke={C.bars[i]} />
          ))}
        </g>
      </g>

      {/* the booked date */}
      <g className="la-float" style={{ animationDelay: "-1.2s" }}>
        <rect x={40} y={36} width={104} height={96} rx={14} fill="#fff" />
        <path d="M40 50A14 14 0 0 1 54 36H130A14 14 0 0 1 144 50V62H40Z" fill="#f59e0b" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M66 28V44M118 28V44" stroke="#1e293b" strokeWidth={7} />
          <path d="M70 98L86 112L116 80" stroke={C.check} strokeWidth={9} />
        </g>
      </g>

      <g fill="#fff" fillOpacity={0.6}>
        <circle cx={196} cy={22} r={5} />
        <circle cx={262} cy={16} r={3.5} />
        <circle cx={232} cy={34} r={3} />
      </g>
    </svg>
  );
}
