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
    const fit = () => {
      const source = (measure && el.querySelector(measure)) || el;
      el.style.fontSize = '100px';
      const range = document.createRange();
      range.selectNodeContents(source);
      const width = range.getBoundingClientRect().width;
      const vw = window.innerWidth;
      if (width > 0) el.style.fontSize = `${((vw * fractionRef.current(vw)) / width) * 100}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [ref, measure]);
}
