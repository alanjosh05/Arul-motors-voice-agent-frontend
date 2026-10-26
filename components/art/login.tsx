import { cn } from "@/lib/utils";

// Drawn for the CRM (not unDraw): a bike, the voice agent's call and a booked
// date. For the login page's blue panel: white is currentColor, and the marks
// inside the bubble and calendar use the panel's blue.
const BLUE = { stroke: "oklch(0.42 0.19 263)" };
const AMBER = "#fbbf24";

export function LoginArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 270" aria-hidden focusable="false" className={cn("h-auto w-full", className)}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* ground and motion lines */}
        <path d="M40 258H440" strokeOpacity={0.3} strokeWidth={3} />
        <path d="M40 200H88M54 222H96M30 178H70" strokeOpacity={0.35} strokeWidth={5} />
        {/* wheels, swingarm, fork, handlebar, mudguard, exhaust */}
        <circle cx={150} cy={214} r={38} strokeWidth={11} />
        <circle cx={338} cy={214} r={38} strokeWidth={11} />
        <path d="M150 214L222 196" strokeWidth={9} />
        <path d="M338 214L304 122" strokeWidth={9} />
        <path d="M302 118L284 104" strokeWidth={7} />
        <path d="M302 180A42 42 0 0 1 368 176" strokeWidth={7} strokeOpacity={0.8} />
        <path d="M206 222L118 236" strokeWidth={8} strokeOpacity={0.55} />
      </g>
      <g fill="currentColor">
        <circle cx={150} cy={214} r={9} />
        <circle cx={338} cy={214} r={9} />
        <path d="M200 168H262L274 206L212 214Z" fillOpacity={0.4} />
        <path d="M136 140L224 148L222 164L160 166Z" fillOpacity={0.75} />
        <path d="M218 150Q246 118 296 128L306 152L226 168Z" />
        {/* speech bubble and calendar */}
        <path d="M332 26H436A16 16 0 0 1 452 42V82A16 16 0 0 1 436 98H372L354 114L358 98H332A16 16 0 0 1 316 82V42A16 16 0 0 1 332 26Z" />
        <rect x={40} y={36} width={104} height={96} rx={14} />
        <g fillOpacity={0.6}>
          <circle cx={196} cy={62} r={5} />
          <circle cx={262} cy={40} r={3.5} />
          <circle cx={232} cy={86} r={3} />
        </g>
      </g>
      <path d="M294 126Q320 106 330 134L306 152Z" fill={AMBER} />
      <path d="M40 50A14 14 0 0 1 54 36H130A14 14 0 0 1 144 50V62H40Z" fill={AMBER} />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" style={BLUE}>
        {/* voice bars, calendar rings and the tick */}
        <path d="M344 56V68M360 48V76M376 40V84M392 50V74M408 44V80M424 56V68" strokeWidth={7} />
        <path d="M66 28V44M118 28V44" strokeWidth={7} />
        <path d="M70 98L86 112L116 80" strokeWidth={9} />
      </g>
    </svg>
  );
}
