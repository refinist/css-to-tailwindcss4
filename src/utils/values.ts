// Small helpers used by declaration converters.

// Split a CSS shorthand into its top-level space-separated tokens, while
// respecting parens (so `var(--a, b)` doesn't get split).
export function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of input.trim()) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && /\s/.test(ch)) {
      if (buf) {
        out.push(buf);
        buf = '';
      }
      continue;
    }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

// `1.0` → `1`, `0.50rem` → `0.5rem`. Doesn't touch exponents.
export function trimNumber(input: string): string {
  return input.replace(/-?\d+\.\d+/g, match => parseFloat(match).toString());
}

// True for tokens we treat as a single dynamic value source (var/calc/env).
export function isDynamicExpression(value: string): boolean {
  return /\b(var|calc|env|min|max|clamp)\(/.test(value);
}

// Pretty-print a list for use inside an arbitrary value like `1px_solid_red`.
export function joinForArbitrary(parts: string[]): string {
  return parts.join('_');
}

// True for CSS variable references such as `var(--brand)`.
export function asCssVarReference(value: string): string | null {
  const m = value.trim().match(/^var\((--[^,)\s]+)\)$/);
  return m ? m[1]! : null;
}
