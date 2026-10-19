"use client";

// Loaded on demand (next/dynamic) only when a call starts, so the Pipecat
// WebRTC client isn't part of every page's JavaScript.
import type { PipecatClient } from "@pipecat-ai/client-js";
import { PipecatClientAudio, PipecatClientProvider } from "@pipecat-ai/client-react";
import { CallPanel } from "@/components/call/call-panel";

export default function CallSession({
  client,
  ...panel
}: { client: PipecatClient } & React.ComponentProps<typeof CallPanel>) {
  return (
    <PipecatClientProvider client={client}>
      <PipecatClientAudio />
      <CallPanel {...panel} />
    </PipecatClientProvider>
  );
}
