import { describe, expect, test } from 'vitest';

import { convertCSS, parseTheme } from '../src/index.ts';
import { buildSpacingNamespace } from '../src/theme/defaults.ts';
import {
  arbitrary,
  formatColorToken,
  matchColor,
  matchColorWithAlpha,
  matchSpacing
} from '../src/theme/lookup.ts';
import { selectorToVariants } from '../src/utils/selector.ts';
import {
  asCssVarReference,
  isDynamicExpression,
  joinForArbitrary,
  splitTopLevel,
  trimNumber
} from '../src/utils/values.ts';
import {
  containerParamsToVariants,
  mediaParamsToVariants,
  supportsParamsToVariants
} from '../src/variants/media.ts';
import { nthChildVariant } from '../src/variants/pseudos.ts';

async function classes(css: string, options = {}) {
  return (await convertCSS(css, options)).classes;
}

describe('declaration edge cases', () => {
  test('covers background fallback and keyword branches', async () => {
    await expect(
      classes(`
      .a { background: none; }
      .b { background: #fff; }
      .c { background: rgb(0 0 0 / .25); }
      .d { background: url("/x.png") center / cover; }
      .e { background-image: none; }
      .f { background-image: linear-gradient(to top left, red, blue); }
      .g { background-image: radial-gradient(red, blue); }
      .h { background-size: 10px 20px; }
      .i { background-position: 20% 30%; }
      .j { background-repeat: round; }
      .k { background-clip: text; }
      .l { background-origin: content-box; }
      .m { background-attachment: local; }
    `)
    ).resolves.toEqual([
      'bg-none',
      'bg-white',
      'bg-black/25',
      'bg-none',
      'bg-linear-to-tl',
      'bg-[radial-gradient(red,_blue)]',
      'bg-[10px_20px]',
      'bg-[20%_30%]',
      'bg-repeat-round',
      'bg-clip-text',
      'bg-origin-content',
      'bg-local'
    ]);
  });

  test('covers border and outline fallback branches', async () => {
    await expect(
      classes(`
      .a { border-width: thin; }
      .a2 { border-width: 1px; border-top-width: 1px; border-right-width: 1px; border-bottom-width: 1px; border-left-width: 1px; }
      .b { border-top-width: thin; border-right-width: thin; border-bottom-width: thin; border-left-width: thin; }
      .c { border: var(--border); }
      .c2 { border-top: 1px solid currentColor; border-right: 2px dashed transparent; border-bottom: 0 dotted inherit; border-left: 3px double #000; }
      .d { border-color: rebeccapurple; border-top-color: rebeccapurple; border-bottom-color: rebeccapurple; border-left-color: rebeccapurple; }
      .e { border-radius: 0; border-radius: 9999px; border-radius: 13px; border-top-left-radius: 0; border-top-right-radius: 9999px; border-bottom-left-radius: 13px; border-bottom-right-radius: 13px; border-start-start-radius: 13px; border-start-end-radius: 13px; border-end-start-radius: 13px; border-end-end-radius: 13px; }
      .bad { border-style: groove; }
      .f { outline: 2px dotted currentColor; outline-width: thin; outline-style: none; outline-color: rebeccapurple; outline-offset: calc(1px + 1px); }
      .g { outline: 1px solid mystery; outline-width: 1px; outline-style: solid; outline-offset: -4px; }
    `)
    ).resolves.toEqual([
      'border-[thin]',
      'border',
      'border-t',
      'border-r',
      'border-b',
      'border-l',
      'border-[thin]',
      'border-t',
      'border-t-solid',
      'border-t-current',
      'border-r-2',
      'border-r-dashed',
      'border-r-transparent',
      'border-b-0',
      'border-b-dotted',
      'border-b-inherit',
      'border-l-3',
      'border-l-double',
      'border-l-black',
      'border-[rebeccapurple]',
      'border-y-[rebeccapurple]',
      'border-l-[rebeccapurple]',
      'rounded-none',
      'rounded-full',
      'rounded-[13px]',
      'rounded-tl-none',
      'rounded-tr-full',
      'rounded-b-[13px]',
      'rounded-ss-[13px]',
      'rounded-se-[13px]',
      'rounded-es-[13px]',
      'rounded-ee-[13px]',
      'outline-2',
      'outline-dotted',
      'outline-current',
      'outline-[thin]',
      'outline-hidden',
      'outline-[rebeccapurple]',
      'outline-offset-[calc(1px_+_1px)]',
      'outline-1',
      'outline-solid',
      '-outline-offset-4'
    ]);
  });

  test('covers grid, table, breaks, scroll snap, svg, and effects branches', async () => {
    await expect(
      classes(`
      .grid-fallback {
        grid-template-columns: minmax(10px, 1fr);
        grid-column: custom-line;
        grid-column-start: custom-line;
        grid-column-end: custom-line;
        grid-row-start: custom-line;
        grid-row-end: custom-line;
        grid-auto-columns: 10px;
        grid-auto-rows: 10px;
      }
      .grid {
        grid-template-columns: none;
        grid-template-columns: subgrid;
        grid-column: 2;
        grid-template-rows: repeat(4, minmax(0, 1fr));
        grid-column: auto;
        grid-column-start: auto;
        grid-column-end: auto;
        grid-row: span 3 / span 3;
        grid-row-start: auto;
        grid-row-end: auto;
        grid-auto-flow: column dense;
        grid-auto-columns: min-content;
        grid-auto-rows: max-content;
      }
      .misc {
        table-layout: unknown;
        border-collapse: unknown;
        table-layout: auto;
        border-collapse: separate;
        border-spacing: 4px;
        border-spacing: var(--space);
        border-spacing: 1px 2px 3px;
        caption-side: bottom;
        caption-side: inline-start;
        columns: auto;
        columns: 28rem;
        columns: 13rem;
        break-before: page;
        break-after: left;
        break-inside: auto;
        box-decoration-break: slice;
        -webkit-box-decoration-break: clone;
        -webkit-box-decoration-break: unknown;
        scroll-snap-type: both mandatory;
        scroll-snap-type: y proximity;
        scroll-snap-align: end;
        scroll-snap-align: none;
        scroll-snap-stop: normal;
        fill: none;
        fill: transparent;
        fill: rebeccapurple;
        stroke: rgb(0 0 0 / .25);
        stroke: currentColor;
        stroke-width: var(--stroke);
        stroke-width: 3;
        box-shadow: inset 0 1px rgb(0 0 0 / 0.05);
        opacity: var(--opacity);
        filter: blur(1px);
        backdrop-filter: blur(1px);
      }
    `)
    ).resolves.toEqual([
      'grid-cols-[minmax(10px,_1fr)]',
      'col-[custom-line]',
      'col-start-[custom-line]',
      'col-end-[custom-line]',
      'row-start-[custom-line]',
      'row-end-[custom-line]',
      'auto-cols-[10px]',
      'auto-rows-[10px]',
      'grid-cols-none',
      'grid-cols-subgrid',
      'col-2',
      'grid-rows-4',
      'col-auto',
      'col-start-auto',
      'col-end-auto',
      'row-span-3',
      'row-start-auto',
      'row-end-auto',
      'grid-flow-col-dense',
      'auto-cols-min',
      'auto-rows-max',
      'table-auto',
      'border-separate',
      'border-spacing-1',
      'border-spacing-(--space)',
      'border-spacing-[1px_2px_3px]',
      'caption-bottom',
      'columns-auto',
      'columns-md',
      'columns-[13rem]',
      'break-before-page',
      'break-after-left',
      'break-inside-auto',
      'box-decoration-slice',
      'box-decoration-clone',
      'snap-both',
      'snap-mandatory',
      'snap-y',
      'snap-proximity',
      'snap-end',
      'snap-align-none',
      'snap-normal',
      'fill-none',
      'fill-transparent',
      'fill-[rebeccapurple]',
      'stroke-black/25',
      'stroke-current',
      'stroke-(--stroke)',
      'stroke-3',
      'inset-shadow-2xs',
      'opacity-(--opacity)',
      'filter-[blur(1px)]',
      'backdrop-filter-[blur(1px)]'
    ]);
  });

  test('covers flex, layout, sizing, transforms, transitions, and typography branches', async () => {
    await expect(
      classes(`
      .x {
        flex-grow: 2;
        flex-shrink: 2;
        flex-basis: 4px;
        order: last;
        justify-content: stretch;
        justify-items: normal;
        justify-self: stretch;
        align-content: baseline;
        align-items: baseline;
        align-self: baseline;
        place-content: baseline;
        place-items: baseline;
        place-self: center;
        object-position: 10px 20px;
        z-index: auto;
        top: 50%;
        max-width: 24rem;
        aspect-ratio: 4 / 3;
        rotate: -45deg;
        translate: 4px;
        transform-origin: bottom right;
        transform-style: flat;
        perspective: none;
        perspective-origin: bottom right;
        backface-visibility: visible;
        zoom: normal;
        transition-property: opacity;
        transition-duration: 0.2s;
        transition-delay: 0.1s;
        transition-timing-function: var(--ease);
        transition-behavior: normal;
        transition: none;
        animation: none;
        animation-delay: 0.2s;
        animation-name: none;
        font-size: 13px;
        font-weight: 450;
        font-style: normal;
        font-stretch: ultra-expanded;
        font-variant-numeric: ordinal;
        line-height: 1.2;
        letter-spacing: -0.01em;
        text-decoration-line: none;
        text-decoration: underline;
        text-decoration-style: wavy;
        text-decoration-thickness: from-font;
        text-overflow: clip;
        text-indent: -4px;
        vertical-align: text-top;
        white-space: break-spaces;
        word-break: keep;
        overflow-wrap: anywhere;
        hyphens: none;
        list-style-type: square;
        list-style-position: outside;
        list-style-image: none;
        -webkit-font-smoothing: auto;
        -moz-osx-font-smoothing: auto;
        font-feature-settings: normal;
        font-variation-settings: normal;
        tab-size: var(--tab);
        text-underline-offset: auto;
        content: "x";
      }
    `)
    ).resolves.toEqual([
      'grow-2',
      'shrink-2',
      'basis-1',
      'order-last',
      'justify-stretch',
      'justify-items-normal',
      'justify-self-stretch',
      'content-baseline',
      'items-baseline',
      'self-baseline',
      'place-content-baseline',
      'place-items-baseline',
      'place-self-center',
      'object-[10px_20px]',
      'z-auto',
      'top-1/2',
      'max-w-sm',
      'aspect-[4_/_3]',
      '-rotate-45',
      'translate-x-1',
      'origin-bottom-right',
      'transform-flat',
      'perspective-none',
      'perspective-origin-bottom-right',
      'backface-visible',
      'zoom-normal',
      'transition-opacity',
      'duration-200',
      'delay-100',
      'ease-(--ease)',
      'transition-normal',
      'transition-none',
      'animate-none',
      '[animation-delay:0.2s]',
      'text-[13px]',
      'font-[450]',
      'not-italic',
      'font-stretch-ultra-expanded',
      'ordinal',
      'leading-[1.2]',
      '-tracking-[0.01em]',
      'no-underline',
      'underline',
      'decoration-wavy',
      'decoration-from-font',
      'text-clip',
      '-indent-1',
      'align-text-top',
      'whitespace-break-spaces',
      'break-keep',
      'wrap-anywhere',
      'hyphens-none',
      'list-[square]',
      'list-outside',
      'list-image-none',
      'subpixel-antialiased',
      'normal-nums',
      'tab-(--tab)',
      'underline-offset-auto',
      'content-["x"]'
    ]);
  });
});

describe('parser and utility branches', () => {
  const theme = parseTheme(`
    @theme {
      --breakpoint-md: 48rem;
      --container-md: 28rem;
    }
  `);

  test('covers selector variant branches', () => {
    expect(selectorToVariants('.x[aria-checked]')).toEqual({
      variants: ['aria-checked'],
      base: '.x'
    });
    expect(selectorToVariants('.x[data-active]')).toEqual({
      variants: ['data-active'],
      base: '.x'
    });
    expect(selectorToVariants('.x:nth-child(3)')).toEqual({
      variants: ['nth-3'],
      base: '.x'
    });
    expect(selectorToVariants('.x:nth-child(n+2)')).toEqual({
      variants: [],
      base: '.x:nth-child(n+2)'
    });
    expect(selectorToVariants('.x:not(.disabled)')).toEqual({
      variants: ['not-[.disabled]'],
      base: '.x'
    });
    expect(selectorToVariants('.x:has(.icon)')).toEqual({
      variants: ['has-[.icon]'],
      base: '.x'
    });
    expect(selectorToVariants('.x:is(.a)')).toEqual({
      variants: ['[&:is(.a)]'],
      base: '.x'
    });
    expect(selectorToVariants('.x:where(.a)')).toEqual({
      variants: ['[&:where(.a)]'],
      base: '.x'
    });
    expect(selectorToVariants('.x::unknown')).toEqual({
      variants: [],
      base: '.x::unknown'
    });
    expect(selectorToVariants('.x[title]')).toEqual({
      variants: [],
      base: '.x[title]'
    });
    expect(selectorToVariants('.x[data-state~="open"]')).toEqual({
      variants: [],
      base: '.x[data-state~="open"]'
    });
    expect(selectorToVariants('.a, .b')).toEqual({
      variants: [],
      base: '.a, .b'
    });
    expect(selectorToVariants('.x > .y:hover')).toEqual({
      variants: [],
      base: '.x > .y:hover'
    });
  });

  test('covers media and container conversion branches', () => {
    expect(mediaParamsToVariants(theme, 'print')).toEqual(['print']);
    expect(mediaParamsToVariants(theme, '(max-width: 48rem)')).toEqual([
      'max-md'
    ]);
    expect(mediaParamsToVariants(theme, '(min-width: 30rem)')).toBeNull();
    expect(mediaParamsToVariants(theme, '(max-width: 30rem)')).toBeNull();
    expect(
      mediaParamsToVariants(theme, 'screen and (orientation: landscape)')
    ).toEqual(['landscape']);
    expect(mediaParamsToVariants(theme, '(prefers-contrast: less)')).toEqual([
      'contrast-less'
    ]);
    expect(
      mediaParamsToVariants(theme, '(prefers-reduced-motion: no-preference)')
    ).toEqual(['motion-safe']);
    expect(mediaParamsToVariants(theme, '(pointer: coarse)')).toEqual([
      'pointer-coarse'
    ]);
    expect(mediaParamsToVariants(theme, '(unknown: thing)')).toBeNull();
    expect(
      mediaParamsToVariants(theme, '(min-width: 40rem), (min-width: 48rem)')
    ).toBeNull();
    expect(
      containerParamsToVariants(theme, 'sidebar (min-width: 28rem)')
    ).toEqual(['@md']);
    expect(containerParamsToVariants(theme, '')).toBeNull();
    expect(containerParamsToVariants(theme, '(max-width: 28rem)')).toBeNull();
    expect(containerParamsToVariants(theme, '(min-width: 30rem)')).toBeNull();
    expect(
      containerParamsToVariants(theme, '(min-width: 28rem), (min-width: 32rem)')
    ).toBeNull();
    expect(supportsParamsToVariants('(display: grid)')).toEqual([
      'supports-[(display:_grid)]'
    ]);
  });

  test('covers standalone value utilities', () => {
    expect(splitTopLevel('1px solid var(--border, rgb(0 0 0))')).toEqual([
      '1px',
      'solid',
      'var(--border, rgb(0 0 0))'
    ]);
    expect(trimNumber('1.00rem 0.50px 2.0')).toBe('1rem 0.5px 2');
    expect(isDynamicExpression('calc(100% - 1rem)')).toBe(true);
    expect(isDynamicExpression('10px')).toBe(false);
    expect(joinForArbitrary(['1px', 'solid', 'red'])).toBe('1px_solid_red');
    expect(asCssVarReference('var(--brand)')).toBe('--brand');
    expect(asCssVarReference('var(--brand, red)')).toBeNull();
  });
});

describe('handler inventory', () => {
  test('touches remaining spacing, layout, flex, sizing, and transition handlers', async () => {
    const result = await classes(`
      .spacing {
        padding-top: 4px;
        padding-right: 8px;
        padding-bottom: 12px;
        padding-left: 16px;
        padding-inline: 4px;
        padding-block: 8px;
        padding-inline-start: 12px;
        padding-inline-end: 16px;
        margin-right: -4px;
        margin-bottom: -8px;
        margin-left: -12px;
        margin-inline: auto;
        margin-block: 4px;
        margin-inline-start: 8px;
        margin-inline-end: 12px;
        scroll-margin: 4px 8px;
        scroll-margin-top: 4px;
        scroll-margin-right: 8px;
        scroll-margin-bottom: 12px;
        scroll-margin-left: 16px;
        scroll-padding: 4px 8px;
        scroll-padding-top: 4px;
        scroll-padding-right: 8px;
        scroll-padding-bottom: 12px;
        scroll-padding-left: 16px;
      }
      .layout {
        display: inline-grid;
        position: sticky;
        float: inline-start;
        clear: inline-end;
        visibility: collapse;
        isolation: auto;
        box-sizing: content-box;
        overflow: clip;
        overflow-x: visible;
        overflow-y: auto;
        object-fit: scale-down;
        top: auto;
        top: 33%;
        right: 100%;
        bottom: -50%;
        left: calc(1px + 1px);
        z-index: var(--z);
        inset-block-start: 4px;
        inset-block-end: 8px;
        inset: auto;
        inset-block: 4px;
        inset-inline: 8px;
      }
      .flex {
        flex-direction: column-reverse;
        flex-wrap: wrap-reverse;
        flex: none;
        flex: 2 2 auto;
        flex: 1 1 auto;
        flex: 0 1 auto;
        flex-grow: 0;
        flex-grow: var(--grow);
        flex-shrink: 0;
        flex-shrink: var(--shrink);
        flex-basis: auto;
        flex-basis: full;
        flex-basis: 13rem;
        order: -1;
        order: 0;
        order: first;
        order: custom;
        justify-content: flex-end;
        justify-items: center;
        justify-self: auto;
        align-items: flex-end;
        align-content: space-between;
        align-self: auto;
        place-content: end;
        place-items: end;
        place-self: auto;
        column-gap: 4px;
        row-gap: 8px;
        grid-gap: 4px 8px;
        grid-column-gap: 4px;
        grid-row-gap: 8px;
      }
      .sizing {
        min-width: fit-content;
        min-height: min-content;
        max-height: max-content;
        inline-size: 100dvw;
        block-size: 100svh;
        aspect-ratio: auto;
        aspect-ratio: var(--ratio);
      }
      .transitions {
        transition-property: width;
        transition-duration: var(--duration);
        transition-delay: var(--delay);
        transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
        transition-behavior: weird;
        transition: all;
        transition: opacity 200ms ease;
        animation: spin 1s linear infinite;
        animation: custom 1s linear;
        animation-name: spin 1s linear infinite;
        animation-name: custom;
      }
    `);

    expect(result).toEqual(
      expect.arrayContaining([
        'pt-1',
        'pr-2',
        'pb-3',
        'pl-4',
        'px-1',
        'py-2',
        'ps-3',
        'pe-4',
        '-mr-1',
        '-mb-2',
        '-ml-3',
        'mx-auto',
        'my-1',
        'ms-2',
        'me-3',
        'scroll-my-1',
        'scroll-mx-2',
        'scroll-mb-3',
        'scroll-ml-4',
        'scroll-py-1',
        'scroll-px-2',
        'scroll-pb-3',
        'scroll-pl-4',
        'inline-grid',
        'sticky',
        'float-start',
        'clear-end',
        'collapse',
        'isolation-auto',
        'box-content',
        'overflow-clip',
        'overflow-x-visible',
        'overflow-y-auto',
        'object-scale-down',
        'top-auto',
        'top-[33%]',
        'right-full',
        '-bottom-1/2',
        'left-[calc(1px_+_1px)]',
        'z-(--z)',
        'flex-col-reverse',
        'flex-wrap-reverse',
        'flex-none',
        'flex-[2_2_auto]',
        'flex-auto',
        'flex-initial',
        'grow-0',
        'grow-(--grow)',
        'shrink-0',
        'shrink-(--shrink)',
        'basis-auto',
        'basis-full',
        'basis-52',
        '-order-1',
        'order-none',
        'order-first',
        'order-[custom]',
        'justify-end',
        'justify-items-center',
        'justify-self-auto',
        'items-end',
        'content-between',
        'self-auto',
        'place-content-end',
        'place-items-end',
        'place-self-auto',
        'gap-x-1',
        'gap-y-2',
        'min-w-fit',
        'min-h-min',
        'max-h-max',
        'w-dvw',
        'h-svh',
        'aspect-auto',
        'aspect-(--ratio)',
        'transition-[width]',
        'duration-(--duration)',
        'delay-(--delay)',
        'ease-out',
        'transition-all',
        'animate-spin',
        'animate-[custom_1s_linear]'
      ])
    );
  });

  test('touches remaining typography, interactivity, and color fallbacks', async () => {
    const result = await classes(`
      .type {
        color: inherit;
        color: rgb(0 0 0 / .5);
        color: mystery;
        font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        font-family: fantasy;
        font-size: 1rem;
        font-weight: 700;
        font-weight: boldish;
        font-style: oblique;
        font-style: weird;
        font-stretch: unknown;
        font-variant-numeric: unknown;
        font-variant-numeric: stacked-fractions;
        line-height: 1.5;
        line-height: calc(1em + 1px);
        letter-spacing: 0.025em;
        letter-spacing: 0.013em;
        text-align: unknown;
        text-align: end;
        text-transform: unknown;
        text-transform: none;
        text-decoration-line: unknown;
        text-decoration-line: overline;
        text-decoration: unknown;
        text-decoration: line-through;
        text-decoration-color: transparent;
        text-decoration-color: rgb(0 0 0 / .5);
        text-decoration-thickness: auto;
        text-decoration-thickness: 3px;
        text-decoration-thickness: calc(1px + 1px);
        text-overflow: unknown;
        text-indent: calc(1px + 1px);
        vertical-align: 2px;
        white-space: unknown;
        white-space: pre-line;
        word-break: unknown;
        word-break: break-word;
        overflow-wrap: break-word;
        overflow-wrap: weird;
        overflow-wrap: normal;
        hyphens: unknown;
        hyphens: manual;
        list-style-type: disc;
        list-style-type: none;
        list-style-position: unknown;
        list-style-position: inside;
        list-style-image: url("x.svg");
        -webkit-font-smoothing: weird;
        -moz-osx-font-smoothing: weird;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: "kern";
        text-underline-offset: 3px;
        text-underline-offset: calc(1px + 1px);
        content: none;
      }
      .ui {
        cursor: grab;
        cursor: url(hand.cur), pointer;
        user-select: all;
        pointer-events: none;
        appearance: auto;
        resize: horizontal;
        scroll-behavior: auto;
        touch-action: manipulation;
        will-change: contents;
        color-scheme: only dark;
        field-sizing: fixed;
        scrollbar-width: none;
        scrollbar-gutter: diagonal;
        forced-color-adjust: auto;
        accent-color: auto;
        caret-color: auto;
        caret-color: rebeccapurple;
      }
      .colors {
        background-color: currentColor;
        background-color: inherit;
        border-color: transparent;
        border-color: currentColor;
        border-color: inherit;
        outline-color: transparent;
        fill: inherit;
        stroke: transparent;
      }
    `);

    expect(result).toEqual(
      expect.arrayContaining([
        'text-inherit',
        'text-black/50',
        'text-[mystery]',
        'font-sans',
        'font-[fantasy]',
        'text-base',
        'font-bold',
        'font-[boldish]',
        'italic',
        'font-stretch-[unknown]',
        'stacked-fractions',
        'leading-normal',
        'leading-[calc(1em_+_1px)]',
        'tracking-wide',
        'tracking-[0.013em]',
        'text-end',
        'normal-case',
        'overline',
        'line-through',
        'decoration-transparent',
        'decoration-black/50',
        'decoration-auto',
        'decoration-3',
        'decoration-[calc(1px_+_1px)]',
        'indent-[calc(1px_+_1px)]',
        'align-[2px]',
        'whitespace-pre-line',
        'break-words',
        'wrap-break-word',
        'wrap-normal',
        'hyphens-manual',
        'list-disc',
        'list-none',
        'list-inside',
        'list-image-[url("x.svg")]',
        'antialiased',
        '[font-feature-settings:"kern"]',
        'underline-offset-3',
        'underline-offset-[calc(1px_+_1px)]',
        'content-none',
        'cursor-grab',
        'cursor-[url(hand.cur),_pointer]',
        'select-all',
        'pointer-events-none',
        'appearance-auto',
        'resize-x',
        'scroll-auto',
        'touch-manipulation',
        'will-change-contents',
        'scheme-only-dark',
        'field-sizing-fixed',
        'scrollbar-none',
        'scrollbar-gutter-[diagonal]',
        'forced-color-adjust-auto',
        'accent-auto',
        'caret-auto',
        'caret-[rebeccapurple]',
        'bg-current',
        'bg-inherit',
        'border-transparent',
        'border-current',
        'border-inherit',
        'outline-transparent',
        'fill-inherit',
        'stroke-transparent'
      ])
    );
  });

  test('covers convertCSS structural leftovers and unsupported parents', async () => {
    const withEmptyArbitrary = await convertCSS('.x { --bad: ; }', {
      arbitraryProperties: true
    });
    expect(withEmptyArbitrary.rules[0]?.leftover).toEqual([
      { prop: '--bad', value: '', important: false }
    ]);

    const unsupportedParent = await convertCSS(`
      @layer components { .x { display: flex; } }
      @font-face { font-family: Test; src: url(test.woff2); }
      .outer { .inner { display: flex; } }
      @media (min-width: 48rem) { .keep { unknown: value; } }
    `);
    expect(unsupportedParent.classes).toEqual(['flex']);
    expect(unsupportedParent.css).toContain('@media (min-width: 48rem)');
  });

  test('touches remaining transform and lookup fallback branches', async () => {
    const result = await classes(`
      .x {
        rotate: var(--rotate);
        scale: none;
        scale: var(--scale);
        translate: 50%;
        translate: 0;
        translate: 1px 2px;
        transform-origin: 13px 14px;
        perspective-origin: 13px 14px;
        transform-style: unknown;
        perspective: 13px;
        backface-visibility: unknown;
        zoom: reset;
        zoom: calc(1 + 0.25);
        transform: translateZ(0);
        transform: rotate(45deg);
        opacity: nope;
        box-shadow: 0 0 1px red;
        mix-blend-mode: unknown;
        background-blend-mode: unknown;
        filter: none;
        backdrop-filter: none;
        background-color: oklch(0.685 0.169 237.323 / .5);
        background-color: not-a-color;
      }
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        'rotate-(--rotate)',
        'scale-none',
        'scale-(--scale)',
        'translate-x-[50%]',
        'translate-x-[0]',
        'translate-[1px_2px]',
        'origin-[13px_14px]',
        'perspective-origin-[13px_14px]',
        'perspective-[13px]',
        'zoom-reset',
        'zoom-[calc(1_+_0.25)]',
        'transform-gpu',
        'opacity-[nope]',
        'shadow-[0_0_1px_red]',
        'filter-none',
        'backdrop-filter-none',
        'bg-sky-500/50',
        'bg-[not-a-color]'
      ])
    );
  });

  test('covers parseTheme reset and root parsing branches', () => {
    const reset = parseTheme(`
      :host { --color-host: #123456; }
      @theme {
        --color-*: initial;
        --color-brand: #000;
        --spacing: 0.5rem;
        --font-display: initial;
      }
    `);
    expect(reset.color).toEqual({ brand: '#000', host: '#123456' });
    expect(reset.spacing['4']).toBe('2rem');
    expect(reset.font.display).toBeUndefined();
  });

  test('covers unresolved declaration branches without converting them', async () => {
    const converted = await convertCSS(`
      @media screen { .screen { display: flex; } }
      @media (unknown: thing) { .unsupported-media { display: flex; } }
      @container (min-width: 28rem) { .container-query { display: flex; } }
      @supports (display: grid) { .supports-query { display: grid; } }
      .empty {}
      .layout {
        display: unknown;
        position: unknown;
        float: unknown;
        clear: unknown;
        visibility: unknown;
        isolation: unknown;
        box-sizing: unknown;
        overflow: unknown;
        overflow-x: unknown;
        overflow-y: unknown;
        object-fit: unknown;
        z-index: unset;
      }
      .flex {
        flex-direction: unknown;
        flex-wrap: unknown;
        flex-basis: calc(10px + 1px);
        justify-content: unknown;
        justify-items: unknown;
        justify-self: unknown;
        align-items: unknown;
        align-content: unknown;
        align-self: unknown;
        place-content: unknown;
        place-items: unknown;
        place-self: unknown;
      }
      .ui {
        user-select: unknown;
        pointer-events: unknown;
        appearance: unknown;
        resize: unknown;
        scroll-behavior: unknown;
        touch-action: unknown;
        will-change: perspective;
        color-scheme: unknown;
        field-sizing: unknown;
        scrollbar-width: unknown;
        forced-color-adjust: unknown;
        accent-color: rebeccapurple;
      }
      .snap {
        scroll-snap-type: none;
        scroll-snap-type: inline mandatory;
        scroll-snap-align: unknown;
        scroll-snap-stop: unknown;
      }
      .size {
        width: auto;
        width: 100vw;
        height: 100vh;
        height: 100lvh;
        min-width: 50%;
        max-width: calc(100% - 1rem);
      }
    `);

    expect(converted.classes).toEqual(
      expect.arrayContaining([
        'flex',
        '@md:flex',
        'supports-[(display:_grid)]:grid',
        'basis-[calc(10px_+_1px)]',
        'will-change-[perspective]',
        'scheme-[unknown]',
        'accent-[rebeccapurple]',
        'snap-none',
        'w-auto',
        'w-screen',
        'h-screen',
        'h-lvh',
        'min-w-1/2',
        'max-w-[calc(100%_-_1rem)]'
      ])
    );
    expect(converted.css).toContain('@media screen');
  });

  test('covers remaining true/false mapping branches', async () => {
    const result = await classes(`
      .background {
        background-color: transparent;
        background-image: linear-gradient(to top center, red, blue);
        background-repeat: unknown;
        background-clip: unknown;
        background-origin: unknown;
        background-attachment: unknown;
      }
      .border {
        border-width: 0;
        border-top-width: 2px;
        border-right-width: 0;
        border-bottom-width: 2px;
        border-left-width: 0;
        border: ;
        border: hidden;
        border-right-color: black;
        border-right-color: rebeccapurple;
        outline: none;
        outline-width: 0;
        outline-style: dashed;
        outline-style: unknown;
        border-bottom-left-radius: 9999px;
        border-top-left-radius: 0.25rem;
      }
      .breaks {
        break-before: unknown;
        break-after: unknown;
        break-inside: unknown;
        box-decoration-break: unknown;
      }
      .grid {
        grid-column: span 2 / span 2;
        grid-column-start: 2;
        grid-column-end: 3;
        grid-row: 4;
        grid-row-start: 5;
        grid-row-end: 6;
        grid-auto-flow: diagonal;
      }
      .flex {
        gap: 4px nope;
        flex-shrink: 1;
        order: 2;
      }
      .table {
        border-spacing: 4px nope;
      }
      .layout {
        z-index: 10;
        z-index: -10;
      }
      .size {
        width: 100vh;
        height: 100vw;
      }
      .spacing {
        padding: 1px 2px 3px 4px 5px;
      }
      .svg {
        fill: black;
        fill: rgb(0 0 0 / .25);
        stroke: inherit;
      }
      .transforms {
        scale: abc%;
        translate: abc%;
        zoom: abc%;
        transform: none;
      }
      .transitions {
        animation-delay: 200ms;
      }
      .snap {
        scroll-snap-type: inline weird;
      }
      .effects {
        box-shadow: none;
        opacity: abc%;
      }
      .type {
        color: currentColor;
        color: transparent;
        text-decoration-style: unknown;
        text-overflow: ellipsis;
        text-indent: 4px;
      }
      .ui {
        accent-color: black;
      }
    `);

    expect(result).toEqual(
      expect.arrayContaining([
        'bg-transparent',
        'bg-[linear-gradient(to_top_center,_red,_blue)]',
        'border-0',
        'border-y-2',
        'border-x-0',
        'outline-hidden',
        'outline-0',
        'outline-dashed',
        'rounded-bl-full',
        'rounded-tl-sm',
        'border-hidden',
        'border-r-black',
        'border-r-[rebeccapurple]',
        'col-span-2',
        'col-start-2',
        'col-end-3',
        'row-4',
        'row-start-5',
        'row-end-6',
        'shrink',
        'order-2',
        'gap-[4px_nope]',
        'border-spacing-[4px_nope]',
        'z-10',
        '-z-10',
        'w-[100vh]',
        'h-[100vw]',
        'p-[1px_2px_3px_4px_5px]',
        'fill-black',
        'fill-black/25',
        'stroke-inherit',
        'scale-[abc%]',
        'translate-[abc%]',
        'zoom-[abc%]',
        'transform-none',
        '[animation-delay:200ms]',
        'text-current',
        'text-transparent',
        'text-ellipsis',
        'indent-1',
        'accent-black',
        'shadow-none',
        'opacity-[abc%]'
      ])
    );
  });

  test('covers theme lookup fallback branches directly', () => {
    const theme = parseTheme(`
      @theme {
        --spacing: 0.25rem;
        --color-brand: oklch(68.5% 0.169 237.323 / 100%);
        --color-alpha: oklch(0.685 0.169 237.323 / 50%);
        --color-turn: oklch(0.685 0.169 0.6592305556turn);
        --color-rad: oklch(0.685 0.169 4.141324rad);
        --color-grad: oklch(0.685 0.169 263.692grad);
        --color-bad: not-a-color;
      }
    `);

    expect(matchSpacing(theme, '13rem')).toBe('52');
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: {
            ...theme.reverse,
            spacing: new Map([['0.25rem', 'quarter']])
          }
        },
        '4px'
      )
    ).toBe('quarter');
    expect(matchSpacing(theme, '0px')).toBe('0');
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: { ...theme.reverse, spacing: new Map() }
        },
        '4px'
      )
    ).toBe('1');
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: { ...theme.reverse, spacing: new Map() }
        },
        '13rem'
      )
    ).toBe('52');
    expect(matchSpacing(theme, '4px', null)).toBeNull();
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: { ...theme.reverse, spacing: new Map() },
          spacingBase: '0'
        },
        '4rem'
      )
    ).toBeNull();
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: { ...theme.reverse, spacing: new Map() },
          spacingBase: '0rem'
        },
        '4px'
      )
    ).toBeNull();
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: { ...theme.reverse, spacing: new Map() }
        },
        '4.125rem'
      )
    ).toBeNull();
    expect(
      matchSpacing(
        {
          ...theme,
          reverse: { ...theme.reverse, spacing: new Map() },
          spacingBase: 'bad'
        },
        '4rem'
      )
    ).toBeNull();
    expect(matchColor(theme, 'oklch(68.5% 0.169 237.323)')).toBe('sky-500');
    expect(matchColor(theme, 'oklch(0.685 0.169 0.6592305556turn)')).toBe(
      'turn'
    );
    expect(matchColor(theme, 'oklch(0.685 0.169 4.141324rad)')).toBe('rad');
    expect(matchColor(theme, 'oklch(0.685 0.169 263.692grad)')).toBe('grad');
    expect(matchColor(theme, 'oklch(0.6850 0.169 263.692grad)')).not.toBeNull();
    expect(matchColor(theme, 'oklch(% 0.169 237.323)')).toBeNull();
    expect(matchColor(theme, 'oklch(0.685 0.169 237.323 / %)')).toBeNull();
    expect(matchColor(theme, 'oklch(0.685 0.169)')).toBeNull();
    expect(matchColor(theme, 'oklch(0.685 0.169 237.323foo)')).toBe('sky-500');
    expect(matchColor(theme, 'oklch(0.685 nope 237.323)')).toBeNull();
    expect(matchColor(theme, 'oklch(nope 0.169 237.323)')).toBeNull();
    expect(matchColor(theme, 'oklch(0.685 0.169 nope)')).toBeNull();
    expect(matchColor(theme, 'oklch(0.685 0.169 237.323 / nope)')).toBeNull();
    expect(
      matchColorWithAlpha(theme, 'oklch(0.685 0.169 237.323 / 50%)')
    ).toEqual({
      token: 'sky-500',
      alpha: 50
    });
    expect(matchColorWithAlpha(theme, 'oklch(0.6850 0.169 237.323)')).toEqual({
      token: 'sky-500'
    });
    expect(
      matchColorWithAlpha(theme, 'oklch(0.6850 0.169 263.692grad / 50%)')
    ).toEqual({
      token: 'sky-500',
      alpha: 50
    });
    expect(matchColorWithAlpha(theme, 'rgb(255 255 255)')).toEqual({
      token: 'white'
    });
    expect(
      matchColorWithAlpha(theme, 'not-a-real-color-function(1)')
    ).toBeNull();
    expect(matchColorWithAlpha(theme, 'oklch(0.1 0.1 10)')).toBeNull();
    expect(arbitrary('bg', '--brand')).toBe('bg-(--brand)');
    expect(formatColorToken('bg', { token: 'white' })).toBe('bg-white');
    expect(formatColorToken('bg', { token: 'black', alpha: 50 })).toBe(
      'bg-black/50'
    );
    expect(buildSpacingNamespace('bad')['4']).toBe('1rem');
    expect(
      parseTheme('@theme { --unknown-token: 1; --*: keep; }').color.white
    ).toBe('#fff');
    expect(
      parseTheme(
        '@theme { --color-*: keep; --font: "Inter"; } .x { --color-root: #000; }'
      ).color.white
    ).toBe('#fff');
    expect(splitTopLevel('a  b')).toEqual(['a', 'b']);
    expect(nthChildVariant('even')).toBe('even');
    expect(nthChildVariant('2n')).toBe('even');
    expect(nthChildVariant('2n+1')).toBe('odd');
    expect(nthChildVariant('n+2')).toBeNull();
  });
});
