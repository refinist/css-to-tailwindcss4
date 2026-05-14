// break-before / break-after / break-inside / box-decoration-break / columns.

import { arbitrary, normalizeValue } from '../theme/lookup.ts';
import type { HandlerTable } from './dispatch.ts';

const BREAK_BA: Record<string, string> = {
  auto: 'auto',
  avoid: 'avoid',
  all: 'all',
  'avoid-page': 'avoid-page',
  page: 'page',
  left: 'left',
  right: 'right',
  column: 'column'
};

const BREAK_INSIDE: Record<string, string> = {
  auto: 'break-inside-auto',
  avoid: 'break-inside-avoid',
  'avoid-page': 'break-inside-avoid-page',
  'avoid-column': 'break-inside-avoid-column'
};

const BOX_DECORATION: Record<string, string> = {
  clone: 'box-decoration-clone',
  slice: 'box-decoration-slice'
};

export const breakHandlers: HandlerTable = {
  'break-before': decl => {
    const v = normalizeValue(decl.value);
    return BREAK_BA[v] ? [`break-before-${BREAK_BA[v]}`] : null;
  },
  'break-after': decl => {
    const v = normalizeValue(decl.value);
    return BREAK_BA[v] ? [`break-after-${BREAK_BA[v]}`] : null;
  },
  'break-inside': decl => {
    const v = normalizeValue(decl.value);
    return BREAK_INSIDE[v] ? [BREAK_INSIDE[v]!] : null;
  },
  'box-decoration-break': decl => {
    const v = normalizeValue(decl.value);
    return BOX_DECORATION[v] ? [BOX_DECORATION[v]!] : null;
  },
  '-webkit-box-decoration-break': decl => {
    const v = normalizeValue(decl.value);
    return BOX_DECORATION[v] ? [BOX_DECORATION[v]!] : null;
  },
  columns: (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['columns-auto'];
    if (/^\d+$/.test(v)) return [`columns-${v}`];
    const ctok = theme.reverse.container.get(v);
    if (ctok) return [`columns-${ctok}`];
    return [arbitrary('columns', decl.value)];
  }
};
