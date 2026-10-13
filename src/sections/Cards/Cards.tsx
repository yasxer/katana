import { useEffect, useRef } from 'react';
import { images } from '../../assets/images';
import { site } from '../../config/site';
import { clamp } from '../../lib/math';
import { inView, useBounds, useFrame } from '../../scroll/ScrollProvider';
import './cards.css';

interface CardRig {
  el: HTMLElement;
  /** parallax factor: positive lags behind the scroll, negative runs ahead */
  speed: number;
  top: number;
  height: number;
}

/** 04 · Cards — three panels drifting at different speeds, with a live scroll read-out. */
export function Cards() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const cards = useRef<CardRig[]>([]);
  const image = useRef<HTMLImageElement>(null);
  const readProgress = useRef<HTMLSpanElement>(null);
  const readVelocity = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current!;
    const items = Array.from(el.querySelectorAll<HTMLElement>('.card'));

    // resting positions, measured without the parallax offset
    const measure = () => {
      cards.current = items.map((card) => {
        const previous = card.style.transform;
        card.style.transform = '';
        const rect = card.getBoundingClientRect();
        card.style.transform = previous;
        return { el: card, speed: Number(card.dataset.speed), top: rect.top + window.scrollY, height: rect.height };
      });
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          reveal.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );
    el.querySelectorAll('[data-reveal]').forEach((node) => reveal.observe(node));

    return () => {
      resizeObserver.disconnect();
      reveal.disconnect();
    };
  }, []);

  useFrame(({ y, vh, velocity }) => {
    const b = bounds.current;
    if (!inView(b, y, vh)) return;
    const t = clamp((y + vh - b.top) / (b.height + vh));

    for (const card of cards.current) {
      const fromCentre = card.top - y + card.height / 2 - vh / 2;
      card.el.style.transform = `translate3d(0,${fromCentre * card.speed}px,0)`;
    }
    if (image.current) image.current.style.transform = `translate3d(0,${-t * 12}%,0) scale(1.16)`;
    if (readProgress.current) readProgress.current.textContent = t.toFixed(2);
    if (readVelocity.current) readVelocity.current.textContent = (velocity / 40).toFixed(2);
  });

  return (
    <section className="cards" id="cards" ref={root} data-theme="light">
      <div className="cards-head">
        <h3 data-reveal>
          Sharp
          <br />
          By Design
        </h3>
        <p data-reveal>
          Animations run off a single frame loop and only touch transforms, opacity and filters — the cheap stuff.
        </p>
        <p data-reveal>Everything you see is driven by one number: how far you have scrolled.</p>
      </div>

      <div className="cards-grid">
        <article className="card card-a" data-speed="0.12">
          <p>
            Patience
            <br />
            Over Speed
          </p>
          <b lang="ja">職人</b>
        </article>

        <article className="card card-b" data-speed="-0.08">
          <img ref={image} src={images.ronin} alt="Ronin standing in red mist" />
          <div className="card-read mono">
            <span>--progress:</span> <span ref={readProgress}>0.00</span>
            <br />
            <span>--velocity:</span> <span ref={readVelocity}>0.00</span>
          </div>
        </article>

        <article className="card card-c" data-speed="0.2">
          <p className="mono">Scene 04 — Clouds</p>
          <div className="card-mini">
            <img src={images.painting} alt="" />
            <span>{site.brand}</span>
          </div>
        </article>
      </div>

      <p className="cards-foot" data-reveal>
        Every letter lands
        <br />
        exactly where it should.
      </p>
    </section>
  );
}
