// scroll-snap-type / scroll-snap-align / scroll-snap-stop.

import { normalizeValue } from '../theme/lookup.ts';
import type { HandlerTable } from './dispatch.ts';

const SNAP_ALIGN: Record<string, string> = {
  start: 'snap-start',
  end: 'snap-end',
  center: 'snap-center',
  none: 'snap-align-none'
};

const SNAP_STOP: Record<string, string> = {
  normal: 'snap-normal',
  always: 'snap-always'
};

export const scrollSnapHandlers: HandlerTable = {
  'scroll-snap-type': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['snap-none'];
    const parts = v.split(/\s+/);
    const axis = parts[0];
    const strictness = parts[1];
    const out: string[] = [];
    if (axis === 'x') out.push('snap-x');
    else if (axis === 'y') out.push('snap-y');
    else if (axis === 'both') out.push('snap-both');
    if (strictness === 'mandatory') out.push('snap-mandatory');
    else if (strictness === 'proximity') out.push('snap-proximity');
    return out.length ? out : null;
  },
  'scroll-snap-align': decl => {
    const v = normalizeValue(decl.value);
    return SNAP_ALIGN[v] ? [SNAP_ALIGN[v]!] : null;
  },
  'scroll-snap-stop': decl => {
    const v = normalizeValue(decl.value);
    return SNAP_STOP[v] ? [SNAP_STOP[v]!] : null;
  }
};
