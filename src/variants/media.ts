// Convert an `@media` rule's param list into Tailwind v4 variant tokens.

import { remInPx } from '../utils/options.ts';

import type { ConvertOptions, Theme } from '../types.ts';

const FEATURE_VARIANT: Record<string, string> = {
  print: 'print',
  '(orientation: portrait)': 'portrait',
  '(orientation: landscape)': 'landscape',
  '(prefers-contrast: more)': 'contrast-more',
  '(prefers-contrast: less)': 'contrast-less',
  '(prefers-color-scheme: dark)': 'dark',
  '(prefers-color-scheme: light)': 'light',
  '(prefers-reduced-motion: no-preference)': 'motion-safe',
  '(prefers-reduced-motion: reduce)': 'motion-reduce',
  '(forced-colors: active)': 'forced-colors',
  '(inverted-colors: inverted)': 'inverted-colors',
  '(pointer: coarse)': 'pointer-coarse',
  '(pointer: fine)': 'pointer-fine',
  '(pointer: none)': 'pointer-none',
  '(any-pointer: coarse)': 'any-pointer-coarse',
  '(any-pointer: fine)': 'any-pointer-fine',
  '(any-pointer: none)': 'any-pointer-none',
  '(scripting: enabled)': 'scripting',
  '(scripting: none)': 'noscript'
};

interface MediaFeature {
  raw: string;
  // lowercased, spaces collapsed and normalized to `(name: value)` form.
  key: string;
}

function splitByKeyword(input: string, keyword: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let last = 0;
  const lower = input.toLowerCase();
  const pattern = ` ${keyword.toLowerCase()} `;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (
      depth === 0 &&
      lower.startsWith(pattern, i) &&
      input.slice(0, i).trim() !== ''
    ) {
      out.push(input.slice(last, i).trim());
      last = i + pattern.length;
      i = last - 1;
    }
  }
  out.push(input.slice(last).trim());
  return out.filter(Boolean);
}

function normalizeFeature(feature: string): MediaFeature {
  const raw = feature.trim();
  // Drop redundant outer parens? Keep them — they're part of the key.
  const key = raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*:\s*/g, ': ');
  return { raw, key };
}

// Look a width value up in a reverse map, normalizing px<->rem so
// `@media (min-width: 640px)` still matches the rem-based default scale.
function lookupWidth(
  reverse: Map<string, string>,
  raw: string,
  pxPerRem: number | null
): string | null {
  const v = raw.trim();
  const direct = reverse.get(v);
  if (direct) return direct;
  if (pxPerRem == null || pxPerRem === 0) return null;

  const px = v.match(/^(-?[\d.]+)px$/);
  if (px) {
    const rem = `${trimZeros(parseFloat(px[1]!) / pxPerRem)}rem`;
    return reverse.get(rem) ?? null;
  }
  const rem = v.match(/^(-?[\d.]+)rem$/);
  if (rem) {
    const asPx = `${trimZeros(parseFloat(rem[1]!) * pxPerRem)}px`;
    return reverse.get(asPx) ?? null;
  }
  return null;
}

function trimZeros(n: number): string {
  return parseFloat(n.toFixed(6)).toString();
}

// Try to find a `min-width: X` / `max-width: X` feature and map it back
// to a breakpoint variant. Returns null when no theme match.
function widthVariant(
  theme: Theme,
  feature: MediaFeature,
  pxPerRem: number | null
): string | null {
  const min = feature.key.match(/^\(min-width: ([^)]+)\)$/);
  if (min) {
    return lookupWidth(theme.reverse.breakpoint, min[1]!, pxPerRem);
  }
  const max = feature.key.match(/^\(max-width: ([^)]+)\)$/);
  if (max) {
    const token = lookupWidth(theme.reverse.breakpoint, max[1]!, pxPerRem);
    return token ? `max-${token}` : null;
  }
  return null;
}

// Convert a single `@media (...)` param string to a chain of v4 variants.
// Returns null if any feature is not convertible.
export function mediaParamsToVariants(
  theme: Theme,
  params: string,
  options: ConvertOptions = {}
): string[] | null {
  // Tailwind only emits AND-style media combinations; OR (comma) goes to
  // multiple rules. We bail on commas.
  if (params.includes(',')) return null;

  const pxPerRem = remInPx(options);
  const features = splitByKeyword(params, 'and');
  const variants: string[] = [];
  for (const f of features) {
    if (f.toLowerCase() === 'screen' || f.toLowerCase() === 'all') continue;
    const feat = normalizeFeature(f);
    const direct = FEATURE_VARIANT[feat.key];
    if (direct) {
      variants.push(direct);
      continue;
    }
    const width = widthVariant(theme, feat, pxPerRem);
    if (width) {
      variants.push(width);
      continue;
    }
    return null;
  }
  return variants;
}

// Convert an `@container (min-width: ...)` rule to `@<token>:` variant.
// A named container (`sidebar (min-width: 24rem)`) keeps its name:
// `@sm/sidebar:` — dropping it would match the nearest container instead.
export function containerParamsToVariants(
  theme: Theme,
  params: string,
  options: ConvertOptions = {}
): string[] | null {
  const m = params.match(/^([\w-]+\s+)?(.+)$/);
  if (!m) return null;
  const name = m[1]?.trim();
  const conds = m[2]!.trim();
  if (conds.includes(',')) return null;
  const pxPerRem = remInPx(options);
  const features = splitByKeyword(conds, 'and');
  const variants: string[] = [];
  for (const f of features) {
    const min = f.match(/^\(min-width:\s*([^)]+)\)$/i);
    if (!min) return null;
    const token = lookupWidth(theme.reverse.container, min[1]!, pxPerRem);
    if (!token) return null;
    variants.push(name ? `@${token}/${name}` : `@${token}`);
  }
  return variants;
}

// Convert `@supports (...)` to a `supports-[...]` variant.
export function supportsParamsToVariants(params: string): string[] {
  const cleaned = params.trim().replace(/\s+/g, '_');
  return [`supports-[${cleaned}]`];
}
