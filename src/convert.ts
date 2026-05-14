// Main entry: walk a CSS string, dispatch each declaration through the
// per-property converters, and assemble the result.

import postcss, {
  AtRule,
  Rule as PostCSSRule,
  type ChildNode,
  type Container,
  type Declaration,
  type Rule
} from 'postcss';
import safeParser from 'postcss-safe-parser';

import { arbitraryProperty, dispatch } from './declarations/dispatch.ts';
import { parseTheme } from './theme/parse.ts';
import { reduceClasses } from './utils/reduce.ts';
import { selectorToVariants } from './utils/selector.ts';
import {
  containerParamsToVariants,
  mediaParamsToVariants,
  supportsParamsToVariants
} from './variants/media.ts';
import type {
  ConvertedRule,
  ConvertOptions,
  ConvertResult,
  Theme
} from './types.ts';

interface Context {
  theme: Theme;
  options: ConvertOptions;
}

interface ApplyTarget {
  rule: Rule;
  classes: string[];
}

export async function convertCSS(
  css: string,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const theme = parseTheme(options.themeCSS);
  const ctx: Context = { theme, options };

  let root = safeParser(css);
  if (options.postCSSPlugins && options.postCSSPlugins.length) {
    const processed = await postcss(options.postCSSPlugins).process(root, {
      from: undefined
    });
    root = processed.root as import('postcss').Root;
  }

  const rules: ConvertedRule[] = [];
  const allClasses: string[] = [];
  const applyTargets = new Map<string, ApplyTarget>();

  root.walkRules(rule => {
    // Skip rules nested inside @theme/@font-face etc. (parent isn't a media/container).
    if (!isConvertibleParent(rule.parent as Container)) return;

    const variantsFromAncestors = ancestorVariants(ctx, rule);
    if (variantsFromAncestors === null) return; // unsupported ancestor at-rule

    const { variants: selectorVariants, base } = selectorToVariants(
      rule.selector
    );
    const variants = [...variantsFromAncestors, ...selectorVariants];

    const classes: string[] = [];
    const leftover: ConvertedRule['leftover'] = [];

    rule.walkDecls(decl => {
      const produced = convertDecl(ctx, decl);
      if (produced && produced.length) {
        for (const cls of produced) {
          classes.push(
            applyVariantsAndImportant(
              cls,
              variants,
              decl.important,
              options.prefix
            )
          );
        }
        decl.remove();
      } else if (ctx.options.arbitraryProperties) {
        const ap = arbitraryProperty(decl);
        if (ap) {
          classes.push(
            applyVariantsAndImportant(
              ap,
              variants,
              decl.important,
              options.prefix
            )
          );
          decl.remove();
        } else {
          leftover.push({
            prop: decl.prop,
            value: decl.value,
            important: Boolean(decl.important)
          });
        }
      } else {
        leftover.push({
          prop: decl.prop,
          value: decl.value,
          important: Boolean(decl.important)
        });
      }
    });

    if (classes.length === 0 && leftover.length === 0) return;

    const reduced = reduceClasses(classes);
    rules.push({
      selector: base || rule.selector,
      classes: reduced,
      leftover,
      variants
    });
    allClasses.push(...reduced);

    if (reduced.length) {
      const targetSelector = variants.length && base ? base : null;
      const target = getApplyTarget(applyTargets, rule, targetSelector);
      target.classes.push(...reduced);
    }
  });

  for (const target of applyTargets.values()) {
    target.rule.prepend(
      new AtRule({ name: 'apply', params: target.classes.join(' ') })
    );
  }

  cleanup(root as import('postcss').Root);

  return {
    rules,
    classes: allClasses,
    css: root.toString()
  };
}

// Walk parent atrules and pull variants from each. Returns null on a
// parent we don't know how to translate (so the rule is skipped).
function ancestorVariants(ctx: Context, rule: Rule): string[] | null {
  const collected: string[] = [];
  let cursor: Container | undefined = rule.parent as Container | undefined;
  while (cursor && cursor.type === 'atrule') {
    const at = cursor as AtRule;
    let variants: string[] | null = null;
    if (at.name === 'media') {
      variants = mediaParamsToVariants(ctx.theme, at.params);
    } else if (at.name === 'container') {
      variants = containerParamsToVariants(ctx.theme, at.params);
    } else {
      variants = supportsParamsToVariants(at.params);
    }
    if (variants === null) return null;
    collected.unshift(...variants);
    cursor = cursor.parent as Container | undefined;
  }
  return collected;
}

function isConvertibleParent(parent: Container): boolean {
  if (parent.type === 'root') return true;
  if (parent.type === 'atrule') {
    const name = (parent as AtRule).name;
    return name === 'media' || name === 'container' || name === 'supports';
  }
  return false;
}

function convertDecl(ctx: Context, decl: Declaration): string[] | null {
  return dispatch(decl, ctx.theme, ctx.options);
}

function applyVariantsAndImportant(
  cls: string,
  variants: string[],
  important: boolean,
  prefix?: string
): string {
  const variantChain = variants.length ? `${variants.join(':')}:` : '';
  const shouldPrefix = Boolean(prefix) && cls[0] !== '[';
  const withVariants = shouldPrefix
    ? `${prefix}:${variantChain}${cls}`
    : `${variantChain}${cls}`;
  return important ? `${withVariants}!` : withVariants;
}

function getApplyTarget(
  targets: Map<string, ApplyTarget>,
  originalRule: Rule,
  targetSelector: string | null
): ApplyTarget {
  const key = targetSelector ?? ruleKey(originalRule);
  const existing = targets.get(key);
  if (existing) return existing;

  if (!targetSelector) {
    const target = { rule: originalRule, classes: [] };
    targets.set(key, target);
    return target;
  }

  const rule = new PostCSSRule({ selector: targetSelector }) as Rule;
  const rootChild = upToRootChild(originalRule);
  originalRule.root().insertBefore(rootChild ?? originalRule, rule);
  const target = { rule, classes: [] };
  targets.set(key, target);
  return target;
}

function ruleKey(rule: Rule, selector = rule.selector): string {
  let cursor: Container | undefined = rule.parent as Container | undefined;
  let parentKey = '';
  while (cursor && cursor.type !== 'root') {
    const at = cursor as AtRule;
    parentKey += `a(${at.name}|${at.params})__`;
    cursor = cursor.parent as Container | undefined;
  }
  return parentKey + selector;
}

function upToRootChild(rule: Rule): ChildNode | null {
  let current: ChildNode = rule;
  let child: ChildNode | null = null;
  while (current.parent && current.parent.type !== 'root') {
    child = current.parent as ChildNode;
    current = current.parent as ChildNode;
  }
  return child;
}

function cleanup(root: import('postcss').Root) {
  root.walkRules(node => {
    if (!node.nodes || node.nodes.length === 0) node.remove();
    else node.cleanRaws(true);
  });
  root.walkAtRules(node => {
    if (!node.nodes || node.nodes.length === 0) {
      // empty @media/@container produced by removing all decls — drop it
      if (['media', 'container', 'supports'].includes(node.name)) {
        node.remove();
      }
    } else {
      node.cleanRaws(true);
    }
  });
}
