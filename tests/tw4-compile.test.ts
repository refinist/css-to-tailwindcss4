// Regression harness: every class this library emits must generate CSS
// when fed to the REAL Tailwind v4 compiler. Most historical bugs were
// classes that looked plausible but compiled to nothing (dead classes) or
// to a different property — string assertions alone cannot catch that.

import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { convertCSS } from '../src/index.ts';

// Theme+utilities only (no preflight) keeps compiles fast.
const TW_INPUT = `@import "tailwindcss/theme.css"; @import "tailwindcss/utilities.css";`;

async function createCompiler(input = TW_INPUT) {
  const { compile } = await import('@tailwindcss/node');
  const compiler = await compile(input, {
    base: path.resolve(import.meta.dirname, '..'),
    onDependency: () => {}
  });
  let previous = compiler.build([]);
  return {
    // Returns true when the class generated CSS. build() accumulates
    // candidates, so growth of the output means the class compiled.
    compiles(cls: string): boolean {
      const next = compiler.build([cls]);
      const grew = next !== previous;
      previous = next;
      return grew;
    },
    css(): string {
      return previous;
    }
  };
}

// Broad fixture exercising every conversion path that historically
// produced dead or wrong-property classes.
const FIXTURE = `
  .pipeline {
    padding: calc(1rem + 2px);
    margin: var(--m, 4px);
    font-weight: bold;
    font-weight: normal;
    background-image: linear-gradient(to right, #ef4444, #3b82f6);
    background-image: linear-gradient(to bottom, red, white, blue);
    background-size: 50% 100%;
    background-position: 25% 75%;
    max-height: 24rem;
    grid-column-start: -1;
    grid-column: -1;
    translate: -8px;
    scale: 1.05 0.95;
    scale: -1;
    rotate: 45.5deg;
    flex-grow: 1.5;
    flex-shrink: 0.5;
    border-spacing: 5px 7px;
    caret-color: auto;
    zoom: normal;
    zoom: 1.5;
    will-change: scroll-position;
    word-break: keep-all;
    border-radius: 50%;
    background-position: bottom left;
  }
  .vars {
    font-family: var(--font-brand);
    font-size: var(--fs);
    background-image: var(--img);
    text-decoration-thickness: var(--t);
    font-weight: var(--w);
    color: var(--c);
    background-color: var(--bgc);
  }
  .multi-axis {
    translate: 10px 20px;
    translate: none;
  }
  @media (min-width: 640px) {
    .px-breakpoint { display: flex; }
  }
  @container sidebar (min-width: 24rem) {
    .named-container { display: grid; }
  }
`;

// Typical Lanhu (design tool) export: flat classes, px everywhere,
// converted with remInPx: null + arbitraryProperties: true — the exact
// shape lanhu-context-mcp feeds in.
const LANHU_FIXTURE = `
  .box_1 {
    width: 375px;
    height: 44px;
    background-color: rgba(255, 255, 255, 1);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .text_2 {
    color: rgba(51, 51, 51, 1);
    font-size: 14px;
    font-family: PingFangSC-Regular;
    font-weight: normal;
    text-align: center;
    line-height: 20px;
    letter-spacing: 1px;
    margin: 10px 0 0 12px;
    border-radius: 8px;
    background-image: linear-gradient(to right, #ff6034, #ee0a24);
  }
`;

describe('real Tailwind v4 compile regression', () => {
  test('every emitted class compiles to CSS', async () => {
    const result = await convertCSS(FIXTURE, { arbitraryProperties: true });
    const lanhu = await convertCSS(LANHU_FIXTURE, {
      remInPx: null,
      arbitraryProperties: true
    });

    const all = [...new Set([...result.classes, ...lanhu.classes])];
    expect(all.length).toBeGreaterThan(30);

    const compiler = await createCompiler();
    const dead = all.filter(cls => !compiler.compiles(cls));
    expect(dead).toEqual([]);
  }, 60_000);

  test('notorious conversions land on the right property', async () => {
    const { classes } = await convertCSS(FIXTURE, {
      arbitraryProperties: true
    });

    // font-weight keywords must NOT become font-family classes.
    expect(classes).toContain('font-bold');
    expect(classes).toContain('font-normal');
    // gradient stops must ride along with the direction class.
    expect(classes).toEqual(
      expect.arrayContaining([
        'bg-linear-to-r',
        // #ef4444 is the v3 hex; it differs from v4's OKLCH red-500, so
        // the arbitrary form is the faithful conversion here.
        'from-[#ef4444]',
        'to-[#3b82f6]',
        'bg-linear-to-b',
        'from-[red]',
        'via-white',
        'to-[blue]'
      ])
    );
    // negative grid lines / translate use the leading-dash form.
    expect(classes).toContain('-col-start-1');
    expect(classes).toContain('-col-1');
    expect(classes).toContain('-translate-x-2');
    // per-axis expansion instead of broken combined arbitraries.
    expect(classes).toEqual(
      expect.arrayContaining([
        'scale-x-105',
        'scale-y-95',
        '-scale-100',
        'translate-x-2.5',
        'translate-y-5',
        'translate-none',
        'border-spacing-x-[5px]',
        'border-spacing-y-[7px]'
      ])
    );
    // container-scale must not leak into heights.
    expect(classes).toContain('max-h-96');
    // typed var() shorthands.
    expect(classes).toEqual(
      expect.arrayContaining([
        'font-(family-name:--font-brand)',
        'text-(length:--fs)',
        'bg-(image:--img)',
        'decoration-(length:--t)',
        'font-(--w)',
        'text-(--c)',
        'bg-(--bgc)'
      ])
    );
    // px media queries map onto the rem-based default breakpoints.
    expect(classes).toContain('sm:flex');
    // named containers keep their name.
    expect(classes).toContain('@sm/sidebar:grid');
    // background-size stays background-size; v4.1 position names.
    expect(classes).toContain('bg-size-[50%_100%]');
    expect(classes).toContain('bg-bottom-left');
  });

  test('prefixed output compiles under prefix(tw)', async () => {
    const { classes } = await convertCSS(
      `.x { display: flex; mask-type: luminance; }`,
      { prefix: 'tw', arbitraryProperties: true }
    );
    expect(classes).toEqual(['tw:flex', 'tw:[mask-type:luminance]']);

    const compiler = await createCompiler(
      `@import "tailwindcss/theme.css" prefix(tw); @import "tailwindcss/utilities.css";`
    );
    for (const cls of classes) {
      expect(compiler.compiles(cls), `${cls} should compile`).toBe(true);
    }
  }, 60_000);
});
