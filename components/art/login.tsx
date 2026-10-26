import { cn } from "@/lib/utils";

// Drawn for the CRM (plants from unDraw, below): a rider on a bike going along the road past
// plants, the voice agent's call and a booked date. Colours are fixed (it sits
// on the login page's blue panel, which doesn't change with the theme).
//
// Animated as if riding: the wheels spin, the road, plants and speed lines go
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

// The leafy plants from unDraw's "on the way" (undraw.co: free licence, no
// credit needed), coloured green. Paths as drawn there, moved so each plant
// stands on the ground at (0, 0).
const LEAF = {
  big: [
    { d: "M423.769,561.333c-2.75,21.549-12.864,41.264-23.653,60.256-.357.647-.724,1.284-1.1,1.93H286.881c-2.268-.589-4.507-1.235-6.736-1.93a122.584,122.584,0,0,1-35.406-17.419c-41.255-29.723-57.129-85.887-49.959-136.212,4.458-31.267,18.181-63.189,44.9-80.029,14.109-8.907,32.232-11.8,48.473-8.492.425.077.85.174,1.284.26,13.973,3.146,26.422,10.963,33.506,23.556,12.738,22.63,5.153,50.663-1.11,75.85-6.244,25.187-9.631,55.334,8.492,73.911-5.983-17.612-.077-38.62,14.215-50.528,10.8-8.984,25.833-12.352,39.546-9.563,1.312.28,2.606.6,3.879.984a43.04,43.04,0,0,1,8.849,3.706C418.191,509.55,426.847,537.043,423.769,561.333Z", t: "translate(360.234 86.601)", vein: false },
    { d: "M359.542,621.635c3.107.724,6.224,1.361,9.36,1.93H351.947c-2.22-.6-4.43-1.235-6.62-1.93q-7.223-2.258-14.225-5.182c-18.721-7.855-35.966-19.648-49.013-35.339a99.756,99.756,0,0,1-15.46-25.255,114.7,114.7,0,0,1-7.913-32.318c-2.365-22.774.048-46.176,4.555-68.545a286.081,286.081,0,0,1,22.35-67.04q1.838-3.836,3.8-7.624a1.488,1.488,0,0,1,.994-.849,1.715,1.715,0,0,1,1.284.26,2.033,2.033,0,0,1,.8,2.683,282.789,282.789,0,0,0-23.72,64.617c-5.134,21.877-8.048,44.767-7.054,67.262.946,21.018,6.437,41.689,18.9,58.876C292,588.873,307.71,601.244,325.09,609.669a163.212,163.212,0,0,0,34.451,11.966Z", t: "translate(357.971 86.554)", vein: true },
    { d: "M400.674,627.68h-5c-.56-.637-1.1-1.284-1.631-1.93a106.548,106.548,0,0,1-22.427-47.923,103.965,103.965,0,0,1,8.965-64.7,106.381,106.381,0,0,1,9.689-16.039c1.312.28,2.606.6,3.879.984a100.568,100.568,0,0,0,4.8,127.681C399.506,626.4,400.086,627.043,400.674,627.68Z", t: "translate(354.049 82.439)", vein: true },
  ],
  small: [
    { d: "M868.424,613.655c.726,5.687,3.4,10.89,6.242,15.9.094.171.191.339.29.509h29.595c.6-.155,1.189-.326,1.778-.509a32.348,32.348,0,0,0,9.345-4.6c10.888-7.844,15.077-22.667,13.185-35.949-1.177-8.252-4.8-16.677-11.85-21.121a17.792,17.792,0,0,0-12.793-2.241c-.112.02-.224.046-.339.069a13.2,13.2,0,0,0-8.843,6.217c-3.362,5.972-1.36,13.371.293,20.018s2.542,14.6-2.241,19.506A12.2,12.2,0,0,0,878.9,595.6c-.346.074-.688.158-1.024.26a11.355,11.355,0,0,0-2.336.978C869.9,599.988,867.611,607.244,868.424,613.655Z", t: "translate(336.616 80.053)", vein: false },
    { d: "M886.524,629.57q-1.23.286-2.47.509h4.475c.586-.158,1.169-.326,1.747-.509q1.906-.6,3.754-1.368a33.677,33.677,0,0,0,12.936-9.327,26.326,26.326,0,0,0,4.08-6.665,30.27,30.27,0,0,0,2.088-8.529,60.663,60.663,0,0,0-1.2-18.09,75.5,75.5,0,0,0-5.9-17.693q-.485-1.012-1-2.012a.392.392,0,0,0-.262-.224.452.452,0,0,0-.339.069.536.536,0,0,0-.211.708,74.633,74.633,0,0,1,6.26,17.054,65.643,65.643,0,0,1,1.862,17.752,28.324,28.324,0,0,1-4.987,15.538,31.348,31.348,0,0,1-11.736,9.63,43.069,43.069,0,0,1-9.092,3.158Z", t: "translate(336.063 80.04)", vein: true },
    { d: "M876.437,631.165h1.319c.148-.168.29-.339.43-.509a28.121,28.121,0,0,0,5.919-12.648,27.439,27.439,0,0,0-2.366-17.077,28.076,28.076,0,0,0-2.557-4.233c-.346.074-.688.158-1.024.26a26.542,26.542,0,0,1-1.266,33.7C876.745,630.826,876.592,631,876.437,631.165Z", t: "translate(336.33 78.954)", vein: true },
  ],
};
// Where each plant's base is in that drawing (to stand it at 0, 0).
const LEAF_BASE = { big: "translate(-555 -709.5)", small: "translate(-1205 -709.5)" };

/** A leafy plant standing on the ground at x. */
function Leaf({ x, kind, s = 1, shade = 0 }: { x: number; kind: "big" | "small"; s?: number; shade?: number }) {
  return (
    <g transform={`translate(${x} 252) scale(${s})`}>
      <g transform={LEAF_BASE[kind]}>
        {LEAF[kind].map(({ d, t, vein }) => (
          <path key={t} d={d} transform={t} fill={vein ? "#bbf7d0" : C.leaf[shade]} />
        ))}
      </g>
    </g>
  );
}

/** One stretch of plants (480 wide); drawn twice so the scroll loops. */
function Plants() {
  return (
    <g>
      <Leaf x={8} kind="big" s={0.46} />
      <Leaf x={140} kind="small" s={0.85} shade={1} />
      <Leaf x={215} kind="big" s={0.36} shade={2} />
      <Leaf x={330} kind="small" s={1.05} />
      <Leaf x={385} kind="big" s={0.42} shade={1} />
    </g>
  );
}

export function LoginArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 270" aria-hidden focusable="false" className={cn("h-auto w-full", className)}>
      <style>{CSS}</style>

      {/* plants going past, then the road */}
      <g className="la-trees">
        <Plants />
        <g transform="translate(480 0)">
          <Plants />
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
