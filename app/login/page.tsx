"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoginArt } from "@/components/art/login";
import { AnimateIn } from "@/components/motion/animate-in";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/layout/app-sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import { reduceMotion } from "@/lib/motion";

/** How long the bike takes to ride off after signing in (components/art/login.tsx). */
const RIDE_OFF_MS = 1100;


// Client-only: whether the CRM is open depends on the time it's opened, not built.
const ShiftNotice = dynamic(() => import("@/components/shift-gate").then((m) => m.ShiftNotice), { ssr: false });

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Signing in: the bike rides off to the right, then the CRM opens.
  const [leaving, setLeaving] = useState(false);
  const signingIn = useRef(false);

  useEffect(() => {
    // Already signed in when the page opened (not the sign-in below).
    if (ready && user && !signingIn.current) router.replace("/dashboard/");
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    signingIn.current = true;
    try {
      await login(username.trim(), password);
      // The bike is only on screen with the blue panel (wide screens).
      const ride = !reduceMotion() && window.matchMedia("(min-width: 1024px)").matches;
      setLeaving(true);
      setTimeout(() => router.replace("/dashboard/"), ride ? RIDE_OFF_MS : 0);
    } catch (err) {
      signingIn.current = false;
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <AnimateIn preset="login" className="grid min-h-svh lg:h-svh lg:grid-cols-[1.05fr_1fr] lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.42_0.19_263)] p-10 text-white lg:flex lg:flex-col lg:gap-6 [@media(max-height:720px)]:p-7 [@media(max-height:720px)]:gap-4">
        <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 size-[460px] rounded-full bg-black/20 blur-3xl" />
        {/* The full logo already reads ARUL MOTORS · NAZARETH · YAMAHA. */}
        <BrandMark full className="relative h-16 w-auto shrink-0 self-start drop-shadow-md [@media(max-height:720px)]:h-12" />
        {/* Takes the height left over (none on very short screens), so the panel
            always fits the screen. */}
        <div data-anim="art" className="relative flex min-h-0 flex-1 items-center justify-center">
          <LoginArt leaving={leaving} className="h-full max-h-80 w-auto max-w-lg drop-shadow-sm" />
        </div>

        <div className="relative max-w-md shrink-0 space-y-8 [@media(max-height:720px)]:space-y-5">
          <div className="space-y-3">
            <h1 data-split className="text-4xl [@media(max-height:720px)]:text-3xl leading-[1.1] font-semibold tracking-tight text-balance">
              Every service reminder, handled.
            </h1>
            <p data-anim="sub" className="text-white/75 text-pretty">
              The showroom CRM with a voice agent that follows up with every customer, books their service date and logs the outcome.
            </p>
          </div>
        </div>
        
      </aside>

      <main className="relative flex flex-col items-center justify-center p-6 sm:p-10 lg:overflow-y-auto">
        {/* Without the blue panel (phones, tablets): the screen's top-left is here. */}
        <BrandMark full className="mb-6 h-14 w-auto self-start drop-shadow-sm sm:absolute sm:top-6 sm:left-6 sm:mb-0 lg:hidden" />
        <div className="w-full max-w-sm space-y-8">
          
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Welcome back. Use your showroom staff account.</p>
            <ShiftNotice />
          </div>
          <form onSubmit={submit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input id="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className="h-10" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup className="h-10">
                  <InputGroupInput id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                      {show ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
            <Button type="submit" className="h-10 w-full" disabled={pending || !username || !password}>
              {pending && <Spinner />} Sign in
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">Accounts are created by your admin in Settings → Team.</p>
        </div>
      </main>
    </AnimateIn>
  );
}
