# Unit Converter

A small unit converter built with Next.js (App Router), React 19, TypeScript, and Tailwind CSS. Supports Length, Weight, and Temperature with real-time, bidirectional conversion.

## Live demo

https://unit-converter-ph3a6nto0-delta3311s-projects.vercel.app/

## Features

- Three categories: Length, Weight, Temperature
- Bidirectional editing — type into either field and the other updates live
- Swap button to flip From / To
- Validation:
  - Rejects non-numeric input
  - Blocks negative values for length and weight
  - Blocks values below absolute zero per scale (-273.15 °C, -459.67 °F, 0 K)
- Accepts comma decimals (`3,5`) and scientific notation (`1.5e3`)
- Copy-to-clipboard on each side
- Last category, units, and value are remembered in `localStorage`
- Keyboard accessible, `aria-live` status region for screen readers
- Dark mode via `prefers-color-scheme`
- Builds as a fully static page

## Project structure

```
src/
  app/
    layout.tsx        Root layout + metadata
    page.tsx          Page shell
    converter.tsx     Client component with the UI + state
    globals.css       Tailwind entry
  lib/
    conversions.ts    Pure conversion logic (categories, factors, formatter)
```

The conversion math is isolated in `src/lib/conversions.ts` — no React, no DOM. The UI imports it as pure functions, which keeps it easy to reason about and trivial to unit-test.

### Conversion accuracy

- Length and Weight use exact international conversion factors (`1 in = 0.0254 m`, `1 lb = 0.45359237 kg`, etc.).
- Temperature routes through Celsius as a pivot to keep the formulas simple and avoid compounding rounding.
- `formatNumber()` shows up to 8 significant digits, trims trailing zeros, and falls back to exponential notation for very large or very small magnitudes.

## Approach

I started by listing the categories and units I wanted to support and writing the conversion table as plain data. The API I landed on for the converter is:

```ts
convert(category, value, fromUnit, toUnit) -> { ok: true, value } | { ok: false, error }
```

That tagged-union return type meant I could push all domain validation (negative length, sub-absolute-zero temperature) into the same function and let the UI just render whatever comes back.

For the UI, the key decision was making both inputs editable. I track which side the user is currently editing (`activeSide`), keep the raw text as the source of truth for that side, and derive the other side via `convert()`. This avoids the usual round-trip drift you get when you store both numbers in state and try to keep them in sync.

A typed parser (`parseNumberInput`) maps user input to `empty | invalid | ok` — that way the UI never has to deal with `NaN`, and in-progress input like `-`, `.`, or `1.` is treated as empty rather than invalid so the error doesn't flicker while typing.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Deploy

```bash
npx vercel
npx vercel --prod
```

No env vars or runtime config required.
