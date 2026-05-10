"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  type CategoryId,
  convert,
  formatNumber,
} from "@/lib/conversions";

type Side = "from" | "to";

const STORAGE_KEY = "unit-converter:state:v1";
const COPY_FEEDBACK_MS = 1200;

type PersistedState = {
  category: CategoryId;
  fromUnit: string;
  toUnit: string;
  rawInput: string;
};

const DEFAULT_STATE: PersistedState = {
  category: "length",
  fromUnit: "m",
  toUnit: "ft",
  rawInput: "1",
};

function loadInitialState(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const cat = CATEGORIES.find((c) => c.id === parsed.category);
    if (!cat) return DEFAULT_STATE;
    const hasFrom = cat.units.some((u) => u.id === parsed.fromUnit);
    const hasTo = cat.units.some((u) => u.id === parsed.toUnit);
    return {
      category: cat.id,
      fromUnit: hasFrom ? parsed.fromUnit! : cat.units[0].id,
      toUnit: hasTo ? parsed.toUnit! : cat.units[1]?.id ?? cat.units[0].id,
      rawInput: typeof parsed.rawInput === "string" ? parsed.rawInput : "1",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function Converter() {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [activeSide, setActiveSide] = useState<Side>("from");
  const [copied, setCopied] = useState<Side | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadInitialState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* localStorage unavailable */
    }
  }, [hydrated, state]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === state.category)!,
    [state.category],
  );

  const parsed = parseNumberInput(state.rawInput);

  const conversion = useMemo(() => {
    if (parsed.kind === "empty") return { kind: "empty" as const };
    if (parsed.kind === "invalid")
      return { kind: "error" as const, error: "Please enter a valid number." };
    const [from, to] =
      activeSide === "from"
        ? [state.fromUnit, state.toUnit]
        : [state.toUnit, state.fromUnit];
    const result = convert(state.category, parsed.value, from, to);
    if (!result.ok) return { kind: "error" as const, error: result.error };
    return { kind: "ok" as const, value: result.value };
  }, [parsed, state.category, state.fromUnit, state.toUnit, activeSide]);

  const fromValue =
    activeSide === "from"
      ? state.rawInput
      : conversion.kind === "ok"
        ? formatNumber(conversion.value)
        : "";
  const toValue =
    activeSide === "to"
      ? state.rawInput
      : conversion.kind === "ok"
        ? formatNumber(conversion.value)
        : "";

  const errorMessage = conversion.kind === "error" ? conversion.error : null;

  function handleCategoryChange(next: CategoryId) {
    if (next === state.category) return;
    const nextCat = CATEGORIES.find((c) => c.id === next)!;
    setState({
      category: next,
      fromUnit: nextCat.units[0].id,
      toUnit: nextCat.units[1]?.id ?? nextCat.units[0].id,
      rawInput: next === "temperature" ? "0" : "1",
    });
    setActiveSide("from");
  }

  function handleInputChange(side: Side, value: string) {
    setActiveSide(side);
    setState((s) => ({ ...s, rawInput: value }));
  }

  function handleUnitChange(side: Side, unitId: string) {
    setState((s) => {
      if (side === "from") {
        return s.fromUnit === unitId ? s : { ...s, fromUnit: unitId };
      }
      return s.toUnit === unitId ? s : { ...s, toUnit: unitId };
    });
  }

  function handleSwap() {
    setState((s) => ({ ...s, fromUnit: s.toUnit, toUnit: s.fromUnit }));
    setActiveSide((side) => (side === "from" ? "to" : "from"));
  }

  async function handleCopy(side: Side) {
    const text = side === "from" ? fromValue : toValue;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(side);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard API blocked or unavailable */
    }
  }

  return (
    <div className="w-full rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_30px_-12px_rgba(0,0,0,0.6)] sm:p-8">
      <CategoryTabs value={state.category} onChange={handleCategoryChange} />

      <div className="relative mt-6 flex flex-col gap-3">
        <UnitField
          label="From"
          value={fromValue}
          unitId={state.fromUnit}
          units={category.units}
          isActive={activeSide === "from"}
          hasError={Boolean(errorMessage) && activeSide === "from"}
          onValueChange={(v) => handleInputChange("from", v)}
          onUnitChange={(u) => handleUnitChange("from", u)}
          onCopy={() => handleCopy("from")}
          copied={copied === "from"}
        />

        <div className="relative flex items-center justify-center" aria-hidden="true">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-200 dark:bg-zinc-800" />
          <SwapButton onClick={handleSwap} />
        </div>

        <UnitField
          label="To"
          value={toValue}
          unitId={state.toUnit}
          units={category.units}
          isActive={activeSide === "to"}
          hasError={Boolean(errorMessage) && activeSide === "to"}
          onValueChange={(v) => handleInputChange("to", v)}
          onUnitChange={(u) => handleUnitChange("to", u)}
          onCopy={() => handleCopy("to")}
          copied={copied === "to"}
        />
      </div>

      <div className="mt-5 min-h-6 text-sm" aria-live="polite" role="status">
        {errorMessage ? (
          <span className="font-medium text-red-600 dark:text-red-400">
            {errorMessage}
          </span>
        ) : conversion.kind === "ok" && parsed.kind === "ok" ? (
          <SummaryLine
            categoryId={state.category}
            value={parsed.value}
            fromUnit={activeSide === "from" ? state.fromUnit : state.toUnit}
            toUnit={activeSide === "from" ? state.toUnit : state.fromUnit}
            result={conversion.value}
          />
        ) : null}
      </div>
    </div>
  );
}

function CategoryTabs({
  value,
  onChange,
}: {
  value: CategoryId;
  onChange: (next: CategoryId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Conversion category"
      className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/60"
    >
      {CATEGORIES.map((c) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.id)}
            className={
              "rounded-xl px-4 py-2.5 text-sm font-medium transition-all " +
              (active
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-700 dark:text-zinc-50 dark:ring-zinc-600/50"
                : "text-zinc-600 hover:bg-white/40 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700/40 dark:hover:text-zinc-100")
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function UnitField({
  label,
  value,
  unitId,
  units,
  isActive,
  hasError,
  onValueChange,
  onUnitChange,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  unitId: string;
  units: { id: string; label: string; symbol: string }[];
  isActive: boolean;
  hasError: boolean;
  onValueChange: (v: string) => void;
  onUnitChange: (u: string) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const inputId = useId();
  const selectId = useId();

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  return (
    <div
      className={
        "group relative rounded-2xl border bg-white px-4 py-3 transition-colors focus-within:border-zinc-400 dark:bg-zinc-900/80 dark:focus-within:border-zinc-500 " +
        (hasError
          ? "border-red-400/80 dark:border-red-500/60"
          : isActive
            ? "border-zinc-300 dark:border-zinc-700"
            : "border-zinc-200 dark:border-zinc-800")
      }
    >
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          {label}
        </label>
        <button
          type="button"
          onClick={onCopy}
          disabled={!value}
          className="rounded-md px-2 py-0.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-0 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label={`Copy ${label} value`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={handleFocus}
          placeholder="0"
          aria-label={`${label} value`}
          aria-invalid={hasError}
          maxLength={32}
          className="min-w-0 flex-1 bg-transparent text-3xl font-medium tabular-nums text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-50 dark:placeholder:text-zinc-600"
        />
        <label htmlFor={selectId} className="sr-only">
          {label} unit
        </label>
        <select
          id={selectId}
          value={unitId}
          onChange={(e) => onUnitChange(e.target.value)}
          className="shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none transition-colors hover:border-zinc-300 hover:bg-zinc-100 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label} ({u.symbol})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SwapButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Swap units"
      title="Swap units"
      className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-all hover:rotate-180 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M7 4v16" />
        <path d="m3 8 4-4 4 4" />
        <path d="M17 20V4" />
        <path d="m21 16-4 4-4-4" />
      </svg>
    </button>
  );
}

function SummaryLine({
  categoryId,
  value,
  fromUnit,
  toUnit,
  result,
}: {
  categoryId: CategoryId;
  value: number;
  fromUnit: string;
  toUnit: string;
  result: number;
}) {
  const cat = CATEGORIES.find((c) => c.id === categoryId)!;
  const from = cat.units.find((u) => u.id === fromUnit)!;
  const to = cat.units.find((u) => u.id === toUnit)!;
  return (
    <span className="text-zinc-500 dark:text-zinc-400">
      {formatNumber(value)} {from.symbol} = {formatNumber(result)} {to.symbol}
    </span>
  );
}

type ParsedInput =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "ok"; value: number };

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

function parseNumberInput(raw: string): ParsedInput {
  const trimmed = raw.trim();
  if (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed === "+" ||
    trimmed === "." ||
    trimmed === "-." ||
    trimmed === "+."
  ) {
    return { kind: "empty" };
  }
  // Allow comma as decimal separator (locale convenience).
  const normalised = trimmed.replace(",", ".");
  if (!NUMBER_RE.test(normalised)) return { kind: "invalid" };
  const n = Number(normalised);
  if (!Number.isFinite(n)) return { kind: "invalid" };
  return { kind: "ok", value: n };
}
