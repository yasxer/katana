import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createScene, type KatanaScene } from './createScene';

/**
 * One WebGL canvas for the whole page. Sections take turns with it: whoever is
 * on screen claims it, optionally parks it inside their own markup (so it can
 * sit between their layers), poses the katana and renders.
 */
export class KatanaDirector {
  readonly scene: KatanaScene;
  private owner: string | null = null;
  private observer: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private overlay: HTMLElement
  ) {
    this.scene = createScene(canvas);
    this.observer = new ResizeObserver(() => this.scene.resize());
    this.observer.observe(canvas);
  }

  /** Take the canvas. `host` parks it inside that element; omit it to draw over the page. */
  claim(owner: string, host?: HTMLElement | null) {
    const parent = host ?? this.overlay;
    if (this.canvas.parentElement !== parent) parent.append(this.canvas);
    this.owner = owner;
  }

  /** Give it back. A no-op unless `owner` still holds it. */
  release(owner: string) {
    if (this.owner !== owner) return;
    this.owner = null;
    this.canvas.style.opacity = '0';
  }

  setOpacity(alpha: number) {
    this.canvas.style.opacity = String(alpha);
  }

  dispose() {
    this.observer.disconnect();
    this.scene.dispose();
    this.canvas.remove();
  }
}

const KatanaContext = createContext<RefObject<KatanaDirector | null> | null>(null);

export function KatanaProvider({ children }: { children: ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const director = useRef<KatanaDirector | null>(null);

  useEffect(() => {
    // the canvas is moved between hosts by hand, so React must not own it
    const canvas = document.createElement('canvas');
    canvas.className = 'gl';
    canvas.style.opacity = '0';
    overlay.current!.append(canvas);
    director.current = new KatanaDirector(canvas, overlay.current!);
    return () => {
      director.current?.dispose();
      director.current = null;
    };
  }, []);

  return (
    <KatanaContext.Provider value={director}>
      {children}
      <div className="gl-overlay" ref={overlay} aria-hidden="true" />
    </KatanaContext.Provider>
  );
}

/** The shared director. `current` is null until the canvas exists. */
export function useKatana() {
  const ref = useContext(KatanaContext);
  if (!ref) throw new Error('useKatana must be used inside <KatanaProvider>');
  return ref;
}
