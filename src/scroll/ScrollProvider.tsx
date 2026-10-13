import Lenis from 'lenis';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { clamp, easeInOut } from '../lib/math';

export interface Frame {
  /** rAF timestamp in ms */
  time: number;
  /** current scroll position in px */
  y: number;
  vw: number;
  vh: number;
  velocity: number;
  /** 0 → 1 across the whole document */
  progress: number;
}

type Listener = (frame: Frame) => void;

interface ScrollApi {
  subscribe(listener: Listener): () => void;
  scrollTo(target: number | HTMLElement, seconds?: number): void;
  start(): void;
}

const ScrollContext = createContext<ScrollApi | null>(null);

/** Owns the smooth scroller and the single frame loop every animation hangs off. */
export function ScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const listeners = useRef(new Set<Listener>());
  const started = useRef(false);

  useEffect(() => {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    if (!started.current) lenis.stop();
    lenisRef.current = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      const y = window.scrollY;
      const frame: Frame = {
        time,
        y,
        vh,
        vw: window.innerWidth,
        velocity: lenis.velocity,
        progress: max > 0 ? clamp(y / max) : 0,
      };
      listeners.current.forEach((listener) => listener(frame));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const api = useMemo<ScrollApi>(
    () => ({
      subscribe(listener) {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      scrollTo(target, seconds = 2.4) {
        lenisRef.current?.scrollTo(target, { duration: seconds, easing: easeInOut, lock: true });
      },
      start() {
        started.current = true;
        lenisRef.current?.start();
      },
    }),
    []
  );

  return <ScrollContext.Provider value={api}>{children}</ScrollContext.Provider>;
}

export function useScroll() {
  const api = useContext(ScrollContext);
  if (!api) throw new Error('useScroll must be used inside <ScrollProvider>');
  return api;
}

/** Run a callback on every animation frame with the current scroll state. */
export function useFrame(callback: Listener) {
  const { subscribe } = useScroll();
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => subscribe((frame) => saved.current(frame)), [subscribe]);
}

export interface Bounds {
  top: number;
  height: number;
}

/** Document-space position of an element, kept fresh across resizes and layout shifts. */
export function useBounds(ref: RefObject<HTMLElement | null>) {
  const bounds = useRef<Bounds>({ top: 0, height: 0 });
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      bounds.current = { top: rect.top + window.scrollY, height: rect.height };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);
  return bounds;
}

/** 0 → 1 while a pinned (sticky) section is stuck to the viewport. */
export const pinProgress = (b: Bounds, y: number, vh: number) => clamp((y - b.top) / Math.max(1, b.height - vh));

/** True while any part of the section is on screen. */
export const inView = (b: Bounds, y: number, vh: number) => y > b.top - vh && y < b.top + b.height;
