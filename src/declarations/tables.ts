// table-layout / border-collapse / border-spacing / caption-side.

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import type { HandlerTable } from './dispatch.ts';

export const tableHandlers: HandlerTable = {
  'table-layout': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['table-auto'];
    if (v === 'fixed') return ['table-fixed'];
    return null;
  },
  'border-collapse': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'collapse') return ['border-collapse'];
    if (v === 'separate') return ['border-separate'];
    return null;
  },
  'border-spacing': (decl, theme, options) => {
    const v = normalizeValue(decl.value);
    const parts = v.split(/\s+/);
    if (parts.length === 1) {
      const token = matchSpacing(theme, parts[0]!, remInPx(options));
      if (token) return [`border-spacing-${token}`];
      return [arbitrary('border-spacing', decl.value)];
    }
    if (parts.length === 2) {
      // Always per-axis: a combined `border-spacing-[5px_7px]` expands the
      // full value into BOTH axis variables and yields invalid CSS.
      const x =
        matchSpacing(theme, parts[0]!, remInPx(options)) ?? `[${parts[0]!}]`;
      const y =
        matchSpacing(theme, parts[1]!, remInPx(options)) ?? `[${parts[1]!}]`;
      return [`border-spacing-x-${x}`, `border-spacing-y-${y}`];
    }
    return [arbitrary('border-spacing', decl.value)];
  },
  'caption-side': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'top') return ['caption-top'];
    if (v === 'bottom') return ['caption-bottom'];
    return null;
  }
};
