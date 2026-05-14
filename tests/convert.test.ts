import { describe, expect, test } from 'vitest';
import { convertCSS } from '../src/index.ts';

function convert(css: string, opts = {}) {
  return convertCSS(css, opts);
}

describe('convertCSS – basics', () => {
  test('produces utilities for a simple block', async () => {
    const { classes } = await convert(`
      .card { display: flex; padding: 1rem; color: #fff; background-color: #000; }
    `);
    expect(classes).toEqual(
      expect.arrayContaining(['flex', 'p-4', 'text-white', 'bg-black'])
    );
  });

  test('emits @apply rule replacing original declarations', async () => {
    const { css } = await convert(`.x { display: block; padding: 0.5rem; }`);
    expect(css).toMatch(/@apply block p-2/);
    expect(css).not.toMatch(/display:\s*block/);
  });
});

describe('spacing conversion', () => {
  test('expands padding shorthand and lets reduction produce axis utilities', async () => {
    const { classes } = await convert(`.x { padding: 1rem 2rem; }`);
    expect(classes).toEqual(['py-4', 'px-8']);
  });

  test('expands three-value padding shorthand', async () => {
    const { classes } = await convert(`.x { padding: 1rem 2rem 3rem; }`);
    expect(classes).toEqual(['pt-4', 'px-8', 'pb-12']);
  });

  test('expands margin shorthand with auto values', async () => {
    const { classes } = await convert(`.x { margin: 0 auto; }`);
    expect(classes).toEqual(['my-0', 'mx-auto']);
  });

  test('matches px spacing values through remInPx by default', async () => {
    const { classes } = await convert(
      `.x { margin-top: 4px; padding-left: 8px; }`
    );
    expect(classes).toEqual(['mt-1', 'pl-2']);
  });

  test('can disable px/rem spacing normalization with remInPx: null', async () => {
    const { classes } = await convert(`.x { margin-top: 4px; }`, {
      remInPx: null
    });
    expect(classes).toEqual(['mt-[4px]']);
  });

  test('applies remInPx consistently to other spacing-backed utilities', async () => {
    const { classes } = await convert(
      `.x { top: 4px; width: 8px; gap: 4px; border-spacing: 4px 8px; }`
    );
    expect(classes).toEqual([
      'top-1',
      'w-2',
      'gap-1',
      'border-spacing-x-1',
      'border-spacing-y-2'
    ]);
  });

  test('can disable px/rem normalization outside margin and padding', async () => {
    const { classes } = await convert(
      `.x { top: 4px; width: 8px; gap: 4px; }`,
      {
        remInPx: null
      }
    );
    expect(classes).toEqual(['top-[4px]', 'w-[8px]', 'gap-[4px]']);
  });

  test('expands two-value gap shorthand into row and column utilities', async () => {
    const { classes } = await convert(`.x { gap: 1rem 2rem; }`);
    expect(classes).toEqual(['gap-y-4', 'gap-x-8']);
  });
});

describe('v4 renames and removals', () => {
  test('rounded uses v4-renamed scale (rounded-xs maps from 0.125rem)', async () => {
    const { classes } = await convert(`.x { border-radius: 0.125rem; }`);
    expect(classes).toContain('rounded-xs');
  });

  test('shadow uses v4-renamed scale (shadow-xs)', async () => {
    const { classes } = await convert(
      `.x { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }`
    );
    expect(classes).toContain('shadow-xs');
  });

  test('outline: none maps to outline-hidden', async () => {
    const { classes } = await convert(`.x { outline: none; }`);
    expect(classes).toEqual(['outline-hidden']);
  });

  test('emits slash opacity instead of removed bg-opacity utilities', async () => {
    const { classes } = await convert(
      `.x { background-color: rgb(0 0 0 / 0.5); }`
    );
    expect(classes[0]).toMatch(/^bg-(black|neutral-\d+)\/50$/);
  });

  test('uses paren CSS-var syntax for arbitrary values', async () => {
    const { classes } = await convert(`.x { background-color: var(--brand); }`);
    expect(classes).toEqual(['bg-(--brand)']);
  });
});

describe('variants from selectors and media', () => {
  test('hover pseudo → hover: prefix', async () => {
    const { classes, css } = await convert(`.btn:hover { color: #fff; }`);
    expect(classes).toEqual(['hover:text-white']);
    expect(css).toMatch(/\.btn\s*\{\s*@apply hover:text-white/);
    expect(css).not.toMatch(/\.btn:hover/);
  });

  test('@media min-width → responsive prefix from theme', async () => {
    const { classes, css } = await convert(`
      @media (min-width: 48rem) {
        .x { display: flex; }
      }
    `);
    expect(classes).toEqual(['md:flex']);
    expect(css).toMatch(/\.x\s*\{\s*@apply md:flex/);
    expect(css).not.toMatch(/@media/);
  });

  test('@media prefers-color-scheme: dark → dark:', async () => {
    const { classes } = await convert(`
      @media (prefers-color-scheme: dark) {
        .x { color: #fff; }
      }
    `);
    expect(classes).toEqual(['dark:text-white']);
  });

  test('important declarations append !', async () => {
    const { classes } = await convert(`.x { display: block !important; }`);
    expect(classes).toEqual(['block!']);
  });

  test('v4 prefix is emitted before variants', async () => {
    const { classes, css } = await convert(`.x:hover { display: flex; }`, {
      prefix: 'tw'
    });
    expect(classes).toEqual(['tw:hover:flex']);
    expect(css).toMatch(/@apply tw:hover:flex/);
  });
});

describe('@theme parsing', () => {
  test('uses user-defined colors', async () => {
    const themeCSS = `@theme { --color-brand-500: #ff0066; }`;
    const { classes } = await convert(`.x { color: #ff0066; }`, { themeCSS });
    expect(classes).toContain('text-brand-500');
  });

  test('user-defined --spacing rescales the spacing scale', async () => {
    const themeCSS = `@theme { --spacing: 0.5rem; }`;
    // With base 0.5rem, padding: 2rem → 4 steps → p-4
    const { classes } = await convert(`.x { padding: 2rem; }`, { themeCSS });
    expect(classes).toContain('p-4');
  });

  test('user-defined breakpoint creates responsive variant', async () => {
    const themeCSS = `@theme { --breakpoint-3xl: 120rem; }`;
    const { classes } = await convert(
      `@media (min-width: 120rem) { .x { display: flex; } }`,
      { themeCSS }
    );
    expect(classes).toEqual(['3xl:flex']);
  });

  test('global --*: initial reset removes default theme tokens', async () => {
    const themeCSS = `@theme { --*: initial; --color-brand: #000; }`;
    const { classes } = await convert(
      `.x { color: #fff; background-color: #000; }`,
      {
        themeCSS
      }
    );
    expect(classes).toEqual(['text-[#fff]', 'bg-brand']);
  });
});

describe('arbitrary properties fallback', () => {
  test('emits [prop:value] when no handler matches', async () => {
    const { classes } = await convert(`.x { mask-type: luminance; }`, {
      arbitraryProperties: true
    });
    expect(classes).toEqual(['[mask-type:luminance]']);
  });

  test('emits valid arbitrary property classes for font settings handlers', async () => {
    const { classes } = await convert(
      `.x { font-feature-settings: "tnum"; font-variation-settings: "wght" 700; }`
    );
    expect(classes).toEqual([
      '[font-feature-settings:"tnum"]',
      '[font-variation-settings:"wght"_700]'
    ]);
  });
});

describe('v4 OKLCH palette matching', () => {
  test('matches sRGB input to default OKLCH theme colors', async () => {
    const { classes } = await convert(`.x { color: #00a6f4; }`);
    expect(classes).toEqual(['text-sky-500']);
  });

  test('matches named CSS colors to theme tokens', async () => {
    const { classes } = await convert(`.x { color: white; }`);
    expect(classes).toEqual(['text-white']);
  });

  test('preserves alpha when matching OKLCH colors', async () => {
    const { classes } = await convert(
      `.x { color: oklch(0.685 0.169 237.323 / .5); }`
    );
    expect(classes).toEqual(['text-sky-500/50']);
  });
});

describe('numeric CSS value normalization', () => {
  test('handles percentage opacity values', async () => {
    const { classes } = await convert(`.x { opacity: 75%; }`);
    expect(classes).toEqual(['opacity-75']);
  });

  test('handles percentage scale values', async () => {
    const { classes } = await convert(`.x { scale: 105%; }`);
    expect(classes).toEqual(['scale-105']);
  });
});

describe('arbitrary property utilities', () => {
  test('emits valid arbitrary properties for animation timing declarations', async () => {
    const { classes } = await convert(
      `.x { animation-delay: var(--delay); animation-duration: 1s; }`
    );
    expect(classes).toEqual([
      '[animation-delay:var(--delay)]',
      '[animation-duration:1s]'
    ]);
  });
});

describe('low-risk Tailwind v4 utility additions', () => {
  test('converts tab-size utilities', async () => {
    const { classes } = await convert(`.x { tab-size: 4; }`);
    expect(classes).toEqual(['tab-4']);
  });

  test('converts font-stretch utilities', async () => {
    const { classes } = await convert(
      `.x { font-stretch: condensed; } .y { font-stretch: 125%; }`
    );
    expect(classes).toEqual(['font-stretch-condensed', 'font-stretch-125%']);
  });

  test('converts color-scheme and field-sizing utilities', async () => {
    const { classes } = await convert(
      `.x { color-scheme: light dark; field-sizing: content; }`
    );
    expect(classes).toEqual(['scheme-light-dark', 'field-sizing-content']);
  });

  test('converts scrollbar and forced-color-adjust utilities', async () => {
    const { classes } = await convert(
      `.x { scrollbar-width: thin; scrollbar-gutter: stable both-edges; forced-color-adjust: none; }`
    );
    expect(classes).toEqual([
      'scrollbar-thin',
      'scrollbar-gutter-both',
      'forced-color-adjust-none'
    ]);
  });

  test('converts transition behavior utilities', async () => {
    const { classes } = await convert(
      `.x { transition-behavior: allow-discrete; }`
    );
    expect(classes).toEqual(['transition-discrete']);
  });

  test('converts backface, perspective-origin, and zoom utilities', async () => {
    const { classes } = await convert(
      `.x { backface-visibility: hidden; perspective-origin: top left; zoom: 125%; }`
    );
    expect(classes).toEqual([
      'backface-hidden',
      'perspective-origin-top-left',
      'zoom-125'
    ]);
  });
});
