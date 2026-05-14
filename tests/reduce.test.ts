import { describe, expect, test } from 'vitest';
import { reduceClasses } from '../src/utils/reduce.ts';

describe('reduceClasses – dedupe', () => {
  test('removes exact duplicates while preserving order', () => {
    expect(reduceClasses(['flex', 'p-4', 'flex', 'text-white'])).toEqual([
      'flex',
      'p-4',
      'text-white'
    ]);
  });

  test('treats variant-prefixed duplicates as duplicates', () => {
    expect(reduceClasses(['hover:bg-red-500', 'hover:bg-red-500'])).toEqual([
      'hover:bg-red-500'
    ]);
  });
});

describe('reduceClasses – axis merging', () => {
  test('merges four equal-value sides into the base utility', () => {
    expect(reduceClasses(['pt-4', 'pr-4', 'pb-4', 'pl-4'])).toEqual(['p-4']);
  });

  test('merges opposite sides into x/y axes', () => {
    expect(reduceClasses(['pt-2', 'pb-2'])).toEqual(['py-2']);
    expect(reduceClasses(['pr-3', 'pl-3'])).toEqual(['px-3']);
  });

  test('handles negative values', () => {
    expect(reduceClasses(['-mt-1', '-mb-1'])).toEqual(['-my-1']);
  });

  test('only merges within the same variant scope', () => {
    expect(reduceClasses(['hover:pt-2', 'hover:pb-2', 'pl-2'])).toEqual([
      'hover:py-2',
      'pl-2'
    ]);
  });

  test('respects important: hover:pt-2! and hover:pb-2! merge, plain ones do not', () => {
    expect(reduceClasses(['hover:pt-2!', 'hover:pb-2!', 'hover:pt-2'])).toEqual(
      ['hover:py-2!', 'hover:pt-2']
    );
  });

  test('keeps unrelated classes untouched', () => {
    expect(reduceClasses(['flex', 'pt-2', 'pb-2', 'text-white'])).toEqual([
      'flex',
      'py-2',
      'text-white'
    ]);
  });

  test('merges inset corners', () => {
    expect(reduceClasses(['top-0', 'right-0', 'bottom-0', 'left-0'])).toEqual([
      'inset-0'
    ]);
  });

  test('merges arbitrary values', () => {
    expect(reduceClasses(['pt-[10px]', 'pb-[10px]'])).toEqual(['py-[10px]']);
  });

  test('does not merge when values differ', () => {
    expect(reduceClasses(['pt-2', 'pb-4'])).toEqual(['pt-2', 'pb-4']);
  });
});

describe('reduceClasses – border-radius corners', () => {
  test('merges all four corners with the same value', () => {
    expect(
      reduceClasses([
        'rounded-tl-md',
        'rounded-tr-md',
        'rounded-br-md',
        'rounded-bl-md'
      ])
    ).toEqual(['rounded-md']);
  });

  test('merges adjacent corners into edge shorthand', () => {
    expect(reduceClasses(['rounded-tl-md', 'rounded-tr-md'])).toEqual([
      'rounded-t-md'
    ]);
    expect(reduceClasses(['rounded-bl-md', 'rounded-br-md'])).toEqual([
      'rounded-b-md'
    ]);
  });
});
