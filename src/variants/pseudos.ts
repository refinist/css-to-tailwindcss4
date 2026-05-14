// CSS pseudo (class/element) → Tailwind v4 variant name.
//
// Only entries where the variant maps one-to-one to a documented v4
// variant live here; richer cases (has(...), not(...), nth-child(n+2)...)
// are produced programmatically by the selector translator.

export const PSEUDO_VARIANT: Record<string, string> = {
  hover: 'hover',
  focus: 'focus',
  'focus-within': 'focus-within',
  'focus-visible': 'focus-visible',
  active: 'active',
  visited: 'visited',
  target: 'target',
  'first-child': 'first',
  'last-child': 'last',
  'only-child': 'only',
  'first-of-type': 'first-of-type',
  'last-of-type': 'last-of-type',
  'only-of-type': 'only-of-type',
  empty: 'empty',
  disabled: 'disabled',
  enabled: 'enabled',
  checked: 'checked',
  indeterminate: 'indeterminate',
  default: 'default',
  required: 'required',
  valid: 'valid',
  invalid: 'invalid',
  'in-range': 'in-range',
  'out-of-range': 'out-of-range',
  'placeholder-shown': 'placeholder-shown',
  autofill: 'autofill',
  'read-only': 'read-only',
  'read-write': 'read-write',
  'user-valid': 'user-valid',
  'user-invalid': 'user-invalid',
  'any-link': 'any-link',
  // v4 also introduces:
  open: 'open',
  inert: 'inert',
  'popover-open': 'popover-open',
  'details-content': 'details-content',
  // Pseudo-elements:
  before: 'before',
  after: 'after',
  placeholder: 'placeholder',
  'first-letter': 'first-letter',
  'first-line': 'first-line',
  marker: 'marker',
  selection: 'selection',
  'file-selector-button': 'file',
  backdrop: 'backdrop'
};

// nth-child(odd|even|N) shorthand recognition.
export function nthChildVariant(arg: string): string | null {
  const a = arg.trim();
  if (a === 'odd' || a === '2n+1') return 'odd';
  if (a === 'even' || a === '2n') return 'even';
  const n = a.match(/^(\d+)$/);
  if (n) return `nth-${n[1]}`;
  return null;
}
