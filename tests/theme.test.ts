import { describe, expect, test } from 'vitest';
import { defaultTheme, parseTheme } from '../src/index.ts';

describe('parseTheme', () => {
  test('falls back to default theme when no input is given', () => {
    const t = parseTheme(undefined);
    expect(t.color.white).toBe('#fff');
    expect(t.spacing['4']).toBe('1rem');
  });

  test('merges user @theme tokens with defaults', () => {
    const t = parseTheme(
      `@theme { --color-mint-500: #0fa; --font-display: Inter; }`
    );
    expect(t.color['mint-500']).toBe('#0fa');
    expect(t.font.display).toBe('Inter');
    expect(t.color.black).toBe('#000'); // default preserved
  });

  test('initial keyword deletes a token', () => {
    const t = parseTheme(`@theme { --color-black: initial; }`);
    expect(t.color.black).toBeUndefined();
  });

  test('defaultTheme exposes v4-spec scales', () => {
    const t = defaultTheme();
    expect(t.text.xs).toBe('0.75rem');
    expect(t.radius.xs).toBe('0.125rem');
    expect(t.shadow.xs).toBe('0 1px 2px 0 rgb(0 0 0 / 0.05)');
  });
});
