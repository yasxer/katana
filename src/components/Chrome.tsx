import { useEffect, useRef, type MouseEvent } from 'react';
import { site } from '../config/site';
import { clamp } from '../lib/math';
import { useFrame, useScroll } from '../scroll/ScrollProvider';
import './chrome.css';

interface ThemedSection {
  top: number;
  height: number;
  light: boolean;
  /** pinned sections can switch to the light theme part-way through */
  flipAt: number | null;
}

/** Fixed UI: progress line, header, scroll ruler. Follows the theme of the section under it. */
export function Chrome() {
  const { scrollTo } = useScroll();
  const bar = useRef<HTMLElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLElement>(null);
  const sections = useRef<ThemedSection[]>([]);

  useEffect(() => {
    const measure = () => {
      sections.current = Array.from(document.querySelectorAll<HTMLElement>('[data-theme]')).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY,
          height: rect.height,
          light: el.dataset.theme === 'light',
          flipAt: el.dataset.themeFlip ? Number(el.dataset.themeFlip) : null,
        };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  useFrame(({ y, vh, progress }) => {
    if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    if (dot.current) dot.current.style.top = `${progress * 100}%`;
    if (count.current) count.current.textContent = String(Math.round(progress * 100)).padStart(3, '0');

    const probe = y + 36;
    let light = false;
    for (const s of sections.current) {
      if (probe < s.top || probe >= s.top + s.height) continue;
      light = s.flipAt === null ? s.light : clamp((y - s.top) / (s.height - vh)) > s.flipAt;
    }
    document.documentElement.classList.toggle('is-light', light);
  });

  const go = (id: string) => (event: MouseEvent) => {
    event.preventDefault();
    const target = document.getElementById(id);
    scrollTo(target ?? 0);
  };

  return (
    <>
      <div className="progress">
        <i ref={bar} />
      </div>

      <header className="hdr">
        <a className="logo" href="#top" onClick={go('top')} aria-label={`${site.brand} home`}>
          <span className="logo-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 19 19 5M14 5h5v5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
            </svg>
          </span>
          <span className="logo-name">
            {site.brand}
            <sup>®</sup>
          </span>
        </a>
        <nav className="hdr-right">
          <button className="hdr-round" aria-label="Info">
            i
          </button>
          <a className="hdr-pill" href="#craft" onClick={go('craft')}>
            Work Hub
          </a>
          <span className="hdr-count" ref={count}>
            000
          </span>
        </nav>
      </header>

      <aside className="ruler" aria-hidden="true">
        <span className="ruler-label">SCROLL — 刃</span>
        <div className="ruler-track">
          <i ref={dot} />
        </div>
      </aside>
    </>
  );
}
