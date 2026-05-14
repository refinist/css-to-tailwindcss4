// padding-*, margin-*, scroll-margin-*, scroll-padding-*.

import { arbitrary, matchSpacing, normalizeValue } from '../theme/lookup.ts';
import { remInPx } from '../utils/options.ts';
import type { ConvertOptions, Theme } from '../types.ts';
import type { HandlerTable } from './dispatch.ts';
import type { Declaration } from 'postcss';

function spacing(
  decl: Declaration,
  theme: Theme,
  options: ConvertOptions,
  prefix: string,
  allowNegative = false
): string[] {
  return spacingValue(decl.value, theme, options, prefix, allowNegative);
}

function spacingValue(
  value: string,
  theme: Theme,
  options: ConvertOptions,
  prefix: string,
  allowNegative = false
): string[] {
  const v = normalizeValue(value);
  if (v === 'auto') return [`${prefix}-auto`];
  const negative = allowNegative && v.startsWith('-');
  const abs = negative ? v.slice(1) : v;
  const token = matchSpacing(theme, abs, remInPx(options));
  if (token) return [`${negative ? '-' : ''}${prefix}-${token}`];
  return [arbitrary(prefix, value)];
}

function composedSpacing(
  decl: Declaration,
  theme: Theme,
  options: ConvertOptions,
  prefixes: [string, string, string, string],
  fallbackPrefix: string,
  allowNegative = false
): string[] {
  const parts = normalizeValue(decl.value).split(/\s+/);
  if (parts.length < 1 || parts.length > 4)
    return [arbitrary(fallbackPrefix, decl.value)];

  const values: [string, string, string, string] = [
    parts[0]!,
    parts[1] ?? parts[0]!,
    parts[2] ?? parts[0]!,
    parts[3] ?? parts[1] ?? parts[0]!
  ];

  return values.flatMap((value, index) =>
    spacingValue(value, theme, options, prefixes[index]!, allowNegative)
  );
}

export const spacingHandlers: HandlerTable = {
  padding: (decl, theme, options) =>
    composedSpacing(decl, theme, options, ['pt', 'pr', 'pb', 'pl'], 'p'),
  'padding-top': (decl, theme, options) => spacing(decl, theme, options, 'pt'),
  'padding-right': (decl, theme, options) =>
    spacing(decl, theme, options, 'pr'),
  'padding-bottom': (decl, theme, options) =>
    spacing(decl, theme, options, 'pb'),
  'padding-left': (decl, theme, options) => spacing(decl, theme, options, 'pl'),
  'padding-inline': (decl, theme, options) =>
    spacing(decl, theme, options, 'px'),
  'padding-block': (decl, theme, options) =>
    spacing(decl, theme, options, 'py'),
  'padding-inline-start': (decl, theme, options) =>
    spacing(decl, theme, options, 'ps'),
  'padding-inline-end': (decl, theme, options) =>
    spacing(decl, theme, options, 'pe'),

  margin: (decl, theme, options) =>
    composedSpacing(decl, theme, options, ['mt', 'mr', 'mb', 'ml'], 'm', true),
  'margin-top': (decl, theme, options) =>
    spacing(decl, theme, options, 'mt', true),
  'margin-right': (decl, theme, options) =>
    spacing(decl, theme, options, 'mr', true),
  'margin-bottom': (decl, theme, options) =>
    spacing(decl, theme, options, 'mb', true),
  'margin-left': (decl, theme, options) =>
    spacing(decl, theme, options, 'ml', true),
  'margin-inline': (decl, theme, options) =>
    spacing(decl, theme, options, 'mx', true),
  'margin-block': (decl, theme, options) =>
    spacing(decl, theme, options, 'my', true),
  'margin-inline-start': (decl, theme, options) =>
    spacing(decl, theme, options, 'ms', true),
  'margin-inline-end': (decl, theme, options) =>
    spacing(decl, theme, options, 'me', true),

  'scroll-margin': (decl, theme, options) =>
    composedSpacing(
      decl,
      theme,
      options,
      ['scroll-mt', 'scroll-mr', 'scroll-mb', 'scroll-ml'],
      'scroll-m',
      true
    ),
  'scroll-margin-top': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-mt', true),
  'scroll-margin-right': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-mr', true),
  'scroll-margin-bottom': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-mb', true),
  'scroll-margin-left': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-ml', true),
  'scroll-padding': (decl, theme, options) =>
    composedSpacing(
      decl,
      theme,
      options,
      ['scroll-pt', 'scroll-pr', 'scroll-pb', 'scroll-pl'],
      'scroll-p'
    ),
  'scroll-padding-top': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-pt'),
  'scroll-padding-right': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-pr'),
  'scroll-padding-bottom': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-pb'),
  'scroll-padding-left': (decl, theme, options) =>
    spacing(decl, theme, options, 'scroll-pl')
};
