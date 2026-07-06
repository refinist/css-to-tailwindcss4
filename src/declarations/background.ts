// background-color, background-image, background-position, background-size,
// background-repeat, background-clip, background-origin, background-attachment.

import {
  arbitrary,
  formatColorToken,
  matchColor,
  matchColorWithAlpha,
  normalizeValue
} from '../theme/lookup.ts';
import { splitCommaTopLevel, splitTopLevel } from '../utils/values.ts';
import type { Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';

const BG_REPEAT: Record<string, string> = {
  repeat: 'bg-repeat',
  'no-repeat': 'bg-no-repeat',
  'repeat-x': 'bg-repeat-x',
  'repeat-y': 'bg-repeat-y',
  round: 'bg-repeat-round',
  space: 'bg-repeat-space'
};

const BG_SIZE: Record<string, string> = {
  auto: 'bg-auto',
  cover: 'bg-cover',
  contain: 'bg-contain'
};

const BG_CLIP: Record<string, string> = {
  'border-box': 'bg-clip-border',
  'padding-box': 'bg-clip-padding',
  'content-box': 'bg-clip-content',
  text: 'bg-clip-text'
};

const BG_ORIGIN: Record<string, string> = {
  'border-box': 'bg-origin-border',
  'padding-box': 'bg-origin-padding',
  'content-box': 'bg-origin-content'
};

const BG_ATTACHMENT: Record<string, string> = {
  fixed: 'bg-fixed',
  local: 'bg-local',
  scroll: 'bg-scroll'
};

// v4.1 canonical corner names (`bg-top-left`); the pre-4.1 `bg-left-top`
// spellings are deprecated. Both keyword orders are valid CSS input.
const BG_POSITION: Record<string, string> = {
  bottom: 'bg-bottom',
  center: 'bg-center',
  left: 'bg-left',
  right: 'bg-right',
  top: 'bg-top',
  'left bottom': 'bg-bottom-left',
  'bottom left': 'bg-bottom-left',
  'left top': 'bg-top-left',
  'top left': 'bg-top-left',
  'right bottom': 'bg-bottom-right',
  'bottom right': 'bg-bottom-right',
  'right top': 'bg-top-right',
  'top right': 'bg-top-right'
};

// Map a gradient color stop to a from-/via-/to- class.
function gradientStop(prefix: string, value: string, theme: Theme): string {
  const v = normalizeValue(value);
  if (v === 'transparent') return `${prefix}-transparent`;
  if (v === 'currentColor' || v === 'currentcolor') return `${prefix}-current`;
  const direct = matchColor(theme, v);
  if (direct) return `${prefix}-${direct}`;
  const withAlpha = matchColorWithAlpha(theme, v);
  if (withAlpha) return formatColorToken(prefix, withAlpha);
  return arbitrary(prefix, v);
}

export const backgroundHandlers: HandlerTable = {
  'background-color': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'transparent') return ['bg-transparent'];
    if (v === 'currentColor' || v === 'currentcolor') return ['bg-current'];
    if (v === 'inherit') return ['bg-inherit'];
    const direct = matchColor(theme, v);
    if (direct) return [`bg-${direct}`];
    const withAlpha = matchColorWithAlpha(theme, v);
    if (withAlpha) {
      return [formatColorToken('bg', withAlpha)];
    }
    return [arbitrary('bg', decl.value)];
  },

  background: (decl, theme) => {
    // Only convert pure color shorthand. Anything more complex stays.
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['bg-none'];
    const direct = matchColor(theme, v);
    if (direct) return [`bg-${direct}`];
    const withAlpha = matchColorWithAlpha(theme, v);
    if (withAlpha) {
      return [formatColorToken('bg', withAlpha)];
    }
    return null;
  },

  'background-image': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['bg-none'];
    // Common v4 utility: linear-gradient(to <side>, stops) →
    // bg-linear-to-<dir> from-* [via-*] to-*. The direction class alone
    // renders nothing — the stops MUST be emitted with it.
    const linear = v.match(/^linear-gradient\((.+)\)$/);
    if (linear) {
      const segments = splitCommaTopLevel(linear[1]!);
      const dirMatch = segments[0]?.match(/^to\s+([a-z\s]+)$/);
      if (dirMatch && segments.length >= 3) {
        const dir = dirMatch[1]!.trim().replace(/\s+/g, '-');
        const dirMap: Record<string, string> = {
          top: 't',
          bottom: 'b',
          left: 'l',
          right: 'r',
          'top-left': 'tl',
          'top-right': 'tr',
          'bottom-left': 'bl',
          'bottom-right': 'br'
        };
        const d = dirMap[dir];
        const stops = segments.slice(1);
        // Only plain color stops (no positions) map onto from/via/to.
        const simple =
          stops.length <= 3 && stops.every(s => splitTopLevel(s).length === 1);
        if (d && simple) {
          const classes = [`bg-linear-to-${d}`];
          classes.push(gradientStop('from', stops[0]!, theme));
          if (stops.length === 3)
            classes.push(gradientStop('via', stops[1]!, theme));
          classes.push(gradientStop('to', stops[stops.length - 1]!, theme));
          return classes;
        }
      }
      // Angles, positioned stops, >3 stops: keep the whole gradient.
      return [arbitrary('bg', decl.value)];
    }
    // A bare `bg-(--x)` is background-COLOR in v4; images need the hint.
    return [arbitrary('bg', decl.value, 'image')];
  },

  'background-repeat': decl => {
    const v = normalizeValue(decl.value);
    return BG_REPEAT[v] ? [BG_REPEAT[v]!] : null;
  },

  'background-size': decl => {
    const v = normalizeValue(decl.value);
    if (BG_SIZE[v]) return [BG_SIZE[v]!];
    // `bg-[50%_100%]` would compile to background-POSITION.
    return [arbitrary('bg-size', decl.value)];
  },

  'background-position': decl => {
    const v = normalizeValue(decl.value);
    if (BG_POSITION[v]) return [BG_POSITION[v]!];
    // Bracket values infer position fine; var() needs the hint (a bare
    // `bg-(--x)` is background-color).
    return [arbitrary('bg', decl.value, 'position')];
  },

  'background-clip': decl => {
    const v = normalizeValue(decl.value);
    return BG_CLIP[v] ? [BG_CLIP[v]!] : null;
  },

  'background-origin': decl => {
    const v = normalizeValue(decl.value);
    return BG_ORIGIN[v] ? [BG_ORIGIN[v]!] : null;
  },

  'background-attachment': decl => {
    const v = normalizeValue(decl.value);
    return BG_ATTACHMENT[v] ? [BG_ATTACHMENT[v]!] : null;
  }
};
