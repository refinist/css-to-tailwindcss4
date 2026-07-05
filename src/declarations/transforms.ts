// In v4, rotate / scale / translate became real CSS properties and have
// their own utilities, rather than being implemented through `transform`.
// We map both the legacy shorthand and the v4-native standalone props.

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import { splitTopLevel } from '../utils/values.ts';
import type { ConvertOptions, Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';

// Bare `rotate-N` requires an integer in v4; fractions must be arbitrary.
function angle(value: string): string | null {
  const v = normalizeValue(value);
  const m = v.match(/^(-?\d+)deg$/);
  if (!m) return null;
  return m[1]!;
}

// One component of a `scale`/`zoom` value → percent-based class, or an
// arbitrary fallback when the percentage isn't a (positive or negative)
// integer — `scale-105.5` doesn't exist.
function percentClass(prefix: string, raw: string): string {
  const v = raw.trim();
  let pct: number | null = null;
  if (v.endsWith('%')) {
    pct = parseFloat(v);
  } else {
    const n = parseFloat(v);
    if (Number.isFinite(n) && /^-?[\d.]+$/.test(v)) pct = n * 100;
  }
  if (pct !== null && Number.isFinite(pct)) {
    const rounded = Math.round(pct);
    if (Math.abs(pct - rounded) < 1e-6) {
      return rounded < 0 ? `-${prefix}-${-rounded}` : `${prefix}-${rounded}`;
    }
  }
  return arbitrary(prefix, v);
}

// One axis of a `translate` value.
function translateClass(
  prefix: string,
  raw: string,
  theme: Theme,
  options: ConvertOptions
): string {
  const v = raw.trim();
  const negative = v.startsWith('-');
  const abs = negative ? v.slice(1) : v;
  const token = matchSpacing(theme, abs, remInPx(options));
  if (token) return `${negative ? '-' : ''}${prefix}-${token}`;
  return arbitrary(prefix, v);
}

const ORIGIN: Record<string, string> = {
  center: 'center',
  top: 'top',
  'top right': 'top-right',
  right: 'right',
  'bottom right': 'bottom-right',
  bottom: 'bottom',
  'bottom left': 'bottom-left',
  left: 'left',
  'top left': 'top-left'
};

export const transformHandlers: HandlerTable = {
  rotate: decl => {
    const a = angle(decl.value);
    if (a === null) return [arbitrary('rotate', decl.value)];
    if (a.startsWith('-')) return [`-rotate-${a.slice(1)}`];
    return [`rotate-${a}`];
  },

  scale: decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['scale-none'];
    // `scale: x y z?` — each component maps to its own axis utility.
    const parts = splitTopLevel(v);
    if (parts.length === 1) return [percentClass('scale', parts[0]!)];
    if (parts.length === 2)
      return [
        percentClass('scale-x', parts[0]!),
        percentClass('scale-y', parts[1]!)
      ];
    if (parts.length === 3)
      return [
        percentClass('scale-x', parts[0]!),
        percentClass('scale-y', parts[1]!),
        percentClass('scale-z', parts[2]!)
      ];
    return null;
  },

  translate: (decl, theme, options) => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['translate-none'];
    // `translate: x y? z?` — per-axis utilities. A combined
    // `translate-[10px_20px]` would expand the full value into BOTH the
    // x and y variables and produce invalid CSS.
    const parts = splitTopLevel(v);
    if (parts.length === 1)
      return [translateClass('translate-x', parts[0]!, theme, options)];
    if (parts.length === 2)
      return [
        translateClass('translate-x', parts[0]!, theme, options),
        translateClass('translate-y', parts[1]!, theme, options)
      ];
    if (parts.length === 3)
      return [
        translateClass('translate-x', parts[0]!, theme, options),
        translateClass('translate-y', parts[1]!, theme, options),
        translateClass('translate-z', parts[2]!, theme, options)
      ];
    return null;
  },

  'transform-origin': decl => {
    const v = normalizeValue(decl.value);
    return ORIGIN[v]
      ? [`origin-${ORIGIN[v]}`]
      : [arbitrary('origin', decl.value)];
  },

  'perspective-origin': decl => {
    const v = normalizeValue(decl.value);
    return ORIGIN[v]
      ? [`perspective-origin-${ORIGIN[v]}`]
      : [arbitrary('perspective-origin', decl.value)];
  },

  'transform-style': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'preserve-3d') return ['transform-3d'];
    if (v === 'flat') return ['transform-flat'];
    return null;
  },

  perspective: (decl, theme) => {
    const v = normalizeValue(decl.value);
    const token = theme.reverse.perspective.get(v);
    if (token) return [`perspective-${token}`];
    if (v === 'none') return ['perspective-none'];
    return [arbitrary('perspective', decl.value)];
  },

  'backface-visibility': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'hidden') return ['backface-hidden'];
    if (v === 'visible') return ['backface-visible'];
    return null;
  },

  zoom: decl => {
    const v = normalizeValue(decl.value);
    // v4 only has `zoom-<number>` and arbitrary; no `zoom-normal`.
    if (v === 'normal' || v === 'reset') return [arbitrary('zoom', v)];
    return [percentClass('zoom', v)];
  },

  transform: decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['transform-none'];
    if (v === 'translateZ(0)') return ['transform-gpu'];
    return null;
  }
};
