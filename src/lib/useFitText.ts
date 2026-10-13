import { useEffect, useRef, type RefObject } from 'react';

/**
 * Sizes a single line of text so it spans a fraction of the viewport width,
 * whatever the word is. Keeps display wordmarks correct when the brand changes.
 * `measure` selects the child whose text is measured (defaults to the element itself).
 */
export function useFitText(ref: RefObject<HTMLElement | null>, fraction: (vw: number) => number, measure?: string) {
  const fractionRef = useRef(fraction);
  fractionRef.current = fraction;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let fittedWidth = 0;

    // Scales from the size the text already has, in one write. The element is
    // never shrunk to a probe size first: on phones that briefly shortened the
    // page, and at the very bottom the browser answered by scrolling up.
    const fit = () => {
      const source = (measure && el.querySelector(measure)) || el;
      const range = document.createRange();
      range.selectNodeContents(source);
      const width = range.getBoundingClientRect().width;
      const current = parseFloat(getComputedStyle(el).fontSize);
      if (!width || !current) return;
      const vw = window.innerWidth;
      const next = (current * vw * fractionRef.current(vw)) / width;
      if (Math.abs(next - current) > 0.5) el.style.fontSize = `${next.toFixed(2)}px`;
      fittedWidth = vw;
    };

    // Mobile browsers fire `resize` every time the address bar slides in or
    // out. Only the height changes then, and the fit depends on width alone.
    const onResize = () => {
      if (window.innerWidth !== fittedWidth) fit();
    };

    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ref, measure]);
}
