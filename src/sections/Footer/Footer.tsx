import { useEffect, useRef, type MouseEvent } from 'react';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { site } from '../../config/site';
import { queryChars, setChars } from '../../lib/chars';
import { clamp, easeOut, seg } from '../../lib/math';
import { useFitText } from '../../lib/useFitText';
import { useBounds, useFrame, useScroll } from '../../scroll/ScrollProvider';
import './footer.css';

const COLUMNS = [
  { title: ['Start with the idea.', 'Then sharpen it.'], note: 'Motion goes where it earns its place, and nowhere else.' },
  { title: ['Websites people', 'stop to watch.'], note: 'One timeline, one source of truth, every screen.' },
  { title: ['Got a project', 'worth forging?'], note: 'SAY HELLO ↗', mono: true },
];

/** 05 · Footer — the wordmark rises over its own reflection. */
export function Footer() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const { scrollTo } = useScroll();
  const lead = useRef<HTMLElement[]>([]);
  const word = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLSpanElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const hex = useRef<HTMLDivElement>(null);
  useFitText(word, (vw) => (vw < 760 ? 0.82 : 0.52), '.foot-word-main');

  useEffect(() => {
    lead.current = queryChars(root.current!.querySelector('.foot-lead'));
    setChars(lead.current, 0);
  }, []);

  useFrame(({ y, vh }) => {
    const b = bounds.current;
    if (y <= b.top - vh) return;
    const t = clamp((y + vh - b.top) / b.height);
    setChars(lead.current, seg(t, 0.08, 0.42));
    const rest = 1 - easeOut(seg(t, 0.35, 1)); // 1 → 0 as the footer settles
    if (main.current) main.current.style.transform = `translate3d(0,${rest * 34}%,0)`;
    if (mirror.current) mirror.current.style.transform = `translate3d(0,${rest * -34}%,0) scaleY(-1)`;
    if (hex.current) hex.current.style.transform = `translate3d(0,${rest * 60}%,0) rotate(${rest * 40}deg)`;
  });

  const toTop = (event: MouseEvent) => {
    event.preventDefault();
    scrollTo(0);
  };

  return (
    <footer className="foot" id="foot" ref={root} data-theme="dark">
      <div className="foot-top">
        <h2 className="foot-lead" aria-label="Made to move.">
          <SplitChars text="Made to move." />
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
      </div>

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
      <div className="foot-hex" ref={hex}>
        <img src={images.maple} alt="" />
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
