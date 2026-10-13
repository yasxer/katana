import { useEffect, useRef } from 'react';
import { clamp, easeOut, seg, smooth } from '../../lib/math';
import { inView, pinProgress, useBounds, useFrame } from '../../scroll/ScrollProvider';
import './craft.css';

const TITLE = ['Design', 'With', 'Intent'];
const WORDS = ['Cut', 'Hone', 'Flow', 'Ship'];
const PRINCIPLES = [
  'Your scroll stays yours. One light smoothing pass on top, nothing hijacked.',
  'Every motion is tied to progress, so the page moves exactly as far as your hand does.',
  'Real-time 3D forged in code. No video, no image sequence — just geometry and light.',
  'Built light: one bundle, zero frameworks beyond React, and a steady sixty frames per second.',
];

interface Rig {
  lines: HTMLElement[];
  words: HTMLElement[];
  cols: HTMLElement[];
}

/** 03 · Principles — four words resolve out of blur, one per principle. */
export function Craft() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    const el = root.current!;
    const all = (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(selector));
    rig.current = { lines: all('.craft-title .ln > span'), words: all('.craft-big span'), cols: all('.craft-cols li') };
    return () => {
      rig.current = null;
    };
  }, []);

  useFrame(({ y, vh }) => {
    const r = rig.current;
    const b = bounds.current;
    if (!r || !inView(b, y, vh)) return;
    const c = pinProgress(b, y, vh);
    const entered = clamp((y + vh - b.top) / vh); // 0 → 1 while the section scrolls into view

    r.lines.forEach((line, i) => {
      const t = easeOut(seg(entered, 0.25 + i * 0.08, 0.75 + i * 0.08));
      line.style.transform = `translate3d(0,${(1 - t) * 125}%,0)`;
    });

    const n = r.words.length;
    r.words.forEach((word, i) => {
      const local = c * n - i;
      const a = smooth(seg(local, i === 0 ? -0.4 : 0, 0.32));
      const out = smooth(seg(local, 0.72, 1));
      const v = a * (1 - out);
      word.style.opacity = String(v);
      word.style.filter = v > 0.99 ? 'none' : `blur(${((1 - v) * 46).toFixed(1)}px)`;
      word.style.transform = `scale(${0.86 + a * 0.14 + out * 0.16})`;
    });

    const active = Math.min(n - 1, Math.floor(c * n));
    r.cols.forEach((col, i) => col.classList.toggle('on', c > 0.02 && i <= active));
  });

  return (
    <section className="craft" id="craft" ref={root} data-theme="light">
      <div className="pin">
        <h2 className="craft-title">
          {TITLE.map((line) => (
            <span className="ln" key={line}>
              <span>{line}</span>
            </span>
          ))}
        </h2>
        <p className="craft-note mono">
          MADE BY HAND.
          <br />
          MEASURED TWICE,
          <br />
          CUT ONCE
        </p>

        <div className="craft-big" aria-hidden="true">
          {WORDS.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>

        <ol className="craft-cols">
          {PRINCIPLES.map((text, i) => (
            <li key={i}>
              <span className="mono">({i + 1})</span>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
