// Dispatch a single CSS declaration to a per-property converter. Returns
// `null` (not `[]`) to mean "no handler", so the caller can decide between
// arbitrary-property fallback and dropping the decl.

import { normalizeValue } from '../theme/lookup.ts';

import { backgroundHandlers } from './background.ts';
import { borderHandlers } from './border.ts';
import { boxHandlers } from './box.ts';
import { breakHandlers } from './breaks.ts';
import { effectsHandlers } from './effects.ts';
import { flexHandlers } from './flex.ts';
import { gridHandlers } from './grid.ts';
import { interactivityHandlers } from './interactivity.ts';
import { layoutHandlers } from './layout.ts';
import { scrollSnapHandlers } from './scroll-snap.ts';
import { sizingHandlers } from './sizing.ts';
import { spacingHandlers } from './spacing.ts';
import { svgHandlers } from './svg.ts';
import { tableHandlers } from './tables.ts';
import { transformHandlers } from './transforms.ts';
import { transitionHandlers } from './transitions.ts';
import { typographyHandlers } from './typography.ts';
import type { ConvertOptions, Theme } from '../types.ts';
import type { Declaration } from 'postcss';

export type Handler = (
  decl: Declaration,
  theme: Theme,
  options: ConvertOptions
) => string[] | null;
export type HandlerTable = Record<string, Handler>;

const TABLES: HandlerTable[] = [
  layoutHandlers,
  boxHandlers,
  flexHandlers,
  gridHandlers,
  spacingHandlers,
  sizingHandlers,
  typographyHandlers,
  backgroundHandlers,
  borderHandlers,
  effectsHandlers,
  transitionHandlers,
  transformHandlers,
  interactivityHandlers,
  svgHandlers,
  tableHandlers,
  breakHandlers,
  scrollSnapHandlers
];

const HANDLERS: HandlerTable = Object.assign({}, ...TABLES);

export function dispatch(
  decl: Declaration,
  theme: Theme,
  options: ConvertOptions = {}
): string[] | null {
  const handler = HANDLERS[decl.prop];
  if (!handler) return null;
  const result = handler(decl, theme, options);
  if (!result || result.length === 0) return null;
  return result;
}

// Used when `arbitraryProperties: true` and no handler matched.
export function arbitraryProperty(decl: Declaration): string | null {
  const value = normalizeValue(decl.value);
  if (!value) return null;
  // `[mask-type:luminance]` style, with underscores for spaces.
  const escaped = value.replace(/_/g, '\\_').replace(/\s+/g, '_');
  return `[${decl.prop}:${escaped}]`;
}
