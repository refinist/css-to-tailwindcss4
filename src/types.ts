// Internal types for css-to-tailwindcss4.

// One Tailwind v4 theme namespace. Keys are token names (without the
// `--<ns>-` prefix); values are the CSS values resolved at parse time.
//
// Example: for `--color-mint-500: oklch(...)` the namespace is `color`
// and the entry is `{ "mint-500": "oklch(...)" }`.
export type ThemeNamespace = Record<string, string>;

export interface Theme {
  color: ThemeNamespace;
  spacing: ThemeNamespace;
  font: ThemeNamespace;
  text: ThemeNamespace;
  fontWeight: ThemeNamespace;
  tracking: ThemeNamespace;
  leading: ThemeNamespace;
  breakpoint: ThemeNamespace;
  container: ThemeNamespace;
  radius: ThemeNamespace;
  shadow: ThemeNamespace;
  insetShadow: ThemeNamespace;
  dropShadow: ThemeNamespace;
  blur: ThemeNamespace;
  perspective: ThemeNamespace;
  aspect: ThemeNamespace;
  ease: ThemeNamespace;
  animate: ThemeNamespace;
  tabSize: ThemeNamespace;
  zoom: ThemeNamespace;
  // Raw spacing scale base (the `--spacing` var, defaults to 0.25rem).
  spacingBase: string;
  // Inverse lookups built lazily (value → token name).
  reverse: {
    color: Map<string, string>;
    spacing: Map<string, string>;
    radius: Map<string, string>;
    shadow: Map<string, string>;
    insetShadow: Map<string, string>;
    dropShadow: Map<string, string>;
    text: Map<string, string>;
    fontWeight: Map<string, string>;
    leading: Map<string, string>;
    tracking: Map<string, string>;
    breakpoint: Map<string, string>;
    container: Map<string, string>;
    blur: Map<string, string>;
    ease: Map<string, string>;
    animate: Map<string, string>;
    aspect: Map<string, string>;
    perspective: Map<string, string>;
    font: Map<string, string>;
    tabSize: Map<string, string>;
    zoom: Map<string, string>;
  };
}

export interface ConvertOptions {
  // CSS string with v4 `@theme { ... }` blocks (and optionally
  // `@import "tailwindcss";`). When omitted the v4 default theme is used.
  themeCSS?: string;
  // When a CSS declaration cannot be mapped to a known utility, emit an
  // arbitrary property class like `[mask-type:luminance]`. Off by default.
  arbitraryProperties?: boolean;
  // Optional prefix for emitted classes (Tailwind v4 supports configurable
  // prefix via `@import "tailwindcss" prefix(tw)`).
  prefix?: string;
  // Pixel size of 1rem when matching CSS px values back to Tailwind's rem
  // spacing scale. Set to null to disable px/rem normalization.
  remInPx?: number | null;
  // PostCSS plugins to run on the input CSS before walking (e.g.
  // `postcss-nested` to flatten nested rules). Plugins run in array order.
  postCSSPlugins?: import('postcss').AcceptedPlugin[];
}

export interface ConvertedRule {
  // Selector of the original CSS rule.
  selector: string;
  // Tailwind v4 utility classes for this rule.
  classes: string[];
  // Declarations the converter could not handle.
  leftover: Array<{ prop: string; value: string; important: boolean }>;
  // Variant prefix chain (e.g. ["md","hover"]) applied to every class.
  variants: string[];
}

export interface ConvertResult {
  // All converted rules in document order.
  rules: ConvertedRule[];
  // Flat list of every class produced, useful for quick inspection.
  classes: string[];
  // Reconstructed CSS where convertible declarations are replaced by
  // `@apply ...;`.
  css: string;
}
