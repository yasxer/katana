import { kf, seg } from '../../lib/math';
import { TOTAL_LEN } from '../../three/katana';
import type { KatanaPlacement } from '../../three/rig';

type Range = readonly [start: number, end: number];

// ── Katana beats, as fractions of the stage's scroll progress
const REST = 0.22; // settled: horizontal, sheathed, turning
const DRAW_START = 0.24;
const DRAWN = 0.34; // blade fully clear of the scabbard
const PARTED = 0.45; // scabbard has tumbled to its place under the text
const MEET_START = 0.62; // the painting opens: both close in on each other
const IN_LINE = 0.7; // scabbard back on the blade's axis, tip at its mouth
const SHEATHED = 0.77; // slid half-way home, filling the screen
const HOLD_END = 0.84;
const EXIT_END = 0.94;

/** Scroll phases of everything that is not the katana. */
export const PHASE = {
  heroOut: [0.012, 0.13],
  bubbleOut: [0.1, 0.17],
  line1In: [0.16, 0.22],
  line1Out: [0.265, 0.31],
  line2In: [0.32, 0.37],
  line2Out: [0.425, 0.47],
  line3In: [0.48, 0.53],
  line3Out: [0.575, 0.62],
  paintingIn: [0.585, 0.675],
  paintingPan: [0.585, 0.95],
  dialogIn: [0.655, 0.685],
  say1Type: [0.685, 0.74],
  say1Out: [0.765, 0.78],
  say2Type: [0.78, 0.86],
  dialogOut: [0.88, 0.905],
  wipe: [0.905, 0.975],
  glFade: [0.9, 0.94],
  after1In: [0.925, 0.948],
  after1Out: [0.956, 0.972],
  after2In: [0.972, 0.995],
} as const satisfies Record<string, Range>;

/** Progress at which the header switches to its dark-on-light theme. */
export const THEME_FLIP = 0.945;
/** Where the hero's "Next" button lands: sword at rest, first line on screen. */
export const NEXT_STOP = 0.225;

const TURN = Math.PI * 2;
const linear = (t: number) => t;

/** How strongly the katana keeps turning on its own while the page is still. */
export const idleWeight = (q: number) => seg(q, 0.1, REST) * (1 - seg(q, MEET_START - 0.04, MEET_START + 0.02));

/**
 * Katana placement for a given progress.
 *
 * `aspect` is the viewport's width / height. `idle` is extra roll accumulated
 * over time, so the sword and its scabbard keep turning when nobody scrolls.
 */
export function stagePose(q: number, aspect: number, idle: number): KatanaPlacement {
  const portrait = aspect < 1;
  const restLen = portrait ? 0.86 : 0.62;
  const restX = portrait ? 0.19 : 0.135;
  // While the blade is drawn the camera eases back, so sword and scabbard
  // both stay on screen end to end.
  const drawLen = 0.5;
  const drawX = 0.32;
  // The close-up over the painting: scabbard from the left, blade from the right.
  const meetLen = portrait ? 1.7 : 1.2;
  const meetX = portrait ? 0.46 : 0.4;

  const len = kf(q, [[0, portrait ? 4.2 : 2.5], [REST, restLen], [DRAW_START, restLen], [DRAWN, drawLen], [PARTED, restLen], [MEET_START, restLen], [SHEATHED, meetLen], [HOLD_END, meetLen], [EXIT_END, meetLen * 1.2]]);
  const x = kf(q, [[0, 0.2], [REST, restX], [DRAW_START, restX], [DRAWN, drawX], [PARTED, restX], [MEET_START, restX], [SHEATHED, meetX], [HOLD_END, meetX], [EXIT_END, portrait ? 2.6 : 1.7]]);
  const y = kf(q, [[0, 0.16], [REST, 0.2], [MEET_START, 0.2], [IN_LINE + 0.03, 0]]);

  // Roll: the hero's three-quarter view, one turn while it settles, then a
  // steady turn for as long as the reader scrolls (plus the idle drift)…
  const free = kf(q, [[0, 0.55], [REST, 0.55 - TURN]]) + kf(q, [[REST, 0], [MEET_START, -1.5 * TURN]], linear) + idle;
  // …until the close-up, where it eases to the nearest flat-on view and holds.
  const flat = Math.round((free - 0.2) / TURN) * TURN + 0.2;
  const roll = free + (flat - free) * kf(q, [[MEET_START, 0], [IN_LINE, 1]]);

  // the scabbard's own spot under the text, converted from viewport fractions to sword-local units
  const unitsPerWidth = TOTAL_LEN / len;

  return {
    len,
    x,
    y,
    ry: kf(q, [[0, -0.62], [REST, 0]]),
    rz: kf(q, [[0, 0.44], [REST, 0], [MEET_START, 0], [SHEATHED, 0.07], [HOLD_END, 0.07], [EXIT_END, 0.13]]),
    roll,
    saya: {
      // off along the curve, held, half-way back on over the painting, then away for good
      draw: kf(q, [[DRAW_START, 0], [DRAWN, 1], [IN_LINE, 1], [SHEATHED, 0.45], [HOLD_END, 0.45], [EXIT_END, 2.6]]),
      parted: kf(q, [[DRAWN, 0], [PARTED, 1], [MEET_START, 1], [IN_LINE, 0]]),
      freeX: (restX + 0.03 - x) * unitsPerWidth,
      freeY: ((-0.17 - y) / aspect) * unitsPerWidth,
      // one full tumble on its way down, finished before it drifts in under the text
      spin: kf(q, [[DRAWN, 0], [DRAWN + (PARTED - DRAWN) * 0.62, -TURN]]),
      // turns out of step with the sword while apart, back in step before they meet
      rollOffset: kf(q, [[DRAWN, 0], [PARTED, 1.3], [MEET_START, 1.3 + Math.PI], [IN_LINE, TURN]]),
    },
  };
}
