// Cosmetic post-processing for the array of classes emitted by a single
// rule. Two operations, in order:
//
// 1. dedupe — same class twice on one element is always redundant.
// 2. axis merge — `pt-4 pr-4 pb-4 pl-4` → `p-4`; `pt-2 pb-2` → `py-2`;
// and the equivalent for margin, scroll-margin, scroll-padding,
// inset, border-width per side, border-radius corners.
//
// Each merge is variant-aware: we group by the variant chain so
// `hover:pt-2 hover:pb-2` collapses to `hover:py-2` while leaving any
// non-hover siblings alone.

// Public entry. Returns a new array; never mutates the input.
export function reduceClasses(classes: string[]): string[] {
  const deduped = dedupe(classes);
  return mergeAxes(deduped);
}

function dedupe(classes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of classes) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

// Each entry describes one "axis family". `base` is the shorthand prefix
// (e.g. `p`, `m`, `rounded`); `sides` are the four primary sides; `pairs`
// map adjacent sides to their axis utility name.
interface AxisFamily {
  base: string;
  // [top, right, bottom, left] in that order
  sides: [string, string, string, string];
  // {axis name → indices of sides covered}. `xy` means rolls up to base.
  pairs: Array<{ name: string; sides: [number, number] }>;
}

function spacingFamily(base: string, sidePrefix: string): AxisFamily {
  return {
    base,
    sides: [
      `${sidePrefix}t`,
      `${sidePrefix}r`,
      `${sidePrefix}b`,
      `${sidePrefix}l`
    ],
    pairs: [
      { name: `${sidePrefix}y`, sides: [0, 2] },
      { name: `${sidePrefix}x`, sides: [1, 3] }
    ]
  };
}

const SPACING_FAMILIES: AxisFamily[] = [
  spacingFamily('p', 'p'),
  spacingFamily('m', 'm'),
  spacingFamily('scroll-p', 'scroll-p'),
  spacingFamily('scroll-m', 'scroll-m'),
  {
    base: 'inset',
    sides: ['top', 'right', 'bottom', 'left'],
    pairs: [
      { name: 'inset-y', sides: [0, 2] },
      { name: 'inset-x', sides: [1, 3] }
    ]
  },
  {
    base: 'border',
    sides: ['border-t', 'border-r', 'border-b', 'border-l'],
    pairs: [
      { name: 'border-y', sides: [0, 2] },
      { name: 'border-x', sides: [1, 3] }
    ]
  }
];

const RADIUS_FAMILY: AxisFamily = {
  base: 'rounded',
  // tl, tr, br, bl (clockwise from top-left). The "pairs" then describe
  // top-edge / right-edge / bottom-edge / left-edge groupings.
  sides: ['rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl'],
  pairs: [
    { name: 'rounded-t', sides: [0, 1] },
    { name: 'rounded-r', sides: [1, 2] },
    { name: 'rounded-b', sides: [2, 3] },
    { name: 'rounded-l', sides: [3, 0] }
  ]
};

interface DecomposedClass {
  variants: string; // joined variant prefix incl. trailing colon, empty if none
  prefix: string; // utility prefix without trailing dash, sign stripped (e.g. "pt", "border-t")
  negative: boolean; // true if the utility was emitted with a leading '-'
  value: string; // value suffix (e.g. "4", "auto", "[10px]"); empty if no value
  important: boolean;
  raw: string;
}

function decompose(cls: string): DecomposedClass {
  let raw = cls;
  let important = false;
  if (raw.endsWith('!')) {
    important = true;
    raw = raw.slice(0, -1);
  }
  // Split off the variant chain. Variant tokens never contain `[`. We
  // find the rightmost ':' that's not inside `[...]`.
  let depth = 0;
  let lastColon = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    else if (ch === ':' && depth === 0) lastColon = i;
  }
  const variants = lastColon >= 0 ? raw.slice(0, lastColon + 1) : '';
  let utility = lastColon >= 0 ? raw.slice(lastColon + 1) : raw;
  const negative = utility.startsWith('-');
  if (negative) utility = utility.slice(1);

  // The utility splits into prefix + "-" + value. Some classes have no
  // value (e.g. `flex`, `block`) — for those we treat value as ''.
  const dashIdx = lastDashSplit(utility);
  let prefix: string, value: string;
  if (dashIdx === -1) {
    prefix = utility;
    value = '';
  } else {
    prefix = utility.slice(0, dashIdx);
    value = utility.slice(dashIdx + 1);
  }
  return { variants, prefix, negative, value, important, raw: cls };
}

// Find the dash that separates prefix from value, accounting for
// arbitrary-value brackets/parens. Returns -1 when there's no value.
function lastDashSplit(utility: string): number {
  // arbitrary value form: `xxx-[…]` or `xxx-(…)`. The bracket starts
  // immediately after a dash.
  const bracket = utility.search(/-[[(]/);
  if (bracket !== -1) return bracket;
  const lastDash = utility.lastIndexOf('-');
  if (lastDash <= 0) return -1;
  return lastDash;
}

function mergeAxes(classes: string[]): string[] {
  // Build a working list of decomposed entries plus their original index.
  const entries = classes.map((c, idx) => ({ idx, dec: decompose(c) }));

  // Group by (variants + sign + important) for variant-aware merging.
  // Negative and positive sides never merge with each other.
  const byScope = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.dec.variants}${e.dec.negative ? '-' : ''}${e.dec.important ? '!' : ''}`;
    let bucket = byScope.get(key);
    if (!bucket) {
      bucket = [];
      byScope.set(key, bucket);
    }
    bucket.push(e);
  }

  // Indexes we've consumed (because they merged into a shorthand). The
  // shorthand replacement happens at the lowest original index.
  const replaced = new Map<number, string>();
  const removed = new Set<number>();

  for (const bucket of byScope.values()) {
    for (const family of [...SPACING_FAMILIES, RADIUS_FAMILY]) {
      tryFamilyMerge(bucket, family, replaced, removed);
    }
  }

  const out: string[] = [];
  for (let i = 0; i < classes.length; i++) {
    if (removed.has(i)) continue;
    const replacement = replaced.get(i);
    out.push(replacement ?? classes[i]!);
  }
  return out;
}

function tryFamilyMerge(
  bucket: Array<{ idx: number; dec: DecomposedClass }>,
  family: AxisFamily,
  replaced: Map<number, string>,
  removed: Set<number>
) {
  // Index by prefix → { value → entry }. Each side keeps the LAST entry
  // for a given prefix (later utility wins in v4's order).
  const sideEntries: Array<Map<string, { idx: number }> | null> = [
    null,
    null,
    null,
    null
  ];
  for (let s = 0; s < 4; s++) {
    sideEntries[s] = new Map();
  }
  for (const e of bucket) {
    const sideIdx = family.sides.indexOf(e.dec.prefix);
    if (sideIdx === -1) continue;
    sideEntries[sideIdx]!.set(e.dec.value, { idx: e.idx });
  }

  // Find values present on all four sides — full shorthand.
  const fullValues = collectCommon(
    sideEntries as Array<Map<string, { idx: number }>>
  );
  for (const value of fullValues) {
    const indices = [0, 1, 2, 3].map(s => sideEntries[s]!.get(value)!.idx);
    const lowest = Math.min(...indices);
    const sample = bucket.find(e => e.idx === lowest)!.dec!;
    const replacement = formatClass(
      sample.variants,
      family.base,
      value,
      sample.important,
      sample.negative
    );
    replaced.set(lowest, replacement);
    for (const i of indices) if (i !== lowest) removed.add(i);
    for (let s = 0; s < 4; s++) sideEntries[s]!.delete(value);
  }

  // Pair merges (axis or edge).
  for (const pair of family.pairs) {
    const [a, b] = pair.sides;
    const common = intersectMaps(sideEntries[a]!, sideEntries[b]!);
    for (const value of common) {
      const ia = sideEntries[a]!.get(value)!.idx;
      const ib = sideEntries[b]!.get(value)!.idx;
      const lowest = Math.min(ia, ib);
      const sample = bucket.find(e => e.idx === lowest)!.dec!;
      const replacement = formatClass(
        sample.variants,
        pair.name,
        value,
        sample.important,
        sample.negative
      );
      replaced.set(lowest, replacement);
      const other = lowest === ia ? ib : ia;
      removed.add(other);
      sideEntries[a]!.delete(value);
      sideEntries[b]!.delete(value);
    }
  }
}

function collectCommon(maps: Array<Map<string, unknown>>): string[] {
  const out: string[] = [];
  for (const key of maps[0]!.keys()) {
    if (maps.every(m => m.has(key))) out.push(key);
  }
  return out;
}

function intersectMaps(
  a: Map<string, unknown>,
  b: Map<string, unknown>
): string[] {
  const out: string[] = [];
  for (const k of a.keys()) if (b.has(k)) out.push(k);
  return out;
}

function formatClass(
  variants: string,
  prefix: string,
  value: string,
  important: boolean,
  negative: boolean
): string {
  const utility = `${prefix}-${value}`;
  const signed = negative ? `-${utility}` : utility;
  return `${variants}${signed}${important ? '!' : ''}`;
}
