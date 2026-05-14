// Grid layout.

import { arbitrary, normalizeValue } from '../theme/lookup.ts';
import type { HandlerTable } from './dispatch.ts';

function gridTemplate(value: string, prefix: string): string[] {
  const v = normalizeValue(value);
  if (v === 'none') return [`${prefix}-none`];
  if (v === 'subgrid') return [`${prefix}-subgrid`];
  // Pattern: `repeat(N, minmax(0, 1fr))` → N
  const repeat = v.match(
    /^repeat\(\s*(\d+),\s*minmax\(0(?:px)?,\s*1fr\)\s*\)$/
  );
  if (repeat) return [`${prefix}-${repeat[1]}`];
  return [arbitrary(prefix, value)];
}

function lineSpan(value: string, prefix: string): string[] | null {
  const v = normalizeValue(value);
  if (v === 'auto') return [`${prefix}-auto`];
  const span = v.match(/^span\s+(\d+)(?:\s*\/\s*span\s+\d+)?$/);
  if (span) return [`${prefix}-span-${span[1]}`];
  if (/^-?\d+$/.test(v)) return [`${prefix}-${v}`];
  return [arbitrary(prefix, value)];
}

export const gridHandlers: HandlerTable = {
  'grid-template-columns': decl => gridTemplate(decl.value, 'grid-cols'),
  'grid-template-rows': decl => gridTemplate(decl.value, 'grid-rows'),
  'grid-column': decl => lineSpan(decl.value, 'col'),
  'grid-column-start': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['col-start-auto'];
    if (/^-?\d+$/.test(v)) return [`col-start-${v}`];
    return [arbitrary('col-start', decl.value)];
  },
  'grid-column-end': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['col-end-auto'];
    if (/^-?\d+$/.test(v)) return [`col-end-${v}`];
    return [arbitrary('col-end', decl.value)];
  },
  'grid-row': decl => lineSpan(decl.value, 'row'),
  'grid-row-start': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['row-start-auto'];
    if (/^-?\d+$/.test(v)) return [`row-start-${v}`];
    return [arbitrary('row-start', decl.value)];
  },
  'grid-row-end': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['row-end-auto'];
    if (/^-?\d+$/.test(v)) return [`row-end-${v}`];
    return [arbitrary('row-end', decl.value)];
  },
  'grid-auto-flow': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      row: 'grid-flow-row',
      column: 'grid-flow-col',
      dense: 'grid-flow-dense',
      'row dense': 'grid-flow-row-dense',
      'column dense': 'grid-flow-col-dense'
    };
    return map[v] ? [map[v]!] : null;
  },
  'grid-auto-columns': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      auto: 'auto-cols-auto',
      'min-content': 'auto-cols-min',
      'max-content': 'auto-cols-max',
      'minmax(0, 1fr)': 'auto-cols-fr'
    };
    return map[v] ? [map[v]!] : [arbitrary('auto-cols', decl.value)];
  },
  'grid-auto-rows': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      auto: 'auto-rows-auto',
      'min-content': 'auto-rows-min',
      'max-content': 'auto-rows-max',
      'minmax(0, 1fr)': 'auto-rows-fr'
    };
    return map[v] ? [map[v]!] : [arbitrary('auto-rows', decl.value)];
  }
};
