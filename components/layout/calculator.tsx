"use client";

import { Calculator as CalculatorIcon, Copy, Delete } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A quick calculator for the counter (bills, discounts, GST). Expressions are
// parsed here (no eval): numbers, + − × ÷, brackets and % ("2000 + 18%" adds
// 18% of 2000, "18% × 2000" is 360).

type Token = number | "+" | "-" | "*" | "/" | "%" | "(" | ")";

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const src = text.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, "");
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (ch === " ") i++;
    else if (/[\d.]/.test(ch)) {
      const match = /^\d*\.?\d*/.exec(src.slice(i))![0];
      if (match === ".") throw new Error("number");
      tokens.push(Number(match));
      i += match.length;
    } else if ("+-*/%()".includes(ch)) {
      tokens.push(ch as Token);
      i++;
    } else throw new Error("character");
  }
  return tokens;
}

/** Evaluate an expression; throws on anything malformed. */
export function evaluate(text: string): number {
  const tokens = tokenize(text);
  let pos = 0;
  const peek = () => tokens[pos];

  // factor: number [%] | ( expr ) | -factor
  const factor = (): number => {
    const t = tokens[pos++];
    let value: number;
    if (t === "-") return -factor();
    if (t === "+") return factor();
    if (t === "(") {
      value = expr();
      if (tokens[pos++] !== ")") throw new Error("bracket");
    } else if (typeof t === "number") value = t;
    else throw new Error("syntax");
    return value;
  };
  const term = (): number => {
    let value = factor();
    for (;;) {
      const op = peek();
      if (op === "%") {
        pos++;
        value /= 100;
      } else if (op === "*" || op === "/") {
        pos++;
        const right = factor();
        value = op === "*" ? value * right : value / right;
      } else return value;
    }
  };
  const expr = (): number => {
    let value = term();
    for (;;) {
      const op = peek();
      if (op !== "+" && op !== "-") return value;
      pos++;
      const start = pos;
      let right = term();
      // "a + b%" means a plus b% of a (as on a shop calculator).
      if (tokens[pos - 1] === "%" && pos - start === 2) right *= value;
      value = op === "+" ? value + right : value - right;
    }
  };

  const value = expr();
  if (pos !== tokens.length || !Number.isFinite(value)) throw new Error("syntax");
  return Math.round(value * 1e8) / 1e8;
}

const indian = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 8 });

const KEYS = [
  ["C", "(", ")", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["%", "0", ".", "="],
] as const;

const OPERATORS = new Set(["÷", "×", "−", "+", "%", "(", ")"]);

export function Calculator() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [last, setLast] = useState<{ expr: string; result: number } | null>(null);

  let preview: number | null = null;
  try {
    preview = input && /[+\-−×÷*/%(]/.test(input.replace(/^-/, "")) ? evaluate(input) : null;
  } catch {
    preview = null;
  }

  const press = (key: string) => {
    if (key === "C") {
      setInput("");
      setLast(null);
    } else if (key === "⌫") setInput((v) => v.slice(0, -1));
    else if (key === "=") {
      try {
        const result = evaluate(input);
        setLast({ expr: input, result });
        setInput(String(result));
      } catch {
        toast.error("Check the sum");
      }
    } else setInput((v) => (v.length < 60 ? v + key : v));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, string> = {
      "*": "×", x: "×", "/": "÷", "-": "−", "+": "+", Enter: "=", "=": "=", Backspace: "⌫",
      Escape: "", Delete: "C", c: "C", "%": "%", "(": "(", ")": ")", ".": ".",
    };
    const key = /^\d$/.test(e.key) ? e.key : map[e.key];
    if (e.key === "Escape") return; // closes the popover
    if (key) {
      e.preventDefault();
      press(key);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Calculator">
          <CalculatorIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 outline-none" onKeyDown={onKeyDown}>
        <div className="space-y-0.5 rounded-lg bg-muted/60 px-3 py-2 text-right">
          <p className="tabular h-4 truncate text-xs text-muted-foreground">
            {last && input === String(last.result) ? `${last.expr} =` : preview != null ? `= ${indian.format(preview)}` : ""}
          </p>
          <p className="tabular truncate text-2xl font-semibold" aria-live="polite">
            {input ? input.replace(/\d+(\.\d+)?/g, (n) => (n.includes(".") ? n : indian.format(Number(n)))) : "0"}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {KEYS.flat().map((key) => (
            <Button
              key={key}
              type="button"
              variant={key === "=" ? "default" : OPERATORS.has(key) || key === "C" ? "secondary" : "outline"}
              className={cn("h-10 text-base", key === "C" && "text-destructive")}
              onClick={() => press(key)}
            >
              {key}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => press("⌫")} aria-label="Delete last">
            <Delete /> Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!input}
            onClick={() => {
              const value = String(preview ?? input);
              navigator.clipboard?.writeText(value).then(() => toast.success(`Copied ${value}`)).catch(() => {});
            }}
          >
            <Copy /> Copy
          </Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">Keyboard works too · 2000 + 18% adds GST</p>
      </PopoverContent>
    </Popover>
  );
}
