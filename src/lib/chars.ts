import { clamp, smooth } from './math';

const last = new WeakMap<HTMLElement, number>();

export const queryChars = (root: ParentNode | null) =>
  root ? Array.from(root.querySelectorAll<HTMLElement>('.ch')) : [];

/**
 * Staggered blur reveal. `tIn` sweeps the characters in from the left,
 * `tOut` sweeps them back out in the same direction.
 */
export function setChars(chars: HTMLElement[], tIn: number, tOut = 0, blur = 16, spread = 7) {
  const n = chars.length;
  for (let i = 0; i < n; i++) {
    const a = smooth(clamp((tIn * (n + spread) - i) / spread));
    const b = smooth(clamp((tOut * (n + spread) - i) / spread));
    const v = Math.round(a * (1 - b) * 200) / 200;
    const c = chars[i];
    if (last.get(c) === v) continue;
    last.set(c, v);
    c.style.opacity = String(v);
    c.style.filter = v > 0.995 ? 'none' : `blur(${((1 - v) * blur).toFixed(1)}px)`;
  }
}
