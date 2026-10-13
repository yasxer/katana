import { useEffect, useRef } from 'react';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { queryChars, setChars } from '../../lib/chars';
import { clamp, easeOut, lerp, seg, smooth } from '../../lib/math';
import { Mosaic } from '../../lib/Mosaic';
import { viewportHeight } from '../../lib/viewport';
import { pinProgress, useBounds, useFrame, useScroll } from '../../scroll/ScrollProvider';
import { useKatana } from '../../three/KatanaProvider';
import { animateGlow, placeKatana, placeSaya } from '../../three/rig';
import { Dialog } from './Dialog';
import { Hero } from './Hero';
import { NEXT_STOP, PHASE, THEME_FLIP, idleWeight, stagePose } from './timeline';
import './stage.css';

const OWNER = 'stage';
const INTRO_MS = 2200;
const PAPER = '#efefec';
const TURN = Math.PI * 2;
const LINES = ['Be Still', 'Draw the Blade', 'The Steel Awakens'];
/** Shown in ink over the white wipe that closes the scene. */
const AFTER = ['Breathe in…', 'And look closer.'];

/** Everything the frame loop touches, collected once after mount. */
interface Rig {
  pin: HTMLElement;
  mosaic: Mosaic;
  wipe: Mosaic;
  painting: HTMLImageElement;
  inkTree: HTMLElement;
  heroLines: HTMLElement[];
  title: HTMLElement;
  titleEchoes: HTMLElement[];
  word: HTMLElement;
  wordEchoes: HTMLElement[];
  wordChars: HTMLElement[];
  heroFade: HTMLElement[];
  bubble: HTMLElement[];
  lines: HTMLElement[][];
  after: HTMLElement[][];
  dialog: HTMLElement;
  says: { el: HTMLElement; chars: HTMLElement[] }[];
  dialogBar: HTMLElement;
}

/** 01 · The blade — a pinned, scroll-driven sequence around a real-time 3D katana. */
export function Stage({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const { scrollTo } = useScroll();
  const director = useKatana();
  const rig = useRef<Rig | null>(null);
  const introStart = useRef(0);
  const live = useRef({
    progress: 0,
    velocity: 0,
    idle: 0,
    time: 0,
    typed: [-1, -1],
    mouse: { x: 0, y: 0, sx: 0, sy: 0 },
  });

  useEffect(() => {
    if (ready) introStart.current = performance.now() + 250;
  }, [ready]);

  useEffect(() => {
    const el = root.current!;
    const one = <T extends HTMLElement = HTMLElement>(selector: string) => el.querySelector<T>(selector)!;
    const all = (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(selector));

    const painting = new Image();
    painting.src = images.painting;
    const mosaic = new Mosaic(one<HTMLCanvasElement>('.mosaic'));
    const wipe = new Mosaic(one<HTMLCanvasElement>('.wipe'));

    rig.current = {
      pin: one('.pin'),
      mosaic,
      wipe,
      painting,
      inkTree: one('.ink-tree'),
      heroLines: all('.hero-title-stack > h1 .ln > span'),
      title: one('.hero-title-stack > h1'),
      titleEchoes: all('.hero-title-stack > .hero-echo'),
      word: one('.hero-word-stack > .hero-word:not(.hero-echo)'),
      wordEchoes: all('.hero-word-stack > .hero-echo'),
      wordChars: queryChars(one('.hero-word-stack > .hero-word:not(.hero-echo)')),
      heroFade: all('.hero-chip, .hero-meta'),
      bubble: all('.bubble, .bubble-avatar'),
      lines: all('.line.mid').map(queryChars),
      after: all('.line.after').map(queryChars),
      dialog: one('.dialog'),
      says: all('.dialog-text').map((say) => ({ el: say, chars: Array.from(say.querySelectorAll<HTMLElement>('i')) })),
      dialogBar: one('.dialog-bar i'),
    };

    // follow the pinned frame itself: it only changes size on a real resize,
    // not when a phone's address bar moves
    const resizeObserver = new ResizeObserver(() => {
      mosaic.resize();
      wipe.resize();
    });
    resizeObserver.observe(one('.pin'));
    const onPointer = (event: PointerEvent) => {
      live.current.mouse.x = event.clientX / window.innerWidth - 0.5;
      live.current.mouse.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointer);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      rig.current = null;
    };
  }, []);

  useFrame(({ time, y, vh }) => {
    const r = rig.current;
    const k = director.current;
    const b = bounds.current;
    if (!r || !k) return;
    if (y >= b.top + b.height) {
      k.release(OWNER);
      return;
    }

    const state = live.current;
    const dt = Math.min(64, time - (state.time || time));
    state.time = time;
    const p = pinProgress(b, y, vh);
    const at = (range: readonly [number, number]) => seg(p, range[0], range[1]);
    const { mouse } = state;
    mouse.sx = lerp(mouse.sx, mouse.x, 0.06);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.06);

    const intro = introStart.current ? clamp((time - introStart.current) / INTRO_MS) : 0;
    const introE = easeOut(intro);
    const out = at(PHASE.heroOut);

    // ── hero: the type rises out of frame, trailed by fading echoes of itself
    r.heroLines.forEach((line, i) => {
      line.style.transform = `translate3d(0,${(1 - introE) * (125 + i * 30)}%,0)`;
    });
    const echo = Math.sin(Math.PI * out);
    const rise = (lag: number) => smooth(clamp((out - lag) / (1 - lag)));
    r.title.style.transform = `translate3d(0,${-rise(0) * vh * 0.5}px,0)`;
    r.titleEchoes.forEach((ghost, i) => {
      ghost.style.transform = `translate3d(0,${-rise((i + 1) * 0.07) * vh * 0.5}px,0)`;
      ghost.style.opacity = String(echo * (0.5 - i * 0.14));
    });
    setChars(r.wordChars, seg(intro, 0.15, 1), 0, 22);
    r.word.style.transform = `translate3d(0,${-rise(0) * vh}px,0)`;
    r.wordEchoes.forEach((ghost, i) => {
      ghost.style.transform = `translate3d(0,${-rise((i + 1) * 0.06) * vh}px,0)`;
      ghost.style.opacity = String(echo * (0.42 - i * 0.11));
    });

    const uiIn = seg(intro, 0.5, 1);
    const fade = (items: HTMLElement[], gone: number, lift: number) => {
      const alpha = clamp(uiIn - gone * 1.6);
      for (const item of items) {
        item.style.opacity = String(alpha);
        item.style.transform = `translate3d(0,${(1 - uiIn) * 16 - gone * lift}px,0)`;
        item.style.pointerEvents = alpha < 0.5 ? 'none' : '';
      }
    };
    fade(r.heroFade, out, vh * 0.3);
    fade(r.bubble, at(PHASE.bubbleOut), 24); // the greeting lingers a moment longer
    r.inkTree.style.opacity = String(0.8 * introE * (1 - smooth(out)));
    r.inkTree.style.transform = `translate3d(${mouse.sx * -18}px,${mouse.sy * -12 - out * vh * 0.2}px,0) scale(${1 + out * 0.18 + (1 - introE) * 0.08})`;
    document.documentElement.classList.toggle('past-hero', p > 0.07);

    // ── centre lines, then the two that close the scene
    setChars(r.lines[0], at(PHASE.line1In), at(PHASE.line1Out));
    setChars(r.lines[1], at(PHASE.line2In), at(PHASE.line2Out));
    setChars(r.lines[2], at(PHASE.line3In), at(PHASE.line3Out));
    setChars(r.after[0], at(PHASE.after1In), at(PHASE.after1Out));
    setChars(r.after[1], at(PHASE.after2In));

    // ── painting, dialogue, exit wipe
    r.mosaic.drawImage(r.painting, at(PHASE.paintingIn), Math.round(smooth(at(PHASE.paintingPan)) * 500) / 500);
    const dialogIn = at(PHASE.dialogIn);
    const dialogAlpha = dialogIn * (1 - at(PHASE.dialogOut));
    r.dialog.style.opacity = String(dialogAlpha);
    r.dialog.style.transform = `translate3d(0,${(1 - smooth(dialogIn)) * 20}px,0)`;
    r.dialog.style.pointerEvents = dialogAlpha > 0.5 ? '' : 'none';
    const typing = [at(PHASE.say1Type), at(PHASE.say2Type)];
    r.says.forEach((say, n) => {
      const typed = Math.round(typing[n] * say.chars.length);
      if (typed !== state.typed[n]) {
        state.typed[n] = typed;
        say.chars.forEach((char, i) => char.classList.toggle('on', i < typed));
      }
    });
    r.says[0].el.style.opacity = String(1 - at(PHASE.say1Out));
    r.dialogBar.style.transform = `scaleX(${seg(p, PHASE.say1Type[0], PHASE.say2Type[1])})`;
    r.wipe.drawFill(PAPER, Math.round(at(PHASE.wipe) * 400) / 400);

    // ── katana
    k.claim(OWNER, r.pin);
    const { scene } = k;
    const { katana, view } = scene;
    const previous = state.progress;
    state.progress = lerp(state.progress, p, 0.14); // a touch of inertia
    const q = state.progress;
    state.velocity = lerp(state.velocity, q - previous, 0.3);

    // it keeps turning on its own; back in the hero it settles to where it started
    const weight = idleWeight(q);
    if (weight > 0.001) state.idle -= dt * 0.00045 * weight;
    else state.idle += (Math.round(state.idle / TURN) * TURN - state.idle) * 0.08;

    const aspect = view.w / view.h;
    const pose = stagePose(q, aspect, state.idle);
    const slideIn = (1 - introE) * 0.9; // intro: glides in from the right
    pose.x += slideIn + (mouse.sx * 0.12) / view.w;
    pose.y += Math.sin(time * 0.0011) * 0.006 + slideIn * 0.4 - (mouse.sy * 0.08) / view.h;
    pose.ry += mouse.sx * 0.1 - slideIn * 0.5;
    pose.roll += mouse.sy * 0.12;
    katana.saya.visible = true;
    const scale = placeKatana(scene, pose);
    animateGlow(scene, scale, time);

    // motion trail behind the scabbard while it tumbles
    const trail = Math.sin(Math.PI * pose.saya.parted) * Math.min(1, Math.abs(state.velocity) * 500);
    katana.ghosts.forEach((ghost, i) => {
      const alpha = trail * (0.34 - i * 0.09);
      ghost.setOpacity(alpha);
      if (alpha <= 0.004) return;
      const earlier = stagePose(q - Math.sign(state.velocity) * (i + 1) * 0.007, aspect, state.idle);
      placeSaya(ghost.group, earlier.roll, earlier.saya);
    });

    k.setOpacity(1 - at(PHASE.glFade));
    scene.render();
  });

  const toProgress = (p: number, seconds: number) => {
    const b = bounds.current;
    scrollTo(b.top + (b.height - viewportHeight()) * p, seconds);
  };
  const skip = () => {
    const garden = document.getElementById('garden');
    if (garden) scrollTo(garden.offsetTop + viewportHeight() * 0.5);
  };

  return (
    <section className="stage" id="stage" ref={root} data-theme="dark" data-theme-flip={THEME_FLIP}>
      <div className="pin">
        <img className="ink-tree" src={images.inkTree} alt="" />
        <canvas className="mosaic" />
        {/* the shared WebGL canvas is parked here while this section is on screen */}

        <Hero onNext={() => toProgress(NEXT_STOP, 2.6)} />

        {LINES.map((text) => (
          <p className="line mid" aria-label={text} key={text}>
            <SplitChars text={text} />
          </p>
        ))}

        <Dialog onSkip={skip} />
        <canvas className="wipe" />

        {AFTER.map((text) => (
          <p className="line after" aria-label={text} key={text}>
            <SplitChars text={text} />
          </p>
        ))}
      </div>
    </section>
  );
}
