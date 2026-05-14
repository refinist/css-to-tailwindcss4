// transition-* / animation.

import {
  arbitrary,
  matchInNamespace,
  normalizeValue
} from '../theme/lookup.ts';
import { arbitraryProperty } from '../utils/options.ts';
import type { HandlerTable } from './dispatch.ts';

const TRANSITION_PROPERTY: Record<string, string> = {
  none: 'transition-none',
  all: 'transition-all',
  'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform':
    'transition',
  'color, background-color, border-color, text-decoration-color, fill, stroke':
    'transition-colors',
  opacity: 'transition-opacity',
  'box-shadow': 'transition-shadow',
  transform: 'transition-transform'
};

export const transitionHandlers: HandlerTable = {
  'transition-property': decl => {
    const v = normalizeValue(decl.value);
    return TRANSITION_PROPERTY[v]
      ? [TRANSITION_PROPERTY[v]!]
      : [arbitrary('transition', decl.value)];
  },

  'transition-duration': decl => {
    const v = normalizeValue(decl.value);
    const ms = v.match(/^(\d+)ms$/);
    if (ms) return [`duration-${ms[1]}`];
    const s = v.match(/^(\d+(?:\.\d+)?)s$/);
    if (s) return [`duration-${Math.round(parseFloat(s[1]!) * 1000)}`];
    return [arbitrary('duration', decl.value)];
  },

  'transition-delay': decl => {
    const v = normalizeValue(decl.value);
    const ms = v.match(/^(\d+)ms$/);
    if (ms) return [`delay-${ms[1]}`];
    const s = v.match(/^(\d+(?:\.\d+)?)s$/);
    if (s) return [`delay-${Math.round(parseFloat(s[1]!) * 1000)}`];
    return [arbitrary('delay', decl.value)];
  },

  'transition-timing-function': (decl, theme) => {
    const v = normalizeValue(decl.value);
    const token = matchInNamespace(theme.reverse.ease, v);
    if (token) return [`ease-${token}`];
    return [arbitrary('ease', decl.value)];
  },

  'transition-behavior': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'normal') return ['transition-normal'];
    if (v === 'allow-discrete') return ['transition-discrete'];
    return null;
  },

  transition: decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['transition-none'];
    if (v === 'all') return ['transition-all'];
    // Bare `transition: all 0.15s ease-in-out` style: leave to power users.
    return null;
  },

  animation: (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['animate-none'];
    const token = matchInNamespace(theme.reverse.animate, v);
    if (token) return [`animate-${token}`];
    return [arbitrary('animate', decl.value)];
  },

  'animation-delay': decl => {
    const v = normalizeValue(decl.value);
    const ms = v.match(/^(\d+)ms$/);
    if (ms) return [`[animation-delay:${ms[0]}]`];
    const s = v.match(/^(\d+(?:\.\d+)?)s$/);
    if (s) return [`[animation-delay:${s[0]}]`];
    return [arbitraryProperty('animation-delay', decl.value)];
  },

  'animation-duration': decl => [
    arbitraryProperty('animation-duration', decl.value)
  ],
  'animation-name': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['animate-none'];
    const token = matchInNamespace(theme.reverse.animate, v);
    if (token) return [`animate-${token}`];
    return null;
  }
};
