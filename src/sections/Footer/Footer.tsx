import { useEffect, useRef, type MouseEvent } from 'react';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { site } from '../../config/site';
import { queryChars, setChars } from '../../lib/chars';
import { clamp, easeOut, lerp, seg, smooth } from '../../lib/math';
import { useFitText } from '../../lib/useFitText';
import { useBounds, useFrame, useScroll } from '../../scroll/ScrollProvider';
import { useKatana } from '../../three/KatanaProvider';
import { TOTAL_LEN } from '../../three/katana';
import { animateGlow, placeKatana } from '../../three/rig';
import './footer.css';

const OWNER = 'footer';

const COLUMNS = [
  { title: ['Start with the idea.', 'Then sharpen it.'], note: 'Motion goes where it earns its place, and nowhere else.' },
  { title: ['Websites people', 'stop to watch.'], note: 'One timeline, one source of truth, every screen.' },
  { title: ['Got a project', 'worth forging?'], note: 'SAY HELLO ↗', mono: true },
];

/** 05 · Footer — the dark panel arches up, and the katana comes to rest over the garden. */
export function Footer() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const { scrollTo } = useScroll();
  const director = useKatana();
  const lead = useRef<HTMLElement[]>([]);
  const rule = useRef<HTMLElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLSpanElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const stone = useRef<HTMLDivElement>(null);
  useFitText(word, (vw) => (vw < 760 ? 0.82 : 0.52), '.foot-word-main');

  useEffect(() => {
    lead.current = queryChars(root.current!.querySelector('.foot-lead'));
    setChars(lead.current, 0);
  }, []);

  useFrame(({ time, y, vh, vw }) => {
    const k = director.current;
    const b = bounds.current;
    const el = root.current;
    if (!el || y <= b.top - vh) {
      k?.release(OWNER);
      return;
    }

    // the panel rises as an arch and flattens into the page
    const arrive = easeOut(clamp((y + vh - b.top) / (vh * 0.95)));
    const rx = lerp(vw * 0.5, 28, arrive);
    const ry = lerp(vh * 0.42, 28, arrive);
    el.style.borderRadius = `${rx}px ${rx}px 0 0 / ${ry}px ${ry}px 0 0`;

    const t = clamp((y + vh - b.top) / b.height);
    setChars(lead.current, seg(t, 0.06, 0.34));
    if (rule.current) rule.current.style.transform = `scaleX(${smooth(seg(t, 0.1, 0.4))})`;
    const rest = 1 - easeOut(seg(t, 0.3, 0.8)); // 1 → 0 as the wordmark settles
    if (main.current) main.current.style.transform = `translate3d(0,${rest * 34}%,0)`;
    if (mirror.current) mirror.current.style.transform = `translate3d(0,${rest * -34}%,0) scaleY(-1)`;

    // the katana returns: sword above, scabbard below, floating over the stone
    const rect = stone.current?.getBoundingClientRect();
    const alpha = smooth(seg(t, 0.62, 0.84));
    if (stone.current) stone.current.style.transform = `translate3d(0,${(1 - seg(t, 0.4, 1)) * 14}%,0) rotate(${(1 - easeOut(seg(t, 0.4, 1))) * 24}deg)`;
    if (!k || !rect) return;
    if (alpha <= 0.001 || rect.bottom < 0 || rect.top > vh) {
      k.release(OWNER);
      return;
    }
    k.claim(OWNER);
    const { scene } = k;
    scene.katana.saya.visible = true;
    scene.katana.ghosts.forEach((ghost) => ghost.setOpacity(0));
    const len = (rect.width * 1.22) / vw;
    const unit = len / TOTAL_LEN; // one sword-local unit, as a fraction of the viewport width
    const scale = placeKatana(scene, {
      len,
      // handle to the left (ry = π), so centre the whole length on the stone
      x: (rect.left + rect.width / 2) / vw - 0.5 - 2.35 * unit,
      y: 0.5 - (rect.top + rect.height * 0.44) / vh + Math.sin(time * 0.0011) * 0.006 + (1 - alpha) * 0.05,
      ry: Math.PI,
      rz: -0.03,
      roll: time * 0.00045,
      saya: { draw: 1, parted: 1, freeX: -1.3, freeY: -1.15 + Math.sin(time * 0.0009) * 0.05, spin: 0, rollOffset: 1.2 },
    });
    animateGlow(scene, scale, time);
    k.setOpacity(alpha);
    scene.render();
  });

  const toTop = (event: MouseEvent) => {
    event.preventDefault();
    scrollTo(0);
  };

  return (
    <footer className="foot" id="foot" ref={root} data-theme="dark">
      <h2 className="foot-lead" aria-label="Made to move.">
        <span>
          <SplitChars text="Made" />
        </span>
        <i className="foot-lead-rule" ref={rule} />
        <span>
          <SplitChars text="to move." />
        </span>
      </h2>

      <ul className="foot-cols">
        {COLUMNS.map((column) => (
          <li key={column.note}>
            <b>
              {column.title[0]}
              <br />
              {column.title[1]}
            </b>
            <span className={column.mono ? 'mono' : undefined}>{column.note}</span>
          </li>
        ))}
      </ul>

      <div className="foot-nav">
        <a className="hdr-pill" href="#top" onClick={toTop}>
          Back to the dojo
        </a>
        <span className="foot-kanji" lang="ja">
          職人技
        </span>
      </div>

      <div className="foot-word" ref={word} aria-hidden="true">
        <span className="foot-word-main" ref={main}>
          {site.brand}
        </span>
        <span className="foot-word-mirror" ref={mirror}>
          {site.brand}
        </span>
      </div>

      <div className="foot-meta mono">
        <span>© {site.studio.toUpperCase()}</span>
        <span>
          WEB DESIGN, MOTION
          <br />
          AND REAL-TIME 3D
        </span>
        <span>CODE-FIRST. HAND-MADE</span>
        <span>{site.year}</span>
      </div>

      <div className="foot-stone-wrap">
        <svg className="foot-stone-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="50,0 89.09,18.83 98.75,61.13 71.69,95.05 28.31,95.05 1.25,61.13 10.91,18.83" />
        </svg>
        <div className="foot-stone" ref={stone}>
          <img src={images.maple} alt="" />
        </div>
      </div>

      <div className="foot-credit">
        <a href={site.portfolio} target="_blank" rel="noopener noreferrer">
          by <b>{site.author}</b>
        </a>
        <a href={site.portfolio} target="_blank" rel="noopener noreferrer">
          {new URL(site.portfolio).host} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>
  );
}
