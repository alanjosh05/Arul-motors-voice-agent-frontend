import { cn } from "@/lib/utils";

/** A decorative illustration (an SVG string from this repo, never user data). */
export function Art({ svg, className }: { svg: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-28 w-auto shrink-0 [&>svg]:h-full [&>svg]:w-auto", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
