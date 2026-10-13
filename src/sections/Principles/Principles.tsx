import { useEffect, useRef } from 'react';
import { SplitChars } from '../../components/SplitChars';
import { queryChars, setChars } from '../../lib/chars';
import { clamp, seg, smooth } from '../../lib/math';
import { inView, useBounds, useFrame } from '../../scroll/ScrollProvider';
import { useKatana } from '../../three/KatanaProvider';
import { animateGlow, placeKatana } from '../../three/rig';
import './principles.css';

const OWNER = 'principles';

const ITEMS = [
  { title: ['Motion With', 'Meaning'], notes: ['Nothing moves without a reason.', 'Every transition says something.'], dots: 3 },
  { title: ['One Source', 'Of Truth'], notes: ['A single timeline drives the page.', 'Nothing drifts out of sync.'], dots: 1 },
  { title: ['Real-Time,', 'Not Recorded'], notes: ['Geometry and light, computed live.', 'No video. No image sequence.'], dots: 4 },
  { title: ['Light By', 'Default'], notes: ['Fast as a cut, light as breath.', 'Ship less, feel more.'], dots: 9 },
  { title: ['Built To', 'Be Felt'], notes: ['Scroll is the instrument.', 'The page answers your hand.'], dots: 2 },
];

/** A heading the size of the room, five rules scattered below it, and the bare blade passing over them. */
export function Principles() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const director = useKatana();
  const heading = useRef<HTMLElement[]>([]);
  const echo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    heading.current = queryChars(el.querySelector('.principles-title'));
    setChars(heading.current, 0);

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          reveal.unobserve(entry.target);
        }
      },
      { threshold: 0.4 }
    );
    el.querySelectorAll('[data-reveal]').forEach((node) => reveal.observe(node));
    return () => reveal.disconnect();
  }, []);

  useFrame(({ time, y, vh }) => {
    const k = director.current;
    const b = bounds.current;
    if (!inView(b, y, vh)) {
      k?.release(OWNER);
      return;
    }
    const t = clamp((y + vh - b.top) / (b.height + vh)); // 0 → 1 across its whole pass through the viewport

    setChars(heading.current, seg(t, 0.08, 0.24), 0, 30);
    if (echo.current) {
      const rise = seg(t, 0.02, 0.3);
      echo.current.style.opacity = String(Math.sin(Math.PI * rise) * 0.5);
      echo.current.style.transform = `translate3d(0,${(1 - rise) * 60 - 62}%,0) scaleY(${1 + (1 - rise) * 0.6})`;
    }

    // the bare blade crosses the page on a diagonal, still turning
    const pass = seg(t, 0.3, 0.86);
    const alpha = smooth(seg(pass, 0, 0.12)) * (1 - smooth(seg(pass, 0.88, 1)));
    if (!k) return;
    if (alpha <= 0.001) {
      k.release(OWNER);
      return;
    }
    k.claim(OWNER);
    const { scene } = k;
    scene.katana.saya.visible = false;
    scene.katana.ghosts.forEach((ghost) => ghost.setOpacity(0));
    const portrait = scene.view.w / scene.view.h < 1;
    const scale = placeKatana(scene, {
      len: portrait ? 1.25 : 0.62,
      x: -0.16 + pass * 0.5,
      y: 0.42 - pass * 0.86,
      ry: 0.25,
      rz: -0.62,
      roll: time * 0.0006 + pass * 5,
      saya: { draw: 1, parted: 1, freeX: 0, freeY: 0, spin: 0, rollOffset: 0 },
    });
    animateGlow(scene, scale, time);
    k.setOpacity(alpha);
    scene.render();
  });

  return (
    <section className="principles" id="principles" ref={root} data-theme="light">
      <div className="principles-head">
        <div className="principles-echo" ref={echo} aria-hidden="true">
          Principles
        </div>
        <h2 className="principles-title" aria-label="Principles">
          <SplitChars text="Principles" />
        </h2>
      </div>

      <ul className="principles-list">
        {ITEMS.map((item, i) => (
          <li className={`principle principle-${i + 1}`} data-reveal key={item.title[0]}>
            <span className="principle-dots" data-count={item.dots} aria-hidden="true">
              {Array.from({ length: item.dots }, (_, j) => (
                <i key={j} />
              ))}
            </span>
            <div>
              <h3>
                {item.title[0]}
                <br />
                {item.title[1]}
              </h3>
              <p>
                <span>{item.notes[0]}</span>
                <span>{item.notes[1]}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
