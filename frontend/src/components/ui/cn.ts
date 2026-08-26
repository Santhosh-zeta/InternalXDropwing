export type ClassValue = string | number | null | false | undefined | ClassValue[];

/**
 * Minimal class-name joiner.
 *
 * Note: this does NOT resolve conflicting Tailwind utilities the way
 * `tailwind-merge` does — neither it nor `clsx` is a dependency of this
 * project. Consumer `className` is always concatenated last, so pass
 * overrides there and avoid supplying two utilities from the same group.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue): void => {
    if (value === null || value === undefined || value === false || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    out.push(String(value));
  };

  inputs.forEach(walk);
  return out.join(' ');
}

/**
 * Translucent version of a CSS colour, for inline `style` values.
 *
 * Use this instead of appending hex alpha (`${c}1a`). That trick only works
 * when `c` is a hex literal — for a token like `var(--color-emerald)` it
 * yields `var(--color-emerald)1a`, which the browser drops silently, so the
 * element renders with no background at all.
 *
 * `color-mix` accepts hex, rgb() and var() alike.
 */
export function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
