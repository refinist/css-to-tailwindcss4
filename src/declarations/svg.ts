// SVG presentation attributes that Tailwind exposes as utilities.

import {
  arbitrary,
  formatColorToken,
  matchColor,
  matchColorWithAlpha,
  normalizeValue
} from '../theme/lookup.ts';
import type { HandlerTable } from './dispatch.ts';

function svgColor(
  prefix: string,
  value: string,
  theme: import('../types.ts').Theme
): string[] {
  const v = normalizeValue(value);
  if (v === 'none') return [`${prefix}-none`];
  if (v === 'transparent') return [`${prefix}-transparent`];
  if (v === 'currentColor' || v === 'currentcolor')
    return [`${prefix}-current`];
  if (v === 'inherit') return [`${prefix}-inherit`];
  const direct = matchColor(theme, v);
  if (direct) return [`${prefix}-${direct}`];
  const withAlpha = matchColorWithAlpha(theme, v);
  if (withAlpha) {
    return [formatColorToken(prefix, withAlpha)];
  }
  return [arbitrary(prefix, value)];
}

export const svgHandlers: HandlerTable = {
  fill: (decl, theme) => svgColor('fill', decl.value, theme),
  stroke: (decl, theme) => svgColor('stroke', decl.value, theme),
  'stroke-width': decl => {
    const v = normalizeValue(decl.value);
    if (/^\d+$/.test(v)) return [`stroke-${v}`];
    return [arbitrary('stroke', decl.value)];
  }
};
