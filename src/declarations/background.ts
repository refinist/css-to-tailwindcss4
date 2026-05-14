// background-color, background-image, background-position, background-size,
// background-repeat, background-clip, background-origin, background-attachment.

import {
  arbitrary,
  formatColorToken,
  matchColor,
  matchColorWithAlpha,
  normalizeValue
} from '../theme/lookup.ts';
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

const BG_POSITION: Record<string, string> = {
  bottom: 'bg-bottom',
  center: 'bg-center',
  left: 'bg-left',
  'left bottom': 'bg-left-bottom',
  'left top': 'bg-left-top',
  right: 'bg-right',
  'right bottom': 'bg-right-bottom',
  'right top': 'bg-right-top',
  top: 'bg-top'
};

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

  'background-image': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['bg-none'];
    // Common v4 utility: linear-gradient(...) → bg-linear-to-<dir>
    const linear = v.match(/^linear-gradient\(\s*to\s+([a-z\s]+),/);
    if (linear) {
      const dir = linear[1]!.trim().replace(/\s+/g, '-');
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
      if (d) return [`bg-linear-to-${d}`];
    }
    return [arbitrary('bg', decl.value)];
  },

  'background-repeat': decl => {
    const v = normalizeValue(decl.value);
    return BG_REPEAT[v] ? [BG_REPEAT[v]!] : null;
  },

  'background-size': decl => {
    const v = normalizeValue(decl.value);
    if (BG_SIZE[v]) return [BG_SIZE[v]!];
    return [arbitrary('bg', decl.value)];
  },

  'background-position': decl => {
    const v = normalizeValue(decl.value);
    if (BG_POSITION[v]) return [BG_POSITION[v]!];
    return [arbitrary('bg', decl.value)];
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
