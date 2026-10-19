"use client";

import type { PipecatClient } from "@pipecat-ai/client-js";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { toast } from "sonner";
import { API_URL, authHeaders, errorMessage } from "@/lib/api";
import { fetchVoiceConfig, useRefreshAll } from "@/lib/queries";

export interface CallTarget {
  id: number;
  name: string;
  mobile_number?: string;
  subtitle?: string; // e.g. "Yamaha FZ-S Fi · First free service due"
}

export type CallPhase = "connecting" | "live" | "ended" | "failed";

interface CallContextValue {
  target: CallTarget | null;
  startCall: (target: CallTarget) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// The WebRTC client (~0.5 MB) loads only when a call is about to start.
const loadPipecat = () =>
  Promise.all([import("@pipecat-ai/client-js"), import("@pipecat-ai/small-webrtc-transport")]);
const CallSession = dynamic(() => import("@/components/call/call-session"), { ssr: false });
const CallPanel = dynamic(() => import("@/components/call/call-panel").then((m) => m.CallPanel), { ssr: false });

/** Start downloading the call code early (e.g. on hover over "Call with agent"). */
export function preloadCallCode() {
  void loadPipecat();
  void import("@/components/call/call-session");
}

/** Starts browser calls with the AI voice agent for a customer.
 *
 * The browser's WebRTC offer goes to the CRM API (/api/voice/offer), which
 * checks the staff login and the customer, then relays it to the bot on the
 * server. The audio itself then flows directly between browser and bot (UDP).
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<CallTarget | null>(null);
  const [client, setClient] = useState<PipecatClient | null>(null);
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const clientRef = useRef<PipecatClient | null>(null);
  const refresh = useRefreshAll();

  const finish = useCallback(
    (next: CallPhase, message?: string) => {
      setPhase(next);
      setEndedAt(Date.now());
      if (message) setError(message);
      // The agent logs the outcome (and any booking) as the call ends.
      setTimeout(() => refresh(), 1500);
    },
    [refresh],
  );

  const startCall = useCallback(
    async (next: CallTarget) => {
      if (clientRef.current) {
        toast.info("Finish the current call first.");
        return;
      }
      setTarget(next);
      setPhase("connecting");
      setError(null);
      setStartedAt(null);
      setEndedAt(null);
      try {
        const [config, [{ PipecatClient }, { SmallWebRTCTransport }]] = await Promise.all([
          fetchVoiceConfig(),
          loadPipecat(),
        ]);
        let connected = false;
        const pc = new PipecatClient({
          transport: new SmallWebRTCTransport({ iceServers: config.ice_servers }),
          enableMic: true,
          enableCam: false,
          callbacks: {
            onBotReady: () => {
              connected = true;
              setPhase("live");
              setStartedAt(Date.now());
            },
            onDisconnected: () => {
              clientRef.current = null;
              finish(connected ? "ended" : "failed", connected ? undefined : "The call couldn't be connected.");
            },
          },
        });
        clientRef.current = pc;
        setClient(pc);
        await pc.connect({
          webrtcRequestParams: {
            endpoint: API_URL + config.offer_path,
            headers: new Headers(authHeaders()),
            requestData: { customer_id: next.id },
          },
        });
      } catch (e) {
        clientRef.current?.disconnect();
        clientRef.current = null;
        const message = errorMessage(e);
        finish(
          "failed",
          /permission|NotAllowed/i.test(message)
            ? "Microphone access was blocked. Allow the microphone for this site and try again."
            : message,
        );
      }
    },
    [finish],
  );

  const hangUp = useCallback(() => {
    const pc = clientRef.current;
    clientRef.current = null;
    if (pc) {
      try {
        pc.disconnect();
      } catch {
        /* already closed */
      }
    }
    finish("ended");
  }, [finish]);

  const close = useCallback(() => {
    if (clientRef.current) return;
    setTarget(null);
    setClient(null);
  }, []);

  return (
    <CallContext.Provider value={{ target, startCall }}>
      {children}
      {target && client && (
        <CallSession
          client={client}
          target={target}
          phase={phase}
          error={error}
          startedAt={startedAt}
          endedAt={endedAt}
          onHangUp={hangUp}
          onClose={close}
        />
      )}
      {target && !client && phase === "failed" && (
        <CallPanel target={target} phase={phase} error={error} startedAt={null} endedAt={null} onHangUp={hangUp} onClose={() => setTarget(null)} offline />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
}
