// border-* / outline-* / ring-* / divide-* (output-side: we emit divide-*
// classes when we see the v4-style `* + *` patterns, but we don't go
// hunting for the legacy `:not([hidden]) ~ :not([hidden])` selector).

import {
  arbitrary,
  formatColorToken,
  matchColor,
  matchColorWithAlpha,
  matchInNamespace,
  normalizeValue
} from '../theme/lookup.ts';
import { splitTopLevel } from '../utils/values.ts';
import type { Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';
import type { Declaration } from 'postcss';

const BORDER_STYLE: Record<string, string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
  hidden: 'hidden',
  none: 'none'
};

function borderWidthValue(value: string): string | null {
  const v = normalizeValue(value);
  if (v === '0' || v === '0px') return '0';
  if (v === '1px') return '';
  const px = v.match(/^(\d+)px$/);
  if (px) return px[1]!;
  return null;
}

function borderColor(
  prefix: string,
  value: string,
  theme: Theme
): string[] | null {
  const v = normalizeValue(value);
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
  return null;
}

function borderShorthand(
  decl: Declaration,
  theme: Theme,
  prefix: string
): string[] | null {
  // `border: 1px solid red` → ["border", "border-solid", "border-red-500"]
  const parts = splitTopLevel(decl.value);
  if (parts.length === 0) return null;
  const classes: string[] = [];
  for (const part of parts) {
    const width = borderWidthValue(part);
    if (width !== null) {
      classes.push(width === '' ? prefix : `${prefix}-${width}`);
      continue;
    }
    const style = BORDER_STYLE[part];
    if (style) {
      classes.push(`${prefix}-${style}`);
      continue;
    }
    const colorClasses = borderColor(prefix, part, theme);
    if (colorClasses) {
      classes.push(...colorClasses);
      continue;
    }
    // Unrecognized → bail and let the decl stay
    return null;
  }
  return classes;
}

export const borderHandlers: HandlerTable = {
  'border-width': decl => {
    const w = borderWidthValue(decl.value);
    if (w === null) return [arbitrary('border', decl.value)];
    return [w === '' ? 'border' : `border-${w}`];
  },
  'border-top-width': decl => {
    const w = borderWidthValue(decl.value);
    if (w === null) return [arbitrary('border-t', decl.value)];
    return [w === '' ? 'border-t' : `border-t-${w}`];
  },
  'border-right-width': decl => {
    const w = borderWidthValue(decl.value);
    if (w === null) return [arbitrary('border-r', decl.value)];
    return [w === '' ? 'border-r' : `border-r-${w}`];
  },
  'border-bottom-width': decl => {
    const w = borderWidthValue(decl.value);
    if (w === null) return [arbitrary('border-b', decl.value)];
    return [w === '' ? 'border-b' : `border-b-${w}`];
  },
  'border-left-width': decl => {
    const w = borderWidthValue(decl.value);
    if (w === null) return [arbitrary('border-l', decl.value)];
    return [w === '' ? 'border-l' : `border-l-${w}`];
  },

  'border-style': decl => {
    const v = normalizeValue(decl.value);
    return BORDER_STYLE[v] ? [`border-${BORDER_STYLE[v]}`] : null;
  },

  'border-color': (decl, theme) =>
    borderColor('border', decl.value, theme) ?? [
      arbitrary('border', decl.value)
    ],
  'border-top-color': (decl, theme) =>
    borderColor('border-t', decl.value, theme) ?? [
      arbitrary('border-t', decl.value)
    ],
  'border-right-color': (decl, theme) =>
    borderColor('border-r', decl.value, theme) ?? [
      arbitrary('border-r', decl.value)
    ],
  'border-bottom-color': (decl, theme) =>
    borderColor('border-b', decl.value, theme) ?? [
      arbitrary('border-b', decl.value)
    ],
  'border-left-color': (decl, theme) =>
    borderColor('border-l', decl.value, theme) ?? [
      arbitrary('border-l', decl.value)
    ],

  border: (decl, theme) => borderShorthand(decl, theme, 'border'),
  'border-top': (decl, theme) => borderShorthand(decl, theme, 'border-t'),
  'border-right': (decl, theme) => borderShorthand(decl, theme, 'border-r'),
  'border-bottom': (decl, theme) => borderShorthand(decl, theme, 'border-b'),
  'border-left': (decl, theme) => borderShorthand(decl, theme, 'border-l'),

  'border-radius': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === '0' || v === '0px') return ['rounded-none'];
    if (v === '9999px' || v === '50%' || v === 'full') return ['rounded-full'];
    const token = matchInNamespace(theme.reverse.radius, v);
    if (token) return [`rounded-${token}`];
    return [arbitrary('rounded', decl.value)];
  },
  'border-top-left-radius': (decl, theme) => corner(decl, theme, 'rounded-tl'),
  'border-top-right-radius': (decl, theme) => corner(decl, theme, 'rounded-tr'),
  'border-bottom-left-radius': (decl, theme) =>
    corner(decl, theme, 'rounded-bl'),
  'border-bottom-right-radius': (decl, theme) =>
    corner(decl, theme, 'rounded-br'),
  'border-start-start-radius': (decl, theme) =>
    corner(decl, theme, 'rounded-ss'),
  'border-start-end-radius': (decl, theme) => corner(decl, theme, 'rounded-se'),
  'border-end-start-radius': (decl, theme) => corner(decl, theme, 'rounded-es'),
  'border-end-end-radius': (decl, theme) => corner(decl, theme, 'rounded-ee'),

  outline: (decl, theme) => {
    // v4: `outline-none` hides the outline; `outline-hidden` is the no-op
    // accessibility-safe variant. Map `outline: none` → outline-hidden, since
    // most legacy CSS uses `outline: none` to suppress focus visibly.
    const v = normalizeValue(decl.value);
    if (v === 'none' || v === '0' || v === '0px') return ['outline-hidden'];
    // Shorthand outline: width style color
    const parts = splitTopLevel(decl.value);
    const out: string[] = [];
    for (const part of parts) {
      const w = borderWidthValue(part);
      if (w !== null) {
        out.push(w === '' ? 'outline' : `outline-${w}`);
        continue;
      }
      if (BORDER_STYLE[part]) {
        out.push(`outline-${BORDER_STYLE[part]}`);
        continue;
      }
      const c = borderColor('outline', part, theme);
      if (c) {
        out.push(...c);
        continue;
      }
      return null;
    }
    return out;
  },
  'outline-width': decl => {
    const w = borderWidthValue(decl.value);
    if (w === null) return [arbitrary('outline', decl.value)];
    return [w === '' ? 'outline-1' : `outline-${w}`];
  },
  'outline-style': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['outline-hidden'];
    return BORDER_STYLE[v] ? [`outline-${BORDER_STYLE[v]}`] : null;
  },
  'outline-color': (decl, theme) =>
    borderColor('outline', decl.value, theme) ?? [
      arbitrary('outline', decl.value)
    ],
  'outline-offset': decl => {
    const v = normalizeValue(decl.value);
    const px = v.match(/^(-?\d+)px$/);
    if (px) {
      const n = parseInt(px[1]!, 10);
      return [n < 0 ? `-outline-offset-${-n}` : `outline-offset-${n}`];
    }
    return [arbitrary('outline-offset', decl.value)];
  }
};

function corner(decl: Declaration, theme: Theme, prefix: string): string[] {
  const v = normalizeValue(decl.value);
  if (v === '0' || v === '0px') return [`${prefix}-none`];
  if (v === '9999px' || v === '50%') return [`${prefix}-full`];
  const token = matchInNamespace(theme.reverse.radius, v);
  if (token) return [`${prefix}-${token}`];
  return [arbitrary(prefix, decl.value)];
}
