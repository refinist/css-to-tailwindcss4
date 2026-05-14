// cursor / user-select / pointer-events / appearance / accent-color /
// caret-color / resize / scroll-behavior / scroll-snap / touch-action /
// will-change.

import { arbitrary, matchColor, normalizeValue } from '../theme/lookup.ts';
import type { HandlerTable } from './dispatch.ts';

const CURSOR: Record<string, string> = {
  auto: 'cursor-auto',
  default: 'cursor-default',
  pointer: 'cursor-pointer',
  wait: 'cursor-wait',
  text: 'cursor-text',
  move: 'cursor-move',
  help: 'cursor-help',
  'not-allowed': 'cursor-not-allowed',
  none: 'cursor-none',
  'context-menu': 'cursor-context-menu',
  progress: 'cursor-progress',
  cell: 'cursor-cell',
  crosshair: 'cursor-crosshair',
  'vertical-text': 'cursor-vertical-text',
  alias: 'cursor-alias',
  copy: 'cursor-copy',
  'no-drop': 'cursor-no-drop',
  grab: 'cursor-grab',
  grabbing: 'cursor-grabbing',
  'all-scroll': 'cursor-all-scroll',
  'col-resize': 'cursor-col-resize',
  'row-resize': 'cursor-row-resize',
  'n-resize': 'cursor-n-resize',
  'e-resize': 'cursor-e-resize',
  's-resize': 'cursor-s-resize',
  'w-resize': 'cursor-w-resize',
  'ne-resize': 'cursor-ne-resize',
  'nw-resize': 'cursor-nw-resize',
  'se-resize': 'cursor-se-resize',
  'sw-resize': 'cursor-sw-resize',
  'ew-resize': 'cursor-ew-resize',
  'ns-resize': 'cursor-ns-resize',
  'nesw-resize': 'cursor-nesw-resize',
  'nwse-resize': 'cursor-nwse-resize',
  'zoom-in': 'cursor-zoom-in',
  'zoom-out': 'cursor-zoom-out'
};

const USER_SELECT: Record<string, string> = {
  none: 'select-none',
  text: 'select-text',
  all: 'select-all',
  auto: 'select-auto'
};

const POINTER_EVENTS: Record<string, string> = {
  none: 'pointer-events-none',
  auto: 'pointer-events-auto'
};

const APPEARANCE: Record<string, string> = {
  none: 'appearance-none',
  auto: 'appearance-auto'
};

const RESIZE: Record<string, string> = {
  none: 'resize-none',
  both: 'resize',
  horizontal: 'resize-x',
  vertical: 'resize-y'
};

const SCROLL_BEHAVIOR: Record<string, string> = {
  auto: 'scroll-auto',
  smooth: 'scroll-smooth'
};

const TOUCH_ACTION: Record<string, string> = {
  auto: 'touch-auto',
  none: 'touch-none',
  'pan-x': 'touch-pan-x',
  'pan-left': 'touch-pan-left',
  'pan-right': 'touch-pan-right',
  'pan-y': 'touch-pan-y',
  'pan-up': 'touch-pan-up',
  'pan-down': 'touch-pan-down',
  'pinch-zoom': 'touch-pinch-zoom',
  manipulation: 'touch-manipulation'
};

const WILL_CHANGE: Record<string, string> = {
  auto: 'will-change-auto',
  scroll: 'will-change-scroll',
  contents: 'will-change-contents',
  transform: 'will-change-transform'
};

const COLOR_SCHEME: Record<string, string> = {
  normal: 'scheme-normal',
  light: 'scheme-light',
  dark: 'scheme-dark',
  'light dark': 'scheme-light-dark',
  'only light': 'scheme-only-light',
  'only dark': 'scheme-only-dark'
};

const FIELD_SIZING: Record<string, string> = {
  fixed: 'field-sizing-fixed',
  content: 'field-sizing-content'
};

const SCROLLBAR_WIDTH: Record<string, string> = {
  auto: 'scrollbar-auto',
  thin: 'scrollbar-thin',
  none: 'scrollbar-none'
};

const SCROLLBAR_GUTTER: Record<string, string> = {
  auto: 'scrollbar-gutter-auto',
  stable: 'scrollbar-gutter-stable',
  'stable both-edges': 'scrollbar-gutter-both'
};

const FORCED_COLOR_ADJUST: Record<string, string> = {
  auto: 'forced-color-adjust-auto',
  none: 'forced-color-adjust-none'
};

export const interactivityHandlers: HandlerTable = {
  cursor: decl => {
    const v = normalizeValue(decl.value);
    return CURSOR[v] ? [CURSOR[v]!] : [arbitrary('cursor', decl.value)];
  },
  'user-select': decl => {
    const v = normalizeValue(decl.value);
    return USER_SELECT[v] ? [USER_SELECT[v]!] : null;
  },
  'pointer-events': decl => {
    const v = normalizeValue(decl.value);
    return POINTER_EVENTS[v] ? [POINTER_EVENTS[v]!] : null;
  },
  appearance: decl => {
    const v = normalizeValue(decl.value);
    return APPEARANCE[v] ? [APPEARANCE[v]!] : null;
  },
  resize: decl => {
    const v = normalizeValue(decl.value);
    return RESIZE[v] ? [RESIZE[v]!] : null;
  },
  'scroll-behavior': decl => {
    const v = normalizeValue(decl.value);
    return SCROLL_BEHAVIOR[v] ? [SCROLL_BEHAVIOR[v]!] : null;
  },
  'touch-action': decl => {
    const v = normalizeValue(decl.value);
    return TOUCH_ACTION[v] ? [TOUCH_ACTION[v]!] : null;
  },
  'will-change': decl => {
    const v = normalizeValue(decl.value);
    return WILL_CHANGE[v]
      ? [WILL_CHANGE[v]!]
      : [arbitrary('will-change', decl.value)];
  },
  'color-scheme': decl => {
    const v = normalizeValue(decl.value);
    return COLOR_SCHEME[v]
      ? [COLOR_SCHEME[v]!]
      : [arbitrary('scheme', decl.value)];
  },
  'field-sizing': decl => {
    const v = normalizeValue(decl.value);
    return FIELD_SIZING[v] ? [FIELD_SIZING[v]!] : null;
  },
  'scrollbar-width': decl => {
    const v = normalizeValue(decl.value);
    return SCROLLBAR_WIDTH[v] ? [SCROLLBAR_WIDTH[v]!] : null;
  },
  'scrollbar-gutter': decl => {
    const v = normalizeValue(decl.value);
    return SCROLLBAR_GUTTER[v]
      ? [SCROLLBAR_GUTTER[v]!]
      : [arbitrary('scrollbar-gutter', decl.value)];
  },
  'forced-color-adjust': decl => {
    const v = normalizeValue(decl.value);
    return FORCED_COLOR_ADJUST[v] ? [FORCED_COLOR_ADJUST[v]!] : null;
  },
  'accent-color': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['accent-auto'];
    const direct = matchColor(theme, v);
    if (direct) return [`accent-${direct}`];
    return [arbitrary('accent', decl.value)];
  },
  'caret-color': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['caret-auto'];
    const direct = matchColor(theme, v);
    if (direct) return [`caret-${direct}`];
    return [arbitrary('caret', decl.value)];
  }
};
