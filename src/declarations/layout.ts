// display/position/float/clear/overflow/visibility/z-index/isolation/object-*

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import type { ConvertOptions, Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';
import type { Declaration } from 'postcss';

const DISPLAY: Record<string, string> = {
  block: 'block',
  'inline-block': 'inline-block',
  inline: 'inline',
  flex: 'flex',
  'inline-flex': 'inline-flex',
  table: 'table',
  'inline-table': 'inline-table',
  'table-caption': 'table-caption',
  'table-cell': 'table-cell',
  'table-column': 'table-column',
  'table-column-group': 'table-column-group',
  'table-footer-group': 'table-footer-group',
  'table-header-group': 'table-header-group',
  'table-row-group': 'table-row-group',
  'table-row': 'table-row',
  'flow-root': 'flow-root',
  grid: 'grid',
  'inline-grid': 'inline-grid',
  contents: 'contents',
  'list-item': 'list-item',
  none: 'hidden'
};

const POSITION: Record<string, string> = {
  static: 'static',
  fixed: 'fixed',
  absolute: 'absolute',
  relative: 'relative',
  sticky: 'sticky'
};

const FLOAT: Record<string, string> = {
  right: 'float-right',
  left: 'float-left',
  'inline-start': 'float-start',
  'inline-end': 'float-end',
  none: 'float-none'
};

const CLEAR: Record<string, string> = {
  left: 'clear-left',
  right: 'clear-right',
  both: 'clear-both',
  'inline-start': 'clear-start',
  'inline-end': 'clear-end',
  none: 'clear-none'
};

const OVERFLOW: Record<string, string> = {
  auto: 'auto',
  hidden: 'hidden',
  clip: 'clip',
  visible: 'visible',
  scroll: 'scroll'
};

const VISIBILITY: Record<string, string> = {
  visible: 'visible',
  hidden: 'invisible',
  collapse: 'collapse'
};

const OBJECT_FIT: Record<string, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down'
};

const OBJECT_POSITION: Record<string, string> = {
  bottom: 'object-bottom',
  center: 'object-center',
  left: 'object-left',
  'left-bottom': 'object-left-bottom',
  'left-top': 'object-left-top',
  right: 'object-right',
  'right-bottom': 'object-right-bottom',
  'right-top': 'object-right-top',
  top: 'object-top'
};

const BOX_SIZING: Record<string, string> = {
  'border-box': 'box-border',
  'content-box': 'box-content'
};

const ISOLATION: Record<string, string> = {
  isolate: 'isolate',
  auto: 'isolation-auto'
};

function inset(
  decl: Declaration,
  theme: Theme,
  options: ConvertOptions,
  classPrefix: string
): string[] | null {
  const v = normalizeValue(decl.value);
  if (v === 'auto') return [`${classPrefix}-auto`];
  const negative = v.startsWith('-');
  const abs = negative ? v.slice(1) : v;
  const token = matchSpacing(theme, abs, remInPx(options));
  if (token) return [`${negative ? '-' : ''}${classPrefix}-${token}`];
  if (v.endsWith('%')) {
    if (v === '100%') return [`${classPrefix}-full`];
    if (v === '50%') return [`${classPrefix}-1/2`];
    if (v === '-50%') return [`-${classPrefix}-1/2`];
    return [arbitrary(classPrefix, decl.value)];
  }
  return [arbitrary(classPrefix, decl.value)];
}

export const layoutHandlers: HandlerTable = {
  display: decl => {
    const v = normalizeValue(decl.value);
    return DISPLAY[v] ? [DISPLAY[v]!] : null;
  },
  position: decl => {
    const v = normalizeValue(decl.value);
    return POSITION[v] ? [POSITION[v]!] : null;
  },
  float: decl => {
    const v = normalizeValue(decl.value);
    return FLOAT[v] ? [FLOAT[v]!] : null;
  },
  clear: decl => {
    const v = normalizeValue(decl.value);
    return CLEAR[v] ? [CLEAR[v]!] : null;
  },
  visibility: decl => {
    const v = normalizeValue(decl.value);
    return VISIBILITY[v] ? [VISIBILITY[v]!] : null;
  },
  isolation: decl => {
    const v = normalizeValue(decl.value);
    return ISOLATION[v] ? [ISOLATION[v]!] : null;
  },
  'box-sizing': decl => {
    const v = normalizeValue(decl.value);
    return BOX_SIZING[v] ? [BOX_SIZING[v]!] : null;
  },
  overflow: decl => {
    const v = normalizeValue(decl.value);
    return OVERFLOW[v] ? [`overflow-${OVERFLOW[v]}`] : null;
  },
  'overflow-x': decl => {
    const v = normalizeValue(decl.value);
    return OVERFLOW[v] ? [`overflow-x-${OVERFLOW[v]}`] : null;
  },
  'overflow-y': decl => {
    const v = normalizeValue(decl.value);
    return OVERFLOW[v] ? [`overflow-y-${OVERFLOW[v]}`] : null;
  },
  'object-fit': decl => {
    const v = normalizeValue(decl.value);
    return OBJECT_FIT[v] ? [OBJECT_FIT[v]!] : null;
  },
  'object-position': decl => {
    const v = normalizeValue(decl.value).replace(/\s+/g, '-');
    return OBJECT_POSITION[v]
      ? [OBJECT_POSITION[v]!]
      : [arbitrary('object', decl.value)];
  },
  'z-index': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['z-auto'];
    if (/^-?\d+$/.test(v))
      return [
        `z-${v.startsWith('-') ? '-' : ''}${v.replace(/^-/, '')}`.replace(
          'z--',
          '-z-'
        )
      ];
    return [arbitrary('z', decl.value)];
  },
  top: (decl, theme, options) => inset(decl, theme, options, 'top'),
  right: (decl, theme, options) => inset(decl, theme, options, 'right'),
  bottom: (decl, theme, options) => inset(decl, theme, options, 'bottom'),
  left: (decl, theme, options) => inset(decl, theme, options, 'left'),
  'inset-block-start': (decl, theme, options) =>
    inset(decl, theme, options, 'top'),
  'inset-block-end': (decl, theme, options) =>
    inset(decl, theme, options, 'bottom'),
  inset: (decl, theme, options) => inset(decl, theme, options, 'inset'),
  'inset-block': (decl, theme, options) =>
    inset(decl, theme, options, 'inset-y'),
  'inset-inline': (decl, theme, options) =>
    inset(decl, theme, options, 'inset-x')
};
