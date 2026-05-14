// Helpers for finding a Tailwind v4 token that matches an incoming CSS
// value. The functions are deliberately small and composable so each
// declaration converter can pick the policy that suits it.

import { colord, extend, type Plugin } from 'colord';
import namesPlugin from 'colord/plugins/names';

import type { Theme } from '../types.ts';

extend([namesPlugin as unknown as Plugin]);

// Normalize whitespace and lowercase keywords so equal-but-formatted
// values still match. We only touch keywords, not numeric values.
export function normalizeValue(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

// Strip the `_` Tailwind uses for spaces inside arbitrary values.
function escapeArbitrary(value: string): string {
  return value.replace(/_/g, '\\_').replace(/\s+/g, '_');
}

// Wrap a value as an arbitrary utility value: `bg-[#fff]`, `bg-(--brand)`.
export function arbitrary(prefix: string, value: string): string {
  const v = normalizeValue(value);
  // v4 paren syntax for CSS vars: `bg-(--brand)` instead of `bg-[--brand]`.
  const varMatch = v.match(/^var\((--[^,)\s]+)\)$/);
  if (varMatch) return `${prefix}-(${varMatch[1]})`;
  if (v.startsWith('--')) return `${prefix}-(${v})`;
  return `${prefix}-[${escapeArbitrary(v)}]`;
}

// Find a spacing token whose value equals the given css value, e.g. for
// `padding: 1rem` we want `4` (since `--spacing` defaults to 0.25rem).
export function matchSpacing(
  theme: Theme,
  value: string,
  remInPx: number | null = 16
): string | null {
  const v = normalizeValue(value);
  const direct = theme.reverse.spacing.get(v);
  if (direct) return direct;

  const remNormalized = normalizePxToRem(v, remInPx);
  if (remNormalized && remNormalized !== v) {
    const remDirect = theme.reverse.spacing.get(remNormalized);
    if (remDirect) return remDirect;
  }

  // Allow matching arbitrary integer multiples of the base when value is in
  // the same unit. E.g. `padding: 13rem` with base 0.25rem → `52`.
  const normalizedValue = remNormalized ?? v;
  const match = normalizedValue.match(/^(-?[\d.]+)(rem|em|px)$/);
  const baseMatch = theme.spacingBase.match(/^(-?[\d.]+)(\D*)$/);
  if (match && baseMatch && match[2] === baseMatch[2]) {
    const num = parseFloat(match[1]!);
    const base = parseFloat(baseMatch[1]!);
    if (base !== 0) {
      const steps = num / base;
      if (
        Number.isFinite(steps) &&
        Math.abs(steps - Math.round(steps)) < 1e-6
      ) {
        return `${Math.round(steps)}`;
      }
    }
  }

  return null;
}

function normalizePxToRem(
  value: string,
  remInPx: number | null
): string | null {
  if (remInPx == null || remInPx === 0) return null;
  if (value === '0px') return '0';
  const match = value.match(/^(-?[\d.]+)px$/);
  if (!match) return null;
  const px = parseFloat(match[1]!);
  return `${trimZeros(px / remInPx)}rem`;
}

function trimZeros(n: number): string {
  return parseFloat(n.toFixed(6)).toString();
}

// Look up the named color token (gray-500, etc.) for an incoming value.
export function matchColor(theme: Theme, value: string): string | null {
  const v = normalizeValue(value);
  const direct = theme.reverse.color.get(v);
  if (direct) return direct;

  // Try color-equivalence via colord plus a small OKLCH converter for the
  // v4 default palette.
  if (!isColorLike(v)) return null;

  const oklch = parseOklchColor(v);
  if (oklch && oklch.alpha < 0.9995) return null;

  const hex = colorToHex(v);
  if (!hex) return null;
  for (const [token, themeValue] of Object.entries(theme.color)) {
    const themeHex = colorToHex(themeValue);
    if (themeHex === hex) return token;
  }
  return null;
}

// Split a color literal into base + opacity so we can emit `red-500/50`.
export function matchColorWithAlpha(
  theme: Theme,
  value: string
): { token: string; alpha?: number } | null {
  const oklch = parseOklchColor(value);
  if (oklch) {
    let token: string | null = null;
    for (const [name, themeValue] of Object.entries(theme.color)) {
      const themeHex = colorToHex(themeValue);
      if (themeHex === oklch.hex) {
        token = name;
        break;
      }
    }
    if (!token) return null;
    if (oklch.alpha >= 0.9995) return { token };
    return { token, alpha: Math.round(oklch.alpha * 100) };
  }

  const parsed = colord(value);
  if (!parsed.isValid()) return null;
  const rgba = parsed.rgba;
  const opaque = colord({ r: rgba.r, g: rgba.g, b: rgba.b, a: 1 })
    .toHex()
    .toLowerCase();
  let token: string | null = null;
  for (const [name, themeValue] of Object.entries(theme.color)) {
    const themeHex = colorToHex(themeValue);
    if (themeHex === opaque) {
      token = name;
      break;
    }
  }
  if (!token) return null;
  if (rgba.a >= 0.9995) return { token };
  return { token, alpha: Math.round(rgba.a * 100) };
}

export function formatColorToken(
  prefix: string,
  color: { token: string; alpha?: number }
): string {
  return color.alpha == null
    ? `${prefix}-${color.token}`
    : `${prefix}-${color.token}/${color.alpha}`;
}

function colorToHex(value: string): string | null {
  const oklch = parseOklchColor(value);
  if (oklch) return oklch.hex;

  const parsed = colord(value);
  if (parsed.isValid()) return parsed.toHex().toLowerCase();
  return null;
}

function parseOklchColor(value: string): { hex: string; alpha: number } | null {
  const match = normalizeValue(value).match(/^oklch\((.+)\)$/i);
  if (!match) return null;

  const rawParts = match[1]!
    .replace(/\s*\/\s*/, ' ')
    .trim()
    .split(/\s+/);
  if (rawParts.length < 3) return null;

  const lightness = parseOklchComponent(rawParts[0]!);
  const chroma = parseFloat(rawParts[1]!);
  const hue = parseAngle(rawParts[2]!);
  const alpha = rawParts[3] ? parseAlpha(rawParts[3]!) : 1;
  if (
    lightness === null ||
    !Number.isFinite(chroma) ||
    hue === null ||
    alpha === null
  ) {
    return null;
  }

  const h = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    hex: `#${toSrgbHexChannel(r)}${toSrgbHexChannel(g)}${toSrgbHexChannel(blue)}`,
    alpha
  };
}

function parseOklchComponent(value: string): number | null {
  if (value.endsWith('%')) {
    const pct = parseFloat(value);
    return Number.isFinite(pct) ? pct / 100 : null;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function parseAngle(value: string): number | null {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  const unit = value.replace(/^-?[\d.]+/, '');
  const factors: Record<string, number> = {
    turn: 360,
    rad: 180 / Math.PI,
    grad: 0.9,
    deg: 1,
    '': 1
  };
  return n * (factors[unit] ?? 1);
}

function parseAlpha(value: string): number | null {
  if (value.endsWith('%')) {
    const pct = parseFloat(value);
    return Number.isFinite(pct) ? pct / 100 : null;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function toSrgbHexChannel(linear: number): string {
  const gamma =
    linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  const clamped = Math.min(1, Math.max(0, gamma));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
}

function isColorLike(v: string): boolean {
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    v.startsWith('oklch') ||
    v.startsWith('oklab') ||
    v.startsWith('lab') ||
    v.startsWith('lch') ||
    v === 'currentColor' ||
    v === 'transparent' ||
    v === 'inherit' ||
    /^[a-z]+$/i.test(v) // named CSS color
  );
}

// Match a value to a generic namespace map (radius, shadow, blur, ...).
export function matchInNamespace(
  reverse: Map<string, string>,
  value: string
): string | null {
  return reverse.get(normalizeValue(value)) ?? null;
}
