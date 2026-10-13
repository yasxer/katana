export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Linear 0 → 1 while `p` travels from `a` to `b`. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export type Stop = readonly [progress: number, value: number];

/** Keyframes: eased interpolation between `[progress, value]` stops. */
export function kf(p: number, stops: readonly Stop[], ease: (t: number) => number = easeInOut) {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [p0, v0] = stops[i - 1];
      const [p1, v1] = stops[i];
      return lerp(v0, v1, ease((p - p0) / (p1 - p0)));
    }
  }
  return stops[stops.length - 1][1];
}
