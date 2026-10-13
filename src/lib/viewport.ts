/**
 * A viewport height the layout can rely on.
 *
 * On phones the visible height changes every time the browser's address bar
 * slides in or out (and in in-app browsers the whole web view resizes). This
 * page is ~15 viewports tall, so sizing it from the live height makes the
 * document grow and shrink under the reader's finger: the scroll position
 * jumps and, at the very bottom, the page fights its way back up.
 *
 * So the height is locked per width: it resets on a real resize or rotation
 * (width changes) and otherwise only ever grows. It is published as the CSS
 * variable `--vh` (1% of that height) and every stylesheet uses it instead of
 * the `vh` unit.
 */
let width = 0;
let height = 0;

/** The browser's "large viewport" (address bar hidden), where supported. */
function largeViewportHeight() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
  document.documentElement.append(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}

function update() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  let next = height;
  if (w !== width) next = Math.max(h, largeViewportHeight());
  else if (h > height || !touch) next = h; // a mouse-driven window may shrink freely
  width = w;
  if (next === height) return;
  height = next;
  document.documentElement.style.setProperty('--vh', `${height / 100}px`);
}

/** Start tracking. Call once, before anything measures the page. */
export function trackViewport() {
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
}

/** Locked viewport height in px: the same value CSS sees as `calc(var(--vh) * 100)`. */
export const viewportHeight = () => height || window.innerHeight;
