// Convert an `@media` rule's param list into Tailwind v4 variant tokens.

import type { Theme } from '../types.ts';

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

// Try to find a `min-width: X` / `max-width: X` feature and map it back
// to a breakpoint variant. Returns null when no exact theme match.
function widthVariant(theme: Theme, feature: MediaFeature): string | null {
  const min = feature.key.match(/^\(min-width: ([^)]+)\)$/);
  if (min) {
    const token = theme.reverse.breakpoint.get(min[1]!.trim());
    return token ?? null;
  }
  const max = feature.key.match(/^\(max-width: ([^)]+)\)$/);
  if (max) {
    const token = theme.reverse.breakpoint.get(max[1]!.trim());
    return token ? `max-${token}` : null;
  }
  return null;
}

// Convert a single `@media (...)` param string to a chain of v4 variants.
// Returns null if any feature is not convertible.
export function mediaParamsToVariants(
  theme: Theme,
  params: string
): string[] | null {
  // Tailwind only emits AND-style media combinations; OR (comma) goes to
  // multiple rules. We bail on commas.
  if (params.includes(',')) return null;

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
    const width = widthVariant(theme, feat);
    if (width) {
      variants.push(width);
      continue;
    }
    return null;
  }
  return variants;
}

// Convert an `@container (min-width: ...)` rule to `@<token>:` variant.
export function containerParamsToVariants(
  theme: Theme,
  params: string
): string[] | null {
  // Strip an optional container name (`sidebar (min-width: 24rem)`).
  const m = params.match(/^([\w-]+\s+)?(.+)$/);
  if (!m) return null;
  const conds = m[2]!.trim();
  if (conds.includes(',')) return null;
  const features = splitByKeyword(conds, 'and');
  const variants: string[] = [];
  for (const f of features) {
    const min = f.match(/^\(min-width:\s*([^)]+)\)$/i);
    if (!min) return null;
    const token = theme.reverse.container.get(min[1]!.trim());
    if (!token) return null;
    variants.push(`@${token}`);
  }
  return variants;
}

// Convert `@supports (...)` to a `supports-[...]` variant.
export function supportsParamsToVariants(params: string): string[] {
  const cleaned = params.trim().replace(/\s+/g, '_');
  return [`supports-[${cleaned}]`];
}
