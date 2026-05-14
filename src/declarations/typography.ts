// color, font-*, text-*, line-height, letter-spacing, list-*, text-decoration,
// text-transform, white-space, word-break, hyphens.

import {
  arbitrary,
  formatColorToken,
  matchColor,
  matchColorWithAlpha,
  matchInNamespace,
  matchSpacing,
  normalizeValue
} from '../theme/lookup.ts';
import { arbitraryProperty, remInPx } from '../utils/options.ts';
import type { ConvertOptions } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';

const TEXT_ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
  start: 'text-start',
  end: 'text-end'
};

const TEXT_TRANSFORM: Record<string, string> = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  none: 'normal-case'
};

const WHITE_SPACE: Record<string, string> = {
  normal: 'whitespace-normal',
  nowrap: 'whitespace-nowrap',
  pre: 'whitespace-pre',
  'pre-line': 'whitespace-pre-line',
  'pre-wrap': 'whitespace-pre-wrap',
  'break-spaces': 'whitespace-break-spaces'
};

const WORD_BREAK: Record<string, string> = {
  normal: 'break-normal',
  'break-all': 'break-all',
  keep: 'break-keep',
  'break-word': 'break-words'
};

const TEXT_OVERFLOW: Record<string, string> = {
  ellipsis: 'text-ellipsis',
  clip: 'text-clip'
};

const FONT_STYLE: Record<string, string> = {
  italic: 'italic',
  normal: 'not-italic',
  oblique: 'italic'
};

const FONT_VARIANT_NUMERIC: Record<string, string> = {
  normal: 'normal-nums',
  ordinal: 'ordinal',
  'slashed-zero': 'slashed-zero',
  'lining-nums': 'lining-nums',
  'oldstyle-nums': 'oldstyle-nums',
  'proportional-nums': 'proportional-nums',
  'tabular-nums': 'tabular-nums',
  'diagonal-fractions': 'diagonal-fractions',
  'stacked-fractions': 'stacked-fractions'
};

const TEXT_DECORATION_STYLE: Record<string, string> = {
  solid: 'decoration-solid',
  double: 'decoration-double',
  dotted: 'decoration-dotted',
  dashed: 'decoration-dashed',
  wavy: 'decoration-wavy'
};

const LIST_STYLE_POSITION: Record<string, string> = {
  inside: 'list-inside',
  outside: 'list-outside'
};

const FONT_STRETCH: Record<string, string> = {
  'ultra-condensed': 'font-stretch-ultra-condensed',
  'extra-condensed': 'font-stretch-extra-condensed',
  condensed: 'font-stretch-condensed',
  'semi-condensed': 'font-stretch-semi-condensed',
  normal: 'font-stretch-normal',
  'semi-expanded': 'font-stretch-semi-expanded',
  expanded: 'font-stretch-expanded',
  'extra-expanded': 'font-stretch-extra-expanded',
  'ultra-expanded': 'font-stretch-ultra-expanded'
};

function colorClass(
  prefix: string,
  value: string,
  theme: import('../types.ts').Theme
): string[] {
  const v = normalizeValue(value);
  if (v === 'currentColor' || v === 'currentcolor')
    return [`${prefix}-current`];
  if (v === 'transparent') return [`${prefix}-transparent`];
  if (v === 'inherit') return [`${prefix}-inherit`];
  const direct = matchColor(theme, v);
  if (direct) return [`${prefix}-${direct}`];
  const withAlpha = matchColorWithAlpha(theme, v);
  if (withAlpha) {
    return [formatColorToken(prefix, withAlpha)];
  }
  return [arbitrary(prefix, value)];
}

function fontFamilyToken(
  value: string,
  theme: import('../types.ts').Theme
): string | null {
  const v = normalizeValue(value);
  const direct = theme.reverse.font.get(v);
  if (direct) return direct;

  const comparable = v.replace(/'/g, '"');
  for (const [token, themeValue] of Object.entries(theme.font)) {
    if (normalizeValue(themeValue).replace(/'/g, '"') === comparable) {
      return token;
    }
  }
  return null;
}

export const typographyHandlers: HandlerTable = {
  color: (decl, theme) => colorClass('text', decl.value, theme),

  'font-family': (decl, theme) => {
    const token = fontFamilyToken(decl.value, theme);
    if (token) return [`font-${token}`];
    return [arbitrary('font', decl.value)];
  },

  'font-size': (decl, theme) => {
    const v = normalizeValue(decl.value);
    const token = matchInNamespace(theme.reverse.text, v);
    if (token) return [`text-${token}`];
    return [arbitrary('text', decl.value)];
  },

  'font-weight': (decl, theme) => {
    const v = normalizeValue(decl.value);
    const token = matchInNamespace(theme.reverse.fontWeight, v);
    if (token) return [`font-${token}`];
    if (/^\d+$/.test(v)) return [`font-[${v}]`];
    return [arbitrary('font', decl.value)];
  },

  'font-style': decl => {
    const v = normalizeValue(decl.value);
    return FONT_STYLE[v] ? [FONT_STYLE[v]!] : null;
  },

  'font-stretch': decl => {
    const v = normalizeValue(decl.value);
    if (FONT_STRETCH[v]) return [FONT_STRETCH[v]!];
    if (/^\d+(?:\.\d+)?%$/.test(v)) return [`font-stretch-${v}`];
    return [arbitrary('font-stretch', decl.value)];
  },

  'font-variant-numeric': decl => {
    const v = normalizeValue(decl.value);
    return FONT_VARIANT_NUMERIC[v] ? [FONT_VARIANT_NUMERIC[v]!] : null;
  },

  'line-height': (decl, theme) => {
    const v = normalizeValue(decl.value);
    const token = matchInNamespace(theme.reverse.leading, v);
    if (token) return [`leading-${token}`];
    if (/^[\d.]+$/.test(v)) return [`leading-[${v}]`];
    return [arbitrary('leading', decl.value)];
  },

  'letter-spacing': (decl, theme) => {
    const v = normalizeValue(decl.value);
    const token = matchInNamespace(theme.reverse.tracking, v);
    if (token) return [`tracking-${token}`];
    if (v.startsWith('-')) return [`-tracking-[${v.slice(1)}]`];
    return [arbitrary('tracking', decl.value)];
  },

  'text-align': decl => {
    const v = normalizeValue(decl.value);
    return TEXT_ALIGN[v] ? [TEXT_ALIGN[v]!] : null;
  },

  'text-transform': decl => {
    const v = normalizeValue(decl.value);
    return TEXT_TRANSFORM[v] ? [TEXT_TRANSFORM[v]!] : null;
  },

  'text-decoration-line': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      underline: 'underline',
      overline: 'overline',
      'line-through': 'line-through',
      none: 'no-underline'
    };
    return map[v] ? [map[v]!] : null;
  },

  'text-decoration': decl => {
    // Shorthand: if it's just one of the line keywords, treat as line.
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      underline: 'underline',
      overline: 'overline',
      'line-through': 'line-through',
      none: 'no-underline'
    };
    return map[v] ? [map[v]!] : null;
  },

  'text-decoration-style': decl => {
    const v = normalizeValue(decl.value);
    return TEXT_DECORATION_STYLE[v] ? [TEXT_DECORATION_STYLE[v]!] : null;
  },

  'text-decoration-color': (decl, theme) =>
    colorClass('decoration', decl.value, theme),

  'text-decoration-thickness': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['decoration-auto'];
    if (v === 'from-font') return ['decoration-from-font'];
    const px = v.match(/^(\d+)px$/);
    if (px) return [`decoration-${px[1]}`];
    return [arbitrary('decoration', decl.value)];
  },

  'text-overflow': decl => {
    const v = normalizeValue(decl.value);
    return TEXT_OVERFLOW[v] ? [TEXT_OVERFLOW[v]!] : null;
  },

  'text-indent': (decl, theme, options: ConvertOptions) => {
    const v = normalizeValue(decl.value);
    const negative = v.startsWith('-');
    const abs = negative ? v.slice(1) : v;
    const token = matchSpacing(theme, abs, remInPx(options));
    if (token) return [`${negative ? '-' : ''}indent-${token}`];
    return [arbitrary('indent', decl.value)];
  },

  'vertical-align': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      baseline: 'align-baseline',
      top: 'align-top',
      middle: 'align-middle',
      bottom: 'align-bottom',
      'text-top': 'align-text-top',
      'text-bottom': 'align-text-bottom',
      sub: 'align-sub',
      super: 'align-super'
    };
    return map[v] ? [map[v]!] : [arbitrary('align', decl.value)];
  },

  'white-space': decl => {
    const v = normalizeValue(decl.value);
    return WHITE_SPACE[v] ? [WHITE_SPACE[v]!] : null;
  },

  'word-break': decl => {
    const v = normalizeValue(decl.value);
    return WORD_BREAK[v] ? [WORD_BREAK[v]!] : null;
  },

  'overflow-wrap': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'normal') return ['wrap-normal'];
    if (v === 'break-word') return ['wrap-break-word'];
    if (v === 'anywhere') return ['wrap-anywhere'];
    return null;
  },

  hyphens: decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      none: 'hyphens-none',
      manual: 'hyphens-manual',
      auto: 'hyphens-auto'
    };
    return map[v] ? [map[v]!] : null;
  },

  'list-style-type': decl => {
    const v = normalizeValue(decl.value);
    const map: Record<string, string> = {
      none: 'list-none',
      disc: 'list-disc',
      decimal: 'list-decimal'
    };
    return map[v] ? [map[v]!] : [arbitrary('list', decl.value)];
  },

  'list-style-position': decl => {
    const v = normalizeValue(decl.value);
    return LIST_STYLE_POSITION[v] ? [LIST_STYLE_POSITION[v]!] : null;
  },

  'list-style-image': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['list-image-none'];
    return [arbitrary('list-image', decl.value)];
  },

  '-webkit-font-smoothing': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'antialiased') return ['antialiased'];
    if (v === 'auto' || v === 'subpixel-antialiased')
      return ['subpixel-antialiased'];
    return null;
  },
  '-moz-osx-font-smoothing': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'grayscale') return ['antialiased'];
    if (v === 'auto') return ['subpixel-antialiased'];
    return null;
  },

  'font-feature-settings': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'normal') return ['normal-nums'];
    return [arbitraryProperty('font-feature-settings', decl.value)];
  },
  'font-variation-settings': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'normal') return null;
    return [arbitraryProperty('font-variation-settings', decl.value)];
  },

  'tab-size': decl => {
    const v = normalizeValue(decl.value);
    if (/^\d+$/.test(v)) return [`tab-${v}`];
    return [arbitrary('tab', decl.value)];
  },

  'text-underline-offset': decl => {
    const v = normalizeValue(decl.value);
    if (v === 'auto') return ['underline-offset-auto'];
    const px = v.match(/^(\d+)px$/);
    if (px) return [`underline-offset-${px[1]}`];
    return [arbitrary('underline-offset', decl.value)];
  },

  content: decl => {
    const v = normalizeValue(decl.value);
    if (v === 'none') return ['content-none'];
    return [arbitrary('content', decl.value)];
  }
};
