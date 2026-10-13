import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { queryChars, setChars } from '../../lib/chars';
import { clamp, easeOut, lerp, seg, smooth } from '../../lib/math';
import { Mosaic } from '../../lib/Mosaic';
import { viewportHeight } from '../../lib/viewport';
import { pinProgress, useBounds, useFrame, useScroll } from '../../scroll/ScrollProvider';
import { createScene, type KatanaScene } from '../../three/createScene';
import { DRAW_DISTANCE, SORI_RADIUS, TOTAL_LEN } from '../../three/katana';
import { Dialog } from './Dialog';
import { Hero } from './Hero';
import { NEXT_STOP, PHASE, THEME_FLIP, katanaPose } from './timeline';
import './stage.css';

const INTRO_MS = 2200;
const PAPER = '#efefec';
const glowAnchor = new Vector3();

/** Everything the frame loop touches, collected once after mount. */
interface Rig {
  scene: KatanaScene;
  mosaic: Mosaic;
  wipe: Mosaic;
  painting: HTMLImageElement;
  inkTree: HTMLElement;
  heroLines: HTMLElement[];
  heroFade: HTMLElement[];
  wordChars: HTMLElement[];
  line1: HTMLElement[];
  line2: HTMLElement[];
  dialog: HTMLElement;
  dialogChars: HTMLElement[];
  dialogBar: HTMLElement;
}

/** 01 · The blade — a pinned, scroll-driven sequence around a real-time 3D katana. */
export function Stage({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const { scrollTo } = useScroll();
  const rig = useRef<Rig | null>(null);
  const introStart = useRef(0);
  const live = useRef({ progress: 0, typed: -1, mouse: { x: 0, y: 0, sx: 0, sy: 0 } });

  useEffect(() => {
    if (ready) introStart.current = performance.now() + 250;
  }, [ready]);

  useEffect(() => {
    const el = root.current!;
    const one = <T extends HTMLElement = HTMLElement>(selector: string) => el.querySelector<T>(selector)!;
    const all = (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(selector));

    const painting = new Image();
    painting.src = images.painting;
    const scene = createScene(one<HTMLCanvasElement>('.gl'));
    const mosaic = new Mosaic(one<HTMLCanvasElement>('.mosaic'));
    const wipe = new Mosaic(one<HTMLCanvasElement>('.wipe'));

    rig.current = {
      scene,
      mosaic,
      wipe,
      painting,
      inkTree: one('.ink-tree'),
      heroLines: all('.hero-title .ln > span'),
      heroFade: all('.hero-chip, .hero-meta, .bubble, .bubble-avatar'),
      wordChars: queryChars(one('.hero-word')),
      line1: queryChars(one('.line-1')),
      line2: queryChars(one('.line-2')),
      dialog: one('.dialog'),
      dialogChars: all('.dialog-text i'),
      dialogBar: one('.dialog-bar i'),
    };

    const onResize = () => {
      scene.resize();
      mosaic.resize();
      wipe.resize();
    };
    const onPointer = (event: PointerEvent) => {
      live.current.mouse.x = event.clientX / window.innerWidth - 0.5;
      live.current.mouse.y = event.clientY / window.innerHeight - 0.5;
    };
    // follow the pinned frame itself: it only changes size on a real resize,
    // not when a phone's address bar moves
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(one('.pin'));
    window.addEventListener('pointermove', onPointer);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      rig.current = null;
      scene.dispose();
    };
  }, []);

  useFrame(({ time, y, vh }) => {
    const r = rig.current;
    const b = bounds.current;
    if (!r || y >= b.top + b.height) return;

    const p = pinProgress(b, y, vh);
    const at = (range: readonly [number, number]) => seg(p, range[0], range[1]);
    const { mouse } = live.current;
    mouse.sx = lerp(mouse.sx, mouse.x, 0.06);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.06);

    const intro = introStart.current ? clamp((time - introStart.current) / INTRO_MS) : 0;
    const introE = easeOut(intro);
    const out = at(PHASE.heroOut);
    const outE = smooth(out);

    // ── hero typography
    const lineY = (1 - introE) * 125 - outE * 125;
    r.heroLines.forEach((line, i) => {
      line.style.transform = `translate3d(0,${lineY + (1 - introE) * i * 30}%,0)`;
    });
    setChars(r.wordChars, seg(intro, 0.15, 1), out, 22);
    const uiIn = seg(intro, 0.5, 1);
    const uiFade = clamp(uiIn - out * 1.6);
    for (const item of r.heroFade) {
      item.style.opacity = String(uiFade);
      item.style.transform = `translate3d(0,${(1 - uiIn) * 16 - out * 24}px,0)`;
      item.style.pointerEvents = uiFade < 0.5 ? 'none' : '';
    }
    r.inkTree.style.opacity = String(0.8 * introE * (1 - outE));
    r.inkTree.style.transform = `translate3d(${mouse.sx * -18}px,${mouse.sy * -12}px,0) scale(${1 + out * 0.18 + (1 - introE) * 0.08})`;
    document.documentElement.classList.toggle('past-hero', p > 0.07);

    // ── centre lines
    setChars(r.line1, at(PHASE.line1In), at(PHASE.line1Out));
    setChars(r.line2, at(PHASE.line2In), at(PHASE.line2Out));

    // ── painting, dialogue, exit wipe
    r.mosaic.drawImage(r.painting, at(PHASE.paintingIn), Math.round(smooth(at(PHASE.paintingPan)) * 500) / 500);
    const dialogIn = at(PHASE.dialogIn);
    const dialogAlpha = dialogIn * (1 - at(PHASE.dialogOut));
    r.dialog.style.opacity = String(dialogAlpha);
    r.dialog.style.transform = `translate3d(0,${(1 - smooth(dialogIn)) * 20}px,0)`;
    r.dialog.style.pointerEvents = dialogAlpha > 0.5 ? '' : 'none';
    const typing = at(PHASE.dialogType);
    const typed = Math.round(typing * r.dialogChars.length);
    if (typed !== live.current.typed) {
      live.current.typed = typed;
      r.dialogChars.forEach((char, i) => char.classList.toggle('on', i < typed));
      r.dialogBar.style.transform = `scaleX(${typing})`;
    }
    r.wipe.drawFill(PAPER, Math.round(at(PHASE.wipe) * 400) / 400);

    // ── katana
    live.current.progress = lerp(live.current.progress, p, 0.14); // a touch of inertia
    const { katana, redGlow, view, canvas } = r.scene;
    const { w: W, h: H } = view;
    const pose = katanaPose(live.current.progress, W / H < 1);
    const scale = (pose.len * W) / TOTAL_LEN;
    const slideIn = (1 - introE) * 0.9; // intro: glides in from the right
    const bob = Math.sin(time * 0.0011) * 0.006;

    // the whole katana
    katana.root.scale.setScalar(scale);
    katana.root.position.set(
      (pose.x + slideIn) * W + mouse.sx * 0.12,
      (pose.y + bob + slideIn * 0.4) * H - mouse.sy * 0.08,
      0
    );
    katana.root.rotation.set(
      pose.rx + mouse.sy * 0.12 + Math.sin(time * 0.0007) * 0.03,
      pose.ry + mouse.sx * 0.1 - slideIn * 0.5,
      pose.rz
    );

    // The scabbard, relative to the sword. Drawing slides it along the arc of
    // the blade (a rotation about the curve's centre), so it stays wrapped
    // around the steel until the tip is out. Scrolling back re-sheathes it
    // along the same path.
    const angle = -(pose.draw * DRAW_DISTANCE) / SORI_RADIUS;
    const arcX = SORI_RADIUS * Math.sin(angle);
    const arcY = SORI_RADIUS * (1 - Math.cos(angle));
    // Once clear it parts from the blade: it drops first, then drifts across,
    // so its mouth never clips the tip.
    const across = pose.parted * pose.parted;
    const down = 1 - (1 - pose.parted) * (1 - pose.parted);
    const freeX = ((pose.sayaX - pose.x) * W) / scale;
    const freeY = ((pose.sayaY - pose.y + Math.sin(time * 0.0009 + 1.7) * 0.004 * pose.parted) * H) / scale;
    katana.saya.position.set(lerp(arcX, freeX, across), lerp(arcY, freeY, down), 0);
    katana.saya.rotation.z = angle * (1 - down);

    katana.saya.getWorldPosition(glowAnchor);
    redGlow.position.set(glowAnchor.x - 1.2 * scale, glowAnchor.y + 0.5 * scale, 1.6 * scale);
    redGlow.intensity = 7 * scale * scale * (0.85 + Math.sin(time * 0.004) * 0.15);
    redGlow.distance = 9 * scale;
    katana.lacquer.emissiveIntensity = 1.5 + Math.sin(time * 0.003) * 0.35;
    canvas.style.opacity = String(1 - at(PHASE.glFade));
    r.scene.render();
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
        <canvas className="gl" />

        <Hero onNext={() => toProgress(NEXT_STOP, 2.6)} />

        <p className="line line-1" aria-label="Draw the Blade">
          <SplitChars text="Draw the Blade" />
        </p>
        <p className="line line-2" aria-label="The Steel Awakens">
          <SplitChars text="The Steel Awakens" />
        </p>

        <Dialog onSkip={skip} />
        <canvas className="wipe" />
      </div>
    </section>
  );
}
