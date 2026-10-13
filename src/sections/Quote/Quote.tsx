import { useEffect, useRef } from 'react';
import { images } from '../../assets/images';
import { clamp, seg, smooth } from '../../lib/math';
import { inView, useBounds, useFrame } from '../../scroll/ScrollProvider';
import './quote.css';

const WORDS = 'A sharp blade begins with a patient hand…'.split(' ');

/** A single line, inked in word by word, while a framed fragment of the garden drifts past. */
export function Quote() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const words = useRef<HTMLElement[]>([]);
  const gem = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    words.current = Array.from(root.current!.querySelectorAll<HTMLElement>('.quote-text span'));
  }, []);

  useFrame(({ y, vh }) => {
    const b = bounds.current;
    if (!inView(b, y, vh)) return;
    const t = clamp((y + vh - b.top) / (b.height + vh)); // 0 → 1 across its whole pass through the viewport

    const n = words.current.length;
    words.current.forEach((word, i) => {
      const on = smooth(seg(t, 0.28 + (i / n) * 0.26, 0.34 + (i / n) * 0.26));
      word.style.opacity = String(0.22 + on * 0.78);
    });
    if (gem.current) {
      const drift = t - 0.5;
      gem.current.style.transform = `translate3d(${drift * -34}vw,${drift * 150}%,0) rotate(${45 + drift * 60}deg)`;
    }
    if (seal.current) seal.current.style.transform = `translate3d(0,${(0.5 - t) * 120}%,0) rotate(${t * 180}deg)`;
  });

  return (
    <section className="quote" ref={root} data-theme="light">
      <div className="quote-seal" ref={seal} aria-hidden="true" />
      <p className="quote-text">
        {WORDS.map((word, i) => (
          <span key={i}>{word} </span>
        ))}
      </p>
      <div className="quote-gem" ref={gem} aria-hidden="true">
        <img src={images.inkTree} alt="" />
      </div>
      <p className="quote-note mono">
        FLOW
        <br />
        CONTROL
      </p>
    </section>
  );
}
