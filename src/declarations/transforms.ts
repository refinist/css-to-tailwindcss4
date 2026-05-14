// In v4, rotate / scale / translate became real CSS properties and have
// their own utilities, rather than being implemented through `transform`.
// We map both the legacy shorthand and the v4-native standalone props.

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import type { HandlerTable } from './dispatch.ts';

function angle(value: string): string | null {
  const v = normalizeValue(value);
  const m = v.match(/^(-?\d+(?:\.\d+)?)deg$/);
  if (!m) return null;
  return m[1]!;
}

function percentOrLength(value: string): string | null {
  const v = normalizeValue(value);
  if (v === '0' || v === '0px' || v === '0%') return '0';
  if (v.endsWith('%')) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? `${n}` : null;
  }
  return null;
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
    if (v.endsWith('%')) {
      const pct = parseFloat(v);
      if (Number.isFinite(pct)) return [`scale-${Math.round(pct)}`];
    }
    const n = parseFloat(v);
    if (Number.isFinite(n)) {
      const pct = Math.round(n * 100);
      return [`scale-${pct}`];
    }
    return [arbitrary('scale', decl.value)];
  },

  translate: (decl, theme, options) => {
    const v = normalizeValue(decl.value);
    const parts = v.split(/\s+/);
    if (parts.length === 1) {
      const pct = percentOrLength(parts[0]!);
      if (pct) return [`translate-x-[${parts[0]!}]`];
      const token = matchSpacing(theme, parts[0]!, remInPx(options));
      if (token) return [`translate-x-${token}`];
    }
    return [arbitrary('translate', decl.value)];
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
    if (v === 'normal' || v === 'reset') return [`zoom-${v}`];
    if (v.endsWith('%')) {
      const pct = parseFloat(v);
      if (Number.isFinite(pct)) return [`zoom-${Math.round(pct)}`];
    }
    return [arbitrary('zoom', decl.value)];
  },

  transform: decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['transform-none'];
    if (v === 'translateZ(0)') return ['transform-gpu'];
    return null;
  }
};
