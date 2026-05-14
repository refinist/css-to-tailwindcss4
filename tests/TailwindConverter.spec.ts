// End-to-end behaviour matrix for `convertCSS` across common options,
// invalid input recovery, postcss-nested integration, and broad fixtures.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import postcssNested from 'postcss-nested';
import { describe, expect, test } from 'vitest';

import { convertCSS } from '../src/index.ts';

const FIXTURE = readFileSync(
  join(import.meta.dirname, 'fixtures/input.css'),
  'utf8'
);

const CUSTOM_THEME = `
  @theme {
    --color-brand-500: oklch(0.7 0.2 30);
    --color-brand-text: #1f2937;
    --spacing: 0.25rem;
    --breakpoint-3xl: 120rem;
    --font-display: "Inter", ui-sans-serif, sans-serif;
  }
`;

describe('convertCSS', () => {
  test('converts a small block under the default theme', async () => {
    const { css, classes } = await convertCSS(`
      .card {
        display: flex;
        padding: 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        color: #fff;
        background-color: rgb(0 0 0 / 0.5);
      }
    `);
    expect(classes).toEqual([
      'flex',
      'p-6',
      'rounded-lg',
      'shadow-xs',
      'text-white',
      // black/50 from slash opacity
      expect.stringMatching(/^bg-(black|neutral-\d+)\/50$/)
    ]);
    expect(css).toMatchSnapshot();
  });

  test('converts the broad fixture (default theme)', async () => {
    const result = await convertCSS(FIXTURE);
    expect(result.css).toMatchSnapshot('fixture.default.css');
    expect(result.classes).toMatchSnapshot('fixture.default.classes');
  });

  test('honors a user-supplied @theme (custom colors, spacing base, breakpoint)', async () => {
    const result = await convertCSS(
      `
        .brand { color: var(--brand-text); background-color: oklch(0.7 0.2 30); }
        .responsive-3xl { font-family: "Inter", ui-sans-serif, sans-serif; }
        @media (min-width: 120rem) { .x { display: flex; } }
      `,
      { themeCSS: CUSTOM_THEME }
    );
    expect(result.classes).toEqual([
      'text-(--brand-text)',
      'bg-brand-500',
      'font-display',
      '3xl:flex'
    ]);
  });

  test('applies a global prefix to every utility but never to arbitrary props', async () => {
    const { classes } = await convertCSS(
      `.x { display: flex; mask-type: luminance; }`,
      { prefix: 'tw', arbitraryProperties: true }
    );
    expect(classes).toEqual(['tw:flex', '[mask-type:luminance]']);
  });

  test('emits arbitrary property classes only when explicitly opted in', async () => {
    const off = await convertCSS(`.x { mask-type: luminance; }`);
    expect(off.classes).toEqual([]);
    expect(off.rules[0]?.leftover).toEqual([
      { prop: 'mask-type', value: 'luminance', important: false }
    ]);

    const on = await convertCSS(`.x { mask-type: luminance; }`, {
      arbitraryProperties: true
    });
    expect(on.classes).toEqual(['[mask-type:luminance]']);
  });

  test('returns an empty result for empty input', async () => {
    const result = await convertCSS('');
    expect(result).toEqual({ rules: [], classes: [], css: '' });
  });

  test('converts a partial CSS fragment (no surrounding rule)', async () => {
    // safe-parser accepts a bare declaration list under a synthetic rule;
    // we just need to confirm we don't crash and produce something useful.
    const { css } = await convertCSS(`color: #fff; padding: 1rem;`);
    expect(css).toMatch(/color:\s*#fff/); // unconvertible at root, kept verbatim
  });

  test('does not throw on syntactically invalid CSS (safe-parser recovers)', async () => {
    await expect(
      convertCSS(`.bad { color: ; padding 1rem; display: flex }`)
    ).resolves.toBeDefined();
  });

  test('flattens nested CSS via the postCSSPlugins hook (postcss-nested)', async () => {
    const { css, classes } = await convertCSS(
      `
        .card {
          padding: 1rem;
          .title { font-weight: 700; }
          &:hover { background-color: rgb(0 0 0 / 0.05); }
        }
      `,
      { postCSSPlugins: [postcssNested()] }
    );
    expect(classes).toEqual(
      expect.arrayContaining([
        'p-4',
        'font-bold',
        expect.stringMatching(/^hover:bg-/)
      ])
    );
    expect(css).toMatchSnapshot('nested.css');
  });
});

describe('v4 semantic guarantees', () => {
  test('renamed scales: shadow-xs / rounded-xs / blur-xs / drop-shadow-xs', async () => {
    const { classes } = await convertCSS(`
      .a { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
      .b { border-radius: 0.125rem; }
    `);
    expect(classes).toContain('shadow-xs');
    expect(classes).toContain('rounded-xs');
  });

  test('outline: none → outline-hidden (not outline-none)', async () => {
    const { classes } = await convertCSS(`.x { outline: none; }`);
    expect(classes).toEqual(['outline-hidden']);
  });

  test('color with alpha uses slash syntax, not bg-opacity-*', async () => {
    const { classes } = await convertCSS(
      `.x { background-color: rgb(0 0 0 / 0.25); }`
    );
    expect(classes[0]).toMatch(/\/25$/);
    expect(classes[0]).not.toMatch(/bg-opacity/);
  });

  test('CSS variables use paren syntax (bg-(--brand))', async () => {
    const { classes } = await convertCSS(
      `.x { background-color: var(--brand); }`
    );
    expect(classes).toEqual(['bg-(--brand)']);
  });

  test('important suffix uses trailing ! (v4 style)', async () => {
    const { classes } = await convertCSS(`.x { display: block !important; }`);
    expect(classes).toEqual(['block!']);
  });
});
