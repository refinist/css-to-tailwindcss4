// Flexbox / alignment.

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import type { ConvertOptions, Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';

const FLEX_DIRECTION: Record<string, string> = {
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  column: 'flex-col',
  'column-reverse': 'flex-col-reverse'
};

const FLEX_WRAP: Record<string, string> = {
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse',
  nowrap: 'flex-nowrap'
};

const JUSTIFY_CONTENT: Record<string, string> = {
  'flex-start': 'justify-start',
  start: 'justify-start',
  'flex-end': 'justify-end',
  end: 'justify-end',
  center: 'justify-center',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly',
  stretch: 'justify-stretch',
  normal: 'justify-normal'
};

const ALIGN_ITEMS: Record<string, string> = {
  'flex-start': 'items-start',
  start: 'items-start',
  'flex-end': 'items-end',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch'
};

const ALIGN_CONTENT: Record<string, string> = {
  normal: 'content-normal',
  center: 'content-center',
  'flex-start': 'content-start',
  start: 'content-start',
  'flex-end': 'content-end',
  end: 'content-end',
  'space-between': 'content-between',
  'space-around': 'content-around',
  'space-evenly': 'content-evenly',
  baseline: 'content-baseline',
  stretch: 'content-stretch'
};

const ALIGN_SELF: Record<string, string> = {
  auto: 'self-auto',
  'flex-start': 'self-start',
  start: 'self-start',
  'flex-end': 'self-end',
  end: 'self-end',
  center: 'self-center',
  stretch: 'self-stretch',
  baseline: 'self-baseline'
};

function gap(
  value: string,
  prefix: string,
  theme: Theme,
  options: ConvertOptions
): string[] | null {
  const v = normalizeValue(value);
  const parts = v.split(/\s+/);
  if (prefix === 'gap' && parts.length === 2) {
    const row = matchSpacing(theme, parts[0]!, remInPx(options));
    const col = matchSpacing(theme, parts[1]!, remInPx(options));
    if (row && col) return [`gap-y-${row}`, `gap-x-${col}`];
  }
  const token = matchSpacing(theme, v, remInPx(options));
  if (token) return [`${prefix}-${token}`];
  return [arbitrary(prefix, value)];
}

export const flexHandlers: HandlerTable = {
  'flex-direction': decl => {
    const v = normalizeValue(decl.value);
    return FLEX_DIRECTION[v] ? [FLEX_DIRECTION[v]!] : null;
  },
  'flex-wrap': decl => {
    const v = normalizeValue(decl.value);
    return FLEX_WRAP[v] ? [FLEX_WRAP[v]!] : null;
  },
  flex: decl => {
    const v = normalizeValue(decl.value);
    if (v === '1 1 0%' || v === '1') return ['flex-1'];
    if (v === '1 1 auto') return ['flex-auto'];
    if (v === '0 1 auto') return ['flex-initial'];
    if (v === 'none') return ['flex-none'];
    return [arbitrary('flex', decl.value)];
  },
  'flex-grow': decl => {
    const v = normalizeValue(decl.value);
    if (v === '0') return ['grow-0'];
    if (v === '1') return ['grow'];
    if (/^\d+(\.\d+)?$/.test(v)) return [`grow-${v}`];
    return [arbitrary('grow', decl.value)];
  },
  'flex-shrink': decl => {
    const v = normalizeValue(decl.value);
    if (v === '0') return ['shrink-0'];
    if (v === '1') return ['shrink'];
    if (/^\d+(\.\d+)?$/.test(v)) return [`shrink-${v}`];
    return [arbitrary('shrink', decl.value)];
  },
  'flex-basis': (decl, theme, options) => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['basis-auto'];
    if (v === 'full' || v === '100%') return ['basis-full'];
    const token = matchSpacing(theme, v, remInPx(options));
    if (token) return [`basis-${token}`];
    return [arbitrary('basis', decl.value)];
  },
  order: decl => {
    const v = normalizeValue(decl.value);
    if (v === '0') return ['order-none'];
    if (/^-?\d+$/.test(v)) {
      const n = parseInt(v, 10);
      return n < 0 ? [`-order-${-n}`] : [`order-${n}`];
    }
    if (v === 'first') return ['order-first'];
    if (v === 'last') return ['order-last'];
    return [arbitrary('order', decl.value)];
  },
  'justify-content': decl => {
    const v = normalizeValue(decl.value);
    return JUSTIFY_CONTENT[v] ? [JUSTIFY_CONTENT[v]!] : null;
  },
  'justify-items': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'normal') return ['justify-items-normal'];
    if (v === 'start' || v === 'end' || v === 'center' || v === 'stretch') {
      return [`justify-items-${v}`];
    }
    return null;
  },
  'justify-self': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['justify-self-auto'];
    if (v === 'start' || v === 'end' || v === 'center' || v === 'stretch') {
      return [`justify-self-${v}`];
    }
    return null;
  },
  'align-items': decl => {
    const v = normalizeValue(decl.value);
    return ALIGN_ITEMS[v] ? [ALIGN_ITEMS[v]!] : null;
  },
  'align-content': decl => {
    const v = normalizeValue(decl.value);
    return ALIGN_CONTENT[v] ? [ALIGN_CONTENT[v]!] : null;
  },
  'align-self': decl => {
    const v = normalizeValue(decl.value);
    return ALIGN_SELF[v] ? [ALIGN_SELF[v]!] : null;
  },
  'place-content': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      center: 'place-content-center',
      start: 'place-content-start',
      end: 'place-content-end',
      'space-between': 'place-content-between',
      'space-around': 'place-content-around',
      'space-evenly': 'place-content-evenly',
      baseline: 'place-content-baseline',
      stretch: 'place-content-stretch'
    };
    return map[v] ? [map[v]!] : null;
  },
  'place-items': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      start: 'place-items-start',
      end: 'place-items-end',
      center: 'place-items-center',
      baseline: 'place-items-baseline',
      stretch: 'place-items-stretch'
    };
    return map[v] ? [map[v]!] : null;
  },
  'place-self': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      auto: 'place-self-auto',
      start: 'place-self-start',
      end: 'place-self-end',
      center: 'place-self-center',
      stretch: 'place-self-stretch'
    };
    return map[v] ? [map[v]!] : null;
  },
  gap: (decl, theme, options) => gap(decl.value, 'gap', theme, options),
  'column-gap': (decl, theme, options) =>
    gap(decl.value, 'gap-x', theme, options),
  'row-gap': (decl, theme, options) => gap(decl.value, 'gap-y', theme, options),
  // Legacy grid-* gap aliases (deprecated CSS but still seen in older codebases).
  'grid-gap': (decl, theme, options) => gap(decl.value, 'gap', theme, options),
  'grid-column-gap': (decl, theme, options) =>
    gap(decl.value, 'gap-x', theme, options),
  'grid-row-gap': (decl, theme, options) =>
    gap(decl.value, 'gap-y', theme, options)
};
