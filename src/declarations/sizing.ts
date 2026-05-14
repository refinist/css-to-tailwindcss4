// width / height / min / max.

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import type { ConvertOptions, Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';
import type { Declaration } from 'postcss';

const FRACTION: Record<string, string> = {
  '50%': '1/2',
  '33.333333%': '1/3',
  '66.666667%': '2/3',
  '25%': '1/4',
  '75%': '3/4',
  '20%': '1/5',
  '40%': '2/5',
  '60%': '3/5',
  '80%': '4/5',
  '16.666667%': '1/6',
  '83.333333%': '5/6',
  '8.333333%': '1/12',
  '91.666667%': '11/12',
  '100%': 'full'
};

function size(
  decl: Declaration,
  theme: Theme,
  options: ConvertOptions,
  prefix: string
): string[] {
  const v = normalizeValue(decl.value);
  if (v === 'auto') return [`${prefix}-auto`];
  if (v === 'fit-content') return [`${prefix}-fit`];
  if (v === 'min-content') return [`${prefix}-min`];
  if (v === 'max-content') return [`${prefix}-max`];
  if (
    v === '100vw' &&
    (prefix === 'w' || prefix === 'min-w' || prefix === 'max-w')
  )
    return [`${prefix}-screen`];
  if (
    v === '100vh' &&
    (prefix === 'h' || prefix === 'min-h' || prefix === 'max-h')
  )
    return [`${prefix}-screen`];
  if (v === '100dvh') return [`${prefix}-dvh`];
  if (v === '100dvw') return [`${prefix}-dvw`];
  if (v === '100svh') return [`${prefix}-svh`];
  if (v === '100lvh') return [`${prefix}-lvh`];
  const fraction = FRACTION[v];
  if (fraction) return [`${prefix}-${fraction}`];

  // max-w/max-h prefer the container scale (the typical use of those
  // properties is a content cap that maps to xs/sm/md/.../7xl).
  if (prefix === 'max-w' || prefix === 'max-h') {
    const container = theme.reverse.container.get(v);
    if (container) return [`${prefix}-${container}`];
  }

  const token = matchSpacing(theme, v, remInPx(options));
  if (token) return [`${prefix}-${token}`];
  return [arbitrary(prefix, decl.value)];
}

export const sizingHandlers: HandlerTable = {
  width: (decl, theme, options) => size(decl, theme, options, 'w'),
  height: (decl, theme, options) => size(decl, theme, options, 'h'),
  'min-width': (decl, theme, options) => size(decl, theme, options, 'min-w'),
  'min-height': (decl, theme, options) => size(decl, theme, options, 'min-h'),
  'max-width': (decl, theme, options) => size(decl, theme, options, 'max-w'),
  'max-height': (decl, theme, options) => size(decl, theme, options, 'max-h'),
  'inline-size': (decl, theme, options) => size(decl, theme, options, 'w'),
  'block-size': (decl, theme, options) => size(decl, theme, options, 'h'),
  'aspect-ratio': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['aspect-auto'];
    const token = theme.reverse.aspect.get(v);
    if (token) return [`aspect-${token}`];
    if (/^\d+\s*\/\s*\d+$/.test(v))
      return [`aspect-[${v.replace(/\s+/g, '_')}]`];
    return [arbitrary('aspect', decl.value)];
  }
};
