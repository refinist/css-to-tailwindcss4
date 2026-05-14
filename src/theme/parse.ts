// Parse Tailwind v4 @theme blocks into our internal Theme.
//
// The parser is intentionally lenient: it accepts any subset of @theme,
// supports `@theme inline`, and silently ignores variables outside known
// v4 namespaces. Users can pass partial themes (only colors, for example);
// missing namespaces fall back to v4 defaults.

import safeParser from 'postcss-safe-parser';
import { buildSpacingNamespace, defaultTheme, finalize } from './defaults.ts';

import type { Theme, ThemeNamespace } from '../types.ts';
import type { AtRule, Declaration } from 'postcss';

// Each v4 namespace prefix and the Theme field it populates.
const NAMESPACE_MAP: Record<
  string,
  keyof Omit<Theme, 'spacingBase' | 'reverse'>
> = {
  '--color': 'color',
  '--spacing': 'spacing',
  '--font': 'font',
  '--text': 'text',
  '--font-weight': 'fontWeight',
  '--tracking': 'tracking',
  '--leading': 'leading',
  '--breakpoint': 'breakpoint',
  '--container': 'container',
  '--radius': 'radius',
  '--shadow': 'shadow',
  '--inset-shadow': 'insetShadow',
  '--drop-shadow': 'dropShadow',
  '--blur': 'blur',
  '--perspective': 'perspective',
  '--aspect': 'aspect',
  '--ease': 'ease',
  '--animate': 'animate',
  '--tab-size': 'tabSize',
  '--zoom': 'zoom'
};

// Order matters: longer prefixes must be tried first so `--font-weight-*`
// doesn't get bucketed as `--font-*`.
const NAMESPACE_PREFIXES = Object.keys(NAMESPACE_MAP).sort(
  (a, b) => b.length - a.length
);

interface BucketedDecl {
  field: keyof Omit<Theme, 'spacingBase' | 'reverse'>;
  token: string;
  value: string;
}

function bucket(prop: string, value: string): BucketedDecl | null {
  for (const prefix of NAMESPACE_PREFIXES) {
    if (prop === prefix) {
      // bare `--spacing: 0.25rem;` — record under empty token name; spacing
      // handles this specially. For other namespaces a bare token doesn't
      // produce a utility, so we just ignore it.
      return { field: NAMESPACE_MAP[prefix]!, token: '', value };
    }
    if (prop.startsWith(`${prefix}-`)) {
      return {
        field: NAMESPACE_MAP[prefix]!,
        token: prop.slice(prefix.length + 1),
        value
      };
    }
  }
  return null;
}

// Parse the user-supplied theme CSS. The default theme is applied first so
// any namespace the user omits still has v4-spec defaults.
//
// v4 semantics:
// - `@theme { --color-foo: initial; }` deletes a default token
// - `@theme { --color-*: initial; }` deletes the whole namespace
// - `@theme inline { ... }` is treated the same here (we only care about
// the values, not their compile-time/runtime distinction)
export function parseTheme(themeCSS: string | undefined): Theme {
  const base = defaultTheme();
  if (!themeCSS || !themeCSS.trim()) return base;

  // Mutable working copy.
  const working: Omit<Theme, 'reverse'> = {
    color: { ...base.color },
    spacing: { ...base.spacing },
    font: { ...base.font },
    text: { ...base.text },
    fontWeight: { ...base.fontWeight },
    tracking: { ...base.tracking },
    leading: { ...base.leading },
    breakpoint: { ...base.breakpoint },
    container: { ...base.container },
    radius: { ...base.radius },
    shadow: { ...base.shadow },
    insetShadow: { ...base.insetShadow },
    dropShadow: { ...base.dropShadow },
    blur: { ...base.blur },
    perspective: { ...base.perspective },
    aspect: { ...base.aspect },
    ease: { ...base.ease },
    animate: { ...base.animate },
    tabSize: { ...base.tabSize },
    zoom: { ...base.zoom },
    spacingBase: base.spacingBase
  };

  const root = safeParser(themeCSS);

  const applyDecl = (decl: Declaration) => {
    if (decl.prop === '--*') {
      if (decl.value.trim() === 'initial') {
        resetAllNamespaces(working);
      }
      return;
    }

    const bucketed = bucket(decl.prop, decl.value.trim());
    if (!bucketed) return;

    // Namespace-wide reset: `--color-*: initial;`
    if (bucketed.token === '*') {
      if (bucketed.value.trim() === 'initial') {
        (working as Record<string, ThemeNamespace | string>)[bucketed.field] =
          {};
      }
      return;
    }

    if (bucketed.token === '') {
      // Bare `--spacing: 0.5rem;` redefines the spacing base and we
      // re-derive the canonical scale from it.
      if (bucketed.field === 'spacing') {
        working.spacingBase = bucketed.value;
        working.spacing = buildSpacingNamespace(bucketed.value);
      }
      return;
    }

    const ns = working[bucketed.field] as ThemeNamespace;
    if (bucketed.value === 'initial') {
      delete ns[bucketed.token];
    } else {
      ns[bucketed.token] = bucketed.value;
    }
  };

  root.walkAtRules('theme', (at: AtRule) => {
    at.walkDecls(applyDecl);
  });

  // Also accept :root-style declarations so users can drop in a raw block
  // without wrapping in @theme – handy for tests/snippets.
  root.walkRules(rule => {
    if (rule.selector === ':root' || rule.selector === ':host') {
      rule.walkDecls(applyDecl);
    }
  });

  return finalize(working);
}

function resetAllNamespaces(theme: Omit<Theme, 'reverse'>): void {
  for (const key of Object.values(NAMESPACE_MAP)) {
    (theme as Record<string, ThemeNamespace | string>)[key] = {};
  }
  theme.spacingBase = '0.25rem';
}
