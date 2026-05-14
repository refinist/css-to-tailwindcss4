// box-shadow / opacity / mix-blend-mode / filter / backdrop-filter.

import {
  arbitrary,
  matchInNamespace,
  normalizeValue
} from '../theme/lookup.ts';
import type { HandlerTable } from './dispatch.ts';

const MIX_BLEND: Record<string, string> = {
  normal: 'mix-blend-normal',
  multiply: 'mix-blend-multiply',
  screen: 'mix-blend-screen',
  overlay: 'mix-blend-overlay',
  darken: 'mix-blend-darken',
  lighten: 'mix-blend-lighten',
  'color-dodge': 'mix-blend-color-dodge',
  'color-burn': 'mix-blend-color-burn',
  'hard-light': 'mix-blend-hard-light',
  'soft-light': 'mix-blend-soft-light',
  difference: 'mix-blend-difference',
  exclusion: 'mix-blend-exclusion',
  hue: 'mix-blend-hue',
  saturation: 'mix-blend-saturation',
  color: 'mix-blend-color',
  luminosity: 'mix-blend-luminosity',
  'plus-darker': 'mix-blend-plus-darker',
  'plus-lighter': 'mix-blend-plus-lighter'
};

const BG_BLEND: Record<string, string> = Object.fromEntries(
  Object.entries(MIX_BLEND).map(([k, v]) => [
    k,
    v.replace('mix-blend-', 'bg-blend-')
  ])
);

export const effectsHandlers: HandlerTable = {
  'box-shadow': (decl, theme) => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['shadow-none'];
    const token = matchInNamespace(theme.reverse.shadow, v);
    if (token) return [`shadow-${token}`];
    const inset = matchInNamespace(theme.reverse.insetShadow, v);
    if (inset) return [`inset-shadow-${inset}`];
    return [arbitrary('shadow', decl.value)];
  },

  opacity: decl => {
    const v = normalizeValue(decl.value);
    if (v.endsWith('%')) {
      const pct = parseFloat(v);
      if (Number.isFinite(pct)) return [`opacity-${Math.round(pct)}`];
    }
    const n = parseFloat(v);
    if (Number.isFinite(n)) {
      const pct = Math.round(n * 100);
      return [`opacity-${pct}`];
    }
    return [arbitrary('opacity', decl.value)];
  },

  'mix-blend-mode': decl => {
    const v = normalizeValue(decl.value);
    return MIX_BLEND[v] ? [MIX_BLEND[v]!] : null;
  },

  'background-blend-mode': decl => {
    const v = normalizeValue(decl.value);
    return BG_BLEND[v] ? [BG_BLEND[v]!] : null;
  },

  filter: decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['filter-none'];
    return [arbitrary('filter', decl.value)];
  },

  'backdrop-filter': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['backdrop-filter-none'];
    return [arbitrary('backdrop-filter', decl.value)];
  }
};
