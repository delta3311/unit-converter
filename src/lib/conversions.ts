export type CategoryId = "length" | "weight" | "temperature";

export type Unit = {
  id: string;
  label: string;
  symbol: string;
};

export type Category = {
  id: CategoryId;
  label: string;
  units: Unit[];
};

export const CATEGORIES: Category[] = [
  {
    id: "length",
    label: "Length",
    units: [
      { id: "m", label: "Meter", symbol: "m" },
      { id: "km", label: "Kilometer", symbol: "km" },
      { id: "cm", label: "Centimeter", symbol: "cm" },
      { id: "mm", label: "Millimeter", symbol: "mm" },
      { id: "mi", label: "Mile", symbol: "mi" },
      { id: "yd", label: "Yard", symbol: "yd" },
      { id: "ft", label: "Foot", symbol: "ft" },
      { id: "in", label: "Inch", symbol: "in" },
    ],
  },
  {
    id: "weight",
    label: "Weight",
    units: [
      { id: "kg", label: "Kilogram", symbol: "kg" },
      { id: "g", label: "Gram", symbol: "g" },
      { id: "mg", label: "Milligram", symbol: "mg" },
      { id: "t", label: "Metric ton", symbol: "t" },
      { id: "lb", label: "Pound", symbol: "lb" },
      { id: "oz", label: "Ounce", symbol: "oz" },
    ],
  },
  {
    id: "temperature",
    label: "Temperature",
    units: [
      { id: "C", label: "Celsius", symbol: "°C" },
      { id: "F", label: "Fahrenheit", symbol: "°F" },
      { id: "K", label: "Kelvin", symbol: "K" },
    ],
  },
];

// Factors to the SI base unit (meters / kilograms).
const LENGTH_TO_M: Record<string, number> = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  mi: 1609.344,
  yd: 0.9144,
  ft: 0.3048,
  in: 0.0254,
};

const WEIGHT_TO_KG: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 1e-6,
  t: 1000,
  lb: 0.45359237,
  oz: 0.028349523125,
};

const ABSOLUTE_ZERO: Record<string, number> = {
  C: -273.15,
  F: -459.67,
  K: 0,
};

function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number;
  switch (from) {
    case "C":
      celsius = value;
      break;
    case "F":
      celsius = (value - 32) * (5 / 9);
      break;
    case "K":
      celsius = value - 273.15;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${from}`);
  }

  switch (to) {
    case "C":
      return celsius;
    case "F":
      return celsius * (9 / 5) + 32;
    case "K":
      return celsius + 273.15;
    default:
      throw new Error(`Unknown temperature unit: ${to}`);
  }
}

export type ConvertResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function convert(
  category: CategoryId,
  value: number,
  from: string,
  to: string,
): ConvertResult {
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Please enter a valid number." };
  }

  if (category === "temperature") {
    const min = ABSOLUTE_ZERO[from];
    if (min !== undefined && value < min) {
      const unitLabel = from === "K" ? "K" : `°${from}`;
      return {
        ok: false,
        error: `Temperature cannot be below absolute zero (${min} ${unitLabel}).`,
      };
    }
    return { ok: true, value: convertTemperature(value, from, to) };
  }

  if (value < 0) {
    const noun = category === "length" ? "Length" : "Weight";
    return { ok: false, error: `${noun} cannot be negative.` };
  }

  const table = category === "length" ? LENGTH_TO_M : WEIGHT_TO_KG;
  const fromFactor = table[from];
  const toFactor = table[to];
  if (fromFactor === undefined || toFactor === undefined) {
    return { ok: false, error: "Unknown unit." };
  }
  return { ok: true, value: (value * fromFactor) / toFactor };
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Normalise -0 to 0.
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs < 1e-4 || abs >= 1e12) {
    return n.toExponential(6).replace(/\.?0+e/, "e");
  }
  const fixed = n.toFixed(8);
  return fixed.replace(/\.?0+$/, "");
}
