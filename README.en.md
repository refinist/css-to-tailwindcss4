# css-to-tailwindcss4

[中文](./README.md) | English

Convert CSS to Tailwind CSS v4 utility classes.

## Features

- Supports common Tailwind CSS v4 utilities across layout, flex, grid,
  spacing, sizing, typography, colors, borders, effects, transforms,
  transitions, tables, SVG, interactivity, media queries, container queries,
  supports rules, and selector variants.
- Reads Tailwind v4 CSS-first theme tokens from `@theme { ... }`.
- Falls back to Tailwind v4 default theme tokens when no custom theme is
  provided.
- Matches colors across common CSS formats, including named colors, hex, rgb,
  and Tailwind v4 OKLCH palette values.
- Emits v4 slash opacity classes such as `bg-black/50`.
- Emits v4 CSS variable arbitrary values such as `bg-(--brand)`.
- Expands spacing shorthands into stable utilities, for example
  `padding: 1rem 2rem` becomes `py-4 px-8`.
- Converts px spacing values back to the default rem-based spacing scale by
  default, for example `margin-top: 4px` becomes `mt-1`.
- Supports PostCSS plugins before conversion, such as `postcss-nested`.
- Skips non-convertible declarations by default, with an option to emit
  arbitrary property classes like `[mask-type:luminance]`.

## Install

```bash
npm install css-to-tailwindcss4
```

## Usage

```ts
import { convertCSS } from 'css-to-tailwindcss4';

const inputCSS = `
  .card {
    display: flex;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    color: #fff;
    background-color: rgb(0 0 0 / 0.5);
  }

  .card:hover {
    background-color: var(--brand);
  }

  @media (min-width: 48rem) {
    .card {
      display: grid;
    }
  }
`;

const result = await convertCSS(inputCSS, {
  themeCSS: `
    @import "tailwindcss";

    @theme {
      --color-brand: #0ea5e9;
      --spacing: 0.25rem;
    }
  `
});

console.log(result.classes);
console.log(result.css);
console.log(result.rules);
```

Console output `result.classes`:

```js
[
  'flex',
  'py-4',
  'px-8',
  'rounded-lg',
  'shadow-xs',
  'text-white',
  'bg-black/50',
  'hover:bg-(--brand)',
  'md:grid'
];
```

Console output `result.css`:

```css
.card {
  @apply flex py-4 px-8 rounded-lg shadow-xs text-white bg-black/50 hover:bg-(--brand) md:grid;
}
```

Console output `result.rules`:

```js
[
  {
    selector: '.card',
    classes: [
      'flex',
      'py-4',
      'px-8',
      'rounded-lg',
      'shadow-xs',
      'text-white',
      'bg-black/50'
    ],
    leftover: [],
    variants: []
  },
  {
    selector: '.card',
    classes: ['hover:bg-(--brand)'],
    leftover: [],
    variants: ['hover']
  },
  {
    selector: '.card',
    classes: ['md:grid'],
    leftover: [],
    variants: ['md']
  }
];
```

## API

### `convertCSS(css, options?)`

```ts
function convertCSS(
  css: string,
  options?: ConvertOptions
): Promise<ConvertResult>;
```

#### Options

| Option                | Type               | Default     | Description                                                                  |
| --------------------- | ------------------ | ----------- | ---------------------------------------------------------------------------- |
| `themeCSS`            | `string`           | v4 defaults | CSS containing Tailwind v4 `@theme { ... }` blocks.                          |
| `arbitraryProperties` | `boolean`          | `false`     | Convert unknown declarations to arbitrary property classes like `[x:y]`.     |
| `prefix`              | `string`           | `undefined` | Prefix emitted utilities using v4 prefix order, for example `tw:hover:flex`. |
| `remInPx`             | `number` \| `null` | `16`        | Pixel size of `1rem` when matching px values to spacing tokens.              |
| `postCSSPlugins`      | `AcceptedPlugin[]` | `[]`        | PostCSS plugins to run before conversion.                                    |

#### Result

| Field     | Type              | Description                                                |
| --------- | ----------------- | ---------------------------------------------------------- |
| `rules`   | `ConvertedRule[]` | Converted rules in document order.                         |
| `classes` | `string[]`        | Flat list of every generated Tailwind class.               |
| `css`     | `string`          | Reconstructed CSS with converted declarations as `@apply`. |

## Tailwind v4 handling

### CSS-first theme

Tailwind v4 theme values live in CSS variables under `@theme`. The converter
parses those variables and uses them for reverse lookups:

```ts
await convertCSS('.x { color: #ff0066; }', {
  themeCSS: '@theme { --color-brand-500: #ff0066; }'
});
// ['text-brand-500']
```

Supported theme namespaces include colors, spacing, fonts, text sizes, font
weights, tracking, leading, breakpoints, containers, radius, shadow,
inset-shadow, drop-shadow, blur, perspective, aspect, easing, animations,
tab-size, and zoom.

### Renamed scales

The default theme uses Tailwind v4 names for renamed scales:

```css
.x {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  border-radius: 0.125rem;
}
```

```js
['shadow-xs', 'rounded-xs'];
```

### Slash opacity

Alpha colors emit v4 slash opacity utilities:

```css
.x {
  background-color: rgb(0 0 0 / 0.5);
}
```

```js
['bg-black/50'];
```

### CSS variable arbitrary values

CSS variables use Tailwind v4 parenthesis syntax:

```css
.x {
  background-color: var(--brand);
}
```

```js
['bg-(--brand)'];
```

### Prefix and important

The converter emits Tailwind v4 ordering for prefix, variants, and important:

```ts
await convertCSS('.x:hover { display: flex !important; }', { prefix: 'tw' });
// ['tw:hover:flex!']
```

### Variants

The converter maps supported selectors and at-rules to variant prefixes:

```css
.button:hover {
  color: #fff;
}

@media (prefers-color-scheme: dark) {
  .button {
    background-color: #000;
  }
}

@container (min-width: 28rem) {
  .button {
    display: flex;
  }
}
```

```js
['hover:text-white', 'dark:bg-black', '@md:flex'];
```

## What's converted

- Layout: `display`, `position`, inset, `float`, `clear`, overflow,
  visibility, `z-index`, isolation, object fit/position, and box sizing.
- Flexbox and grid, including alignment, order, basis, gaps, template tracks,
  auto tracks, placement, and spans.
- Spacing: padding, margin, scroll padding, scroll margin, negative values,
  shorthand expansion, axis reduction, and px/rem matching.
- Sizing: width, height, min/max dimensions, fractions, viewport units,
  container sizes, and aspect ratio.
- Typography: color, font family, font size, font weight, line height, letter
  spacing, text alignment, text decoration, whitespace, word breaking, lists,
  font smoothing, numeric variants, tab size, content, and font stretch.
- Colors: token matching, OKLCH matching, alpha slash syntax, CSS variables,
  current color, transparent, and inherit.
- Backgrounds: color, image gradients, position, size, repeat, clip, origin,
  attachment, and blend mode.
- Borders and outline, including color, width, style, radius, logical corners,
  and v4 `outline-hidden`.
- Effects: shadow, inset shadow, opacity, blend modes, filters, and backdrop
  filters.
- Transitions, transforms, tables, columns, breaks, scroll snap, SVG fill and
  stroke, cursor, selection, touch, resize, scroll behavior, appearance,
  field sizing, color scheme, forced color adjustment, scrollbar width/gutter,
  backface visibility, and zoom.
- Variants from `@media`, `@container`, `@supports`, pseudo-classes,
  pseudo-elements, `not()`, `has()`, `nth-child()`, `[data-*]`, and `[aria-*]`.

## Limitations

- Custom plugin output is not generated.
- Container query names are not preserved.
- Unsupported declarations remain in `leftover` unless `arbitraryProperties`
  is enabled.
- The converter is not a lossless CSS round-trip tool; it focuses on producing
  Tailwind v4 utilities for declarations it can map confidently.

## License

MIT. See `LICENSE`.
