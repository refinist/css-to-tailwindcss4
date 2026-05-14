import type { ConvertOptions } from '../types.ts';

export function remInPx(options: ConvertOptions): number | null {
  return options.remInPx === undefined ? 16 : options.remInPx;
}

export function arbitraryProperty(prop: string, value: string): string {
  const escaped = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/_/g, '\\_')
    .replace(/\s+/g, '_');
  return `[${prop}:${escaped}]`;
}
