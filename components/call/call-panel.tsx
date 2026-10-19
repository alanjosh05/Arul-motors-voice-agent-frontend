"use client";

import {
  usePipecatClientMicControl,
  usePipecatConversation,
  VoiceVisualizer,
} from "@pipecat-ai/client-react";
import { Bot, ExternalLink, Mic, MicOff, PhoneOff, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CallPhase, CallTarget } from "@/components/call/call-provider";
import { CustomerAvatar } from "@/components/customer-avatar";
import { ToneBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMobile } from "@/lib/format";
import { cn } from "@/lib/utils";

function useElapsed(startedAt: number | null, endedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt || endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, endedAt]);
  if (!startedAt) return "00:00";
  const secs = Math.max(0, Math.floor(((endedAt ?? now) - startedAt) / 1000));
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

function messageText(text: unknown): string {
  if (typeof text === "string") return text;
  if (text && typeof text === "object" && "spoken" in text) {
    const t = text as { spoken: string; unspoken: string };
    return t.spoken + t.unspoken;
  }
  return "";
}

/** Live audio meters + transcript; needs the Pipecat client context. */
function LiveCall({ live }: { live: boolean }) {
  const { messages } = usePipecatConversation();
  const bottom = useRef<HTMLDivElement>(null);
  const lines = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: m.parts.map((p) => messageText(p.text)).join(" ").trim(), at: m.createdAt }))
    .filter((m) => m.text);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["Agent", "bot", Bot],
            ["You", "local", User],
          ] as const
        ).map(([label, participant, Icon]) => (
          <div key={label} className="rounded-lg border bg-muted/40 px-3 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Icon className="size-3" /> {label}
            </div>
            <div className={cn("flex h-9 items-center justify-center text-primary", !live && "opacity-40")}>
              <VoiceVisualizer
                participantType={participant}
                barCount={14}
                barGap={3}
                barWidth={4}
                barMaxHeight={30}
                barColor="currentColor"
                barOrigin="center"
              />
            </div>
          </div>
        ))}
      </div>
      {lines.length > 0 && (
        <ScrollArea className="h-40 rounded-lg border bg-background">
          <div className="space-y-2 p-3 text-sm">
            {lines.map((line, i) => (
              <div key={i} className={cn("flex", line.role === "user" && "justify-end")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-1.5 leading-snug",
                    line.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                  )}
                >
                  {line.text}
                </p>
              </div>
            ))}
            <div ref={bottom} />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function MuteButton() {
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-lg" onClick={() => enableMic(!isMicEnabled)} aria-label={isMicEnabled ? "Mute" : "Unmute"}>
          {isMicEnabled ? <Mic /> : <MicOff className="text-destructive" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isMicEnabled ? "Mute microphone" : "Unmute microphone"}</TooltipContent>
    </Tooltip>
  );
}

export function CallPanel({
  target,
  phase,
  error,
  startedAt,
  endedAt,
  onHangUp,
  onClose,
  offline,
}: {
  target: CallTarget;
  phase: CallPhase;
  error: string | null;
  startedAt: number | null;
  endedAt: number | null;
  onHangUp: () => void;
  onClose: () => void;
  offline?: boolean;
}) {
  const elapsed = useElapsed(startedAt, endedAt);
  const active = phase === "connecting" || phase === "live";
  const status = {
    connecting: <ToneBadge tone="amber">Connecting</ToneBadge>,
    live: <ToneBadge tone="green" className="[&>span]:animate-pulse">Live</ToneBadge>,
    ended: <ToneBadge tone="gray">Ended</ToneBadge>,
    failed: <ToneBadge tone="red">Failed</ToneBadge>,
  }[phase];

  return (
    <Card className="fixed right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-sm gap-0 overflow-hidden p-0 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <CustomerAvatar name={target.name} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{target.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {target.subtitle ?? formatMobile(target.mobile_number)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {status}
          <span className="tabular font-mono text-xs text-muted-foreground">{elapsed}</span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {phase === "connecting" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Connecting to the voice agent… allow the microphone if asked.
          </div>
        )}
        {phase === "ended" && (
          <p className="text-sm text-muted-foreground">
            Call ended. The agent’s outcome and any booking now show in the CRM.
          </p>
        )}
        {phase === "failed" && <p className="text-sm text-destructive">{error ?? "The call failed."}</p>}
        {!offline && phase !== "failed" && <LiveCall live={phase === "live"} />}
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-3">
        {active ? (
          <>
            {!offline && <MuteButton />}
            <Button variant="destructive" className="h-9 flex-1" onClick={onHangUp}>
              <PhoneOff /> End call
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" className="h-9 flex-1" asChild>
              <Link href={`/customers/view/?id=${target.id}`} onClick={onClose}>
                <ExternalLink /> View customer
              </Link>
            </Button>
            <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
