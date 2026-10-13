import { kf } from '../../lib/math';

type Range = readonly [start: number, end: number];

/** Scroll phases of the pinned stage, as fractions of its total progress. */
export const PHASE = {
  heroOut: [0.012, 0.1],
  line1In: [0.2, 0.27],
  line1Out: [0.355, 0.42],
  line2In: [0.45, 0.51],
  line2Out: [0.57, 0.625],
  paintingIn: [0.585, 0.675],
  paintingPan: [0.585, 0.95],
  dialogIn: [0.65, 0.685],
  dialogType: [0.68, 0.83],
  dialogOut: [0.875, 0.905],
  wipe: [0.905, 0.985],
  glFade: [0.9, 0.94],
} as const satisfies Record<string, Range>;

/** Progress at which the header switches to its dark-on-light theme. */
export const THEME_FLIP = 0.955;
/** Where the hero's "Next" button lands: sword at rest, first line on screen. */
export const NEXT_STOP = 0.265;

// Katana beats
const REST = 0.26; // settled, horizontal, still sheathed
const DRAW_START = 0.27;
const DRAWN = 0.385; // blade fully clear of the scabbard
const PARTED = 0.47; // scabbard resting below the text
const EXIT_START = 0.62;
const EXIT_END = 0.93;

/**
 * Katana pose for a given progress. Positions are fractions of the viewport
 * (0 = centre, ±0.5 = edges) and `len` is the katana's length as a fraction of
 * the viewport width, so the choreography holds at any aspect ratio.
 */
export function katanaPose(q: number, portrait: boolean) {
  const restLen = portrait ? 0.86 : 0.62;
  const restX = portrait ? 0.19 : 0.135;
  // While the blade is drawn the camera eases back, so the sword and the
  // scabbard both stay on screen end to end.
  const drawLen = 0.5;
  const drawX = 0.32;
  const roll = -Math.PI * 2; // one full roll while it settles

  return {
    len: kf(q, [[0, portrait ? 4.2 : 2.5], [REST, restLen], [DRAW_START, restLen], [DRAWN, drawLen], [PARTED, restLen], [EXIT_START, restLen], [EXIT_END, portrait ? 3.2 : 1.9]]),
    // the sword (guard position): pulled right as it is drawn, then exits right across the painting
    x: kf(q, [[0, 0.2], [REST, restX], [DRAW_START, restX], [DRAWN, drawX], [PARTED, restX], [EXIT_START, restX], [EXIT_END, portrait ? 3.4 : 2.1]]),
    y: kf(q, [[0, 0.16], [REST, 0.2], [EXIT_START, 0.2], [0.74, 0.03]]),
    rx: kf(q, [[0, 0.55], [REST, 0.14 + roll], [EXIT_START, 0.14 + roll], [0.78, 0.34 + roll]]),
    ry: kf(q, [[0, -0.62], [REST, 0]]),
    rz: kf(q, [[0, 0.44], [REST, 0]]),

    /** 0 = sheathed, 1 = scabbard slid fully off along the blade's curve */
    draw: kf(q, [[DRAW_START, 0], [DRAWN, 1]]),
    /** 0 = scabbard still in line with the blade, 1 = at its own position below */
    parted: kf(q, [[DRAWN, 0], [PARTED, 1]]),
    // the scabbard's own position once parted (its mouth), then its exit to the left
    sayaX: kf(q, [[PARTED, restX + 0.03], [EXIT_START, restX + 0.03], [EXIT_END, -0.62]]),
    sayaY: kf(q, [[PARTED, -0.17], [EXIT_START, -0.17], [0.74, -0.03]]),
  };
}
