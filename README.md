# css-to-tailwindcss4

中文 | [English](./README.en.md)

将 CSS 转换成 Tailwind CSS v4 utility classes。

> 本项目参考 [`css-to-tailwindcss`](https://github.com/Jackardios/css-to-tailwindcss) 的核心转换思路，并针对 Tailwind CSS v4 的 CSS-first theme、utility 命名和语法变化做升级。

## 特性

- 覆盖常见 Tailwind CSS v4 utilities，包括 layout、flex、grid、spacing、
  sizing、typography、colors、borders、effects、transforms、transitions、
  tables、SVG、interactivity、media queries、container queries、supports
  rules 和 selector variants。
- 读取 Tailwind v4 CSS-first 的 `@theme { ... }` token。
- 未传入自定义 theme 时，使用 Tailwind v4 默认 theme token。
- 支持常见 CSS 颜色格式匹配，包括 named colors、hex、rgb，以及 Tailwind v4
  默认 OKLCH palette。
- 输出 v4 slash opacity class，例如 `bg-black/50`。
- 输出 v4 CSS variable 任意值语法，例如 `bg-(--brand)`。
- 会把 spacing shorthand 展开成稳定的 utility，例如
  `padding: 1rem 2rem` 会转换成 `py-4 px-8`。
- 默认会把 px spacing value 反查回 rem spacing scale，例如
  `margin-top: 4px` 会转换成 `mt-1`。
- 支持转换前运行 PostCSS plugins，例如 `postcss-nested`。
- 默认跳过无法转换的 declaration；也可以开启选项输出 arbitrary property
  class，例如 `[mask-type:luminance]`。

## 安装

```bash
npm install css-to-tailwindcss4
```

## 使用

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

`result.classes` 输出：

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

`result.css` 输出：

```css
.card {
  @apply flex py-4 px-8 rounded-lg shadow-xs text-white bg-black/50 hover:bg-(--brand) md:grid;
}
```

`result.rules` 输出：

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

| Option                | 类型               | 默认值      | 说明                                                                |
| --------------------- | ------------------ | ----------- | ------------------------------------------------------------------- |
| `themeCSS`            | `string`           | v4 defaults | 包含 Tailwind v4 `@theme { ... }` 的 CSS 字符串。                   |
| `arbitraryProperties` | `boolean`          | `false`     | 将未知 declaration 转换成 `[x:y]` 形式的 arbitrary property class。 |
| `prefix`              | `string`           | `undefined` | 按 v4 顺序给 utility 加 prefix，例如 `tw:hover:flex`。              |
| `remInPx`             | `number` \| `null` | `16`        | px 值反查 spacing token 时，`1rem` 对应的 px 数。                   |
| `postCSSPlugins`      | `AcceptedPlugin[]` | `[]`        | 转换前先运行的 PostCSS plugins。                                    |

#### Result

| 字段      | 类型              | 说明                                            |
| --------- | ----------------- | ----------------------------------------------- |
| `rules`   | `ConvertedRule[]` | 按文档顺序返回的转换结果。                      |
| `classes` | `string[]`        | 所有生成的 Tailwind class 的扁平数组。          |
| `css`     | `string`          | 把可转换 declaration 替换为 `@apply` 后的 CSS。 |

## Tailwind v4 处理

### CSS-first theme

Tailwind v4 的 theme 值来自 `@theme` 下的 CSS variables。转换器会解析这些
variables，并用它们做 value 到 token 的反查：

```ts
await convertCSS('.x { color: #ff0066; }', {
  themeCSS: '@theme { --color-brand-500: #ff0066; }'
});
// ['text-brand-500']
```

当前支持的 theme namespace 包括 colors、spacing、fonts、text sizes、font
weights、tracking、leading、breakpoints、containers、radius、shadow、
inset-shadow、drop-shadow、blur、perspective、aspect、easing、animations、
tab-size 和 zoom。

### 重命名的 scale

默认 theme 使用 Tailwind v4 的 scale 名称：

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

带 alpha 的颜色会输出 v4 slash opacity utility：

```css
.x {
  background-color: rgb(0 0 0 / 0.5);
}
```

```js
['bg-black/50'];
```

### CSS variable 任意值

CSS variables 使用 Tailwind v4 的括号语法：

```css
.x {
  background-color: var(--brand);
}
```

```js
['bg-(--brand)'];
```

### Prefix 和 important

转换器会按 Tailwind v4 顺序输出 prefix、variants 和 important：

```ts
await convertCSS('.x:hover { display: flex !important; }', { prefix: 'tw' });
// ['tw:hover:flex!']
```

### Variants

支持把部分 selector 和 at-rule 转成 variant prefix：

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

## 转换范围

- Layout：`display`、`position`、inset、`float`、`clear`、overflow、
  visibility、`z-index`、isolation、object fit/position 和 box sizing。
- Flexbox 和 grid：alignment、order、basis、gaps、template tracks、auto
  tracks、placement 和 spans。
- Spacing：padding、margin、scroll padding、scroll margin、负值、shorthand
  展开、axis reduction 和 px/rem 匹配。
- Sizing：width、height、min/max dimensions、fractions、viewport units、
  container sizes 和 aspect ratio。
- Typography：color、font family、font size、font weight、line height、letter
  spacing、text alignment、text decoration、whitespace、word breaking、lists、
  font smoothing、numeric variants、tab size、content 和 font stretch。
- Colors：token matching、OKLCH matching、alpha slash syntax、CSS variables、
  current color、transparent 和 inherit。
- Backgrounds：color、image gradients、position、size、repeat、clip、origin、
  attachment 和 blend mode。
- Borders 和 outline：color、width、style、radius、logical corners，以及 v4
  `outline-hidden`。
- Effects：shadow、inset shadow、opacity、blend modes、filters 和 backdrop
  filters。
- Transitions、transforms、tables、columns、breaks、scroll snap、SVG fill 和
  stroke、cursor、selection、touch、resize、scroll behavior、appearance、field
  sizing、color scheme、forced color adjustment、scrollbar width/gutter、
  backface visibility 和 zoom。
- 来自 `@media`、`@container`、`@supports`、pseudo-classes、pseudo-elements、
  `not()`、`has()`、`nth-child()`、`[data-*]` 和 `[aria-*]` 的 variants。

## 限制

- 不生成 custom plugin output。
- 不保留 container query name。
- 不支持的 declarations 会留在 `leftover`，除非开启 `arbitraryProperties`。
- 这不是 lossless CSS round-trip 工具；它专注于把能稳定映射的 declaration
  转换成 Tailwind v4 utilities。

## License

[MIT](./LICENSE)

Copyright (c) 2026-present, [REFINIST](https://github.com/refinist)
