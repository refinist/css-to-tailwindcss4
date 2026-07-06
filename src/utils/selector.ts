// Translate a CSS selector into (a) the variant chain that prefixes every
// generated class and (b) the residual base selector. Anything we can't
// translate keeps the rule as-is (no variant prefix, residual = original).

import selectorParser, {
  type Node,
  type Pseudo
} from 'postcss-selector-parser';

import { nthChildVariant, PSEUDO_VARIANT } from '../variants/pseudos.ts';

export interface SelectorParts {
  // Variant tokens (without the trailing colon). Order matches v4: left to right.
  variants: string[];
  // What's left of the selector after pulling variants off.
  base: string;
}

// Heuristic translator for selectors that can be represented as variants.
export function selectorToVariants(selector: string): SelectorParts {
  const fallback: SelectorParts = { variants: [], base: selector };

  let result: SelectorParts | null = null;

  selectorParser(root => {
    if (root.nodes.length !== 1) return;
    const sel = root.nodes[0]!;

    // Variants may only be pulled from the subject (the compound after the
    // last combinator). A pseudo on an ancestor compound like
    // `.parent:hover .child` cannot be expressed as a variant on the
    // generated classes — lifting it would move the state to the child.
    let lastCombinator = -1;
    for (let i = 0; i < sel.nodes.length; i++) {
      if (sel.nodes[i]!.type === 'combinator') lastCombinator = i;
    }

    const variants: string[] = [];
    const base: Node[] = [];

    for (let i = 0; i < sel.nodes.length; i++) {
      const node = sel.nodes[i]!;
      if (i <= lastCombinator) {
        base.push(node);
        continue;
      }
      const variant = nodeToVariant(node);
      if (variant) {
        variants.push(...variant);
      } else {
        base.push(node);
      }
    }

    // Bail when extraction leaves no subject to attach classes to
    // (pure pseudo selectors like `:hover`, or `.parent > :hover`).
    if (variants.length) {
      const last = base[base.length - 1];
      if (!last || last.type === 'combinator') return;
    }

    result = {
      variants,
      base: base
        .map(n => n.toString())
        .join('')
        .trim()
    };
  }).processSync(selector);

  return result ?? fallback;
}

function nodeToVariant(node: Node): string[] | null {
  if (node.type === 'pseudo') {
    return pseudoToVariant(node);
  }
  if (node.type === 'attribute') {
    // `[data-state="open"]` → `data-[state=open]`
    const attr = node as unknown as {
      attribute: string;
      operator?: string;
      value?: string;
      quoteMark?: string;
    };
    const name = attr.attribute;
    if (name.startsWith('data-') || name.startsWith('aria-')) {
      const kind = name.startsWith('data-') ? 'data' : 'aria';
      const rest = name.slice(name.indexOf('-') + 1);
      if (!attr.operator) {
        // Bare presence. `data-x:` matches `[data-x]` in v4, but `aria-x:`
        // means `[aria-x="true"]`, so aria needs the arbitrary form.
        return kind === 'data' ? [`data-${rest}`] : [`aria-[${rest}]`];
      }
      // Direct equality: `data-[state=open]`
      if (attr.operator === '=' && attr.value) {
        const value = String(attr.value).replace(/\s+/g, '_');
        // `[aria-checked="true"]` is exactly what v4's `aria-checked:` means.
        if (kind === 'aria' && value === 'true') return [`aria-${rest}`];
        return [`${kind}-[${rest}=${value}]`];
      }
    }
    return null;
  }
  return null;
}

function pseudoToVariant(node: Pseudo): string[] | null {
  const name = node.value.replace(/^::?/, '');
  const direct = PSEUDO_VARIANT[name];
  if (direct) return [direct];

  if (name === 'nth-child' && node.nodes.length === 1) {
    const arg = node.nodes[0]!.toString();
    const v = nthChildVariant(arg);
    return v ? [v] : null;
  }
  if (name === 'not' && node.nodes.length === 1) {
    const inner = node.nodes[0]!.toString();
    return [`not-[${inner.replace(/\s+/g, '_')}]`];
  }
  if (name === 'has' && node.nodes.length === 1) {
    const inner = node.nodes[0]!.toString();
    return [`has-[${inner.replace(/\s+/g, '_')}]`];
  }
  if (name === 'is' && node.nodes.length === 1) {
    const inner = node.nodes[0]!.toString();
    return [`[&:is(${inner.replace(/\s+/g, '_')})]`];
  }
  if (name === 'where' && node.nodes.length === 1) {
    const inner = node.nodes[0]!.toString();
    return [`[&:where(${inner.replace(/\s+/g, '_')})]`];
  }
  return null;
}
