import { useEffect, useRef } from 'react';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { queryChars, setChars } from '../../lib/chars';
import { easeInOut, easeOut, seg, smooth } from '../../lib/math';
import { inView, pinProgress, useBounds, useFrame } from '../../scroll/ScrollProvider';
import './garden.css';

interface Rig {
  title: HTMLElement[];
  maple: HTMLElement;
  bambooBase: HTMLElement;
  bambooTop: HTMLElement;
  slash: HTMLElement;
  rule: HTMLElement;
  caption: HTMLElement;
}

/** 02 · The garden — ink maple, and a bamboo stand sliced clean by one red stroke. */
export function Garden() {
  const root = useRef<HTMLElement>(null);
  const bounds = useBounds(root);
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    const el = root.current!;
    const one = (selector: string) => el.querySelector<HTMLElement>(selector)!;
    rig.current = {
      title: queryChars(one('.garden-title')),
      maple: one('.maple'),
      bambooBase: one('.bamboo-base'),
      bambooTop: one('.bamboo-top'),
      slash: one('.bamboo-slash'),
      rule: one('.garden-rule i'),
      caption: one('.garden-cap'),
    };
    setChars(rig.current.title, 0);
    return () => {
      rig.current = null;
    };
  }, []);

  useFrame(({ y, vh }) => {
    const r = rig.current;
    const b = bounds.current;
    if (!r || !inView(b, y, vh)) return;
    const g = pinProgress(b, y, vh);

    setChars(r.title, seg(g, 0.02, 0.22), seg(g, 0.9, 1));
    const rise = easeOut(seg(g, 0, 0.36));
    r.maple.style.transform = `translate3d(0,${(1 - rise) * 16 - g * 3}%,0) scale(${0.84 + rise * 0.16 + g * 0.05})`;
    r.rule.style.transform = `scaleX(${smooth(seg(g, 0.2, 0.42))})`;
    r.caption.style.opacity = String(seg(g, 0.36, 0.46));

    // Transforms go on the two images rather than their wrapper, so the
    // multiply blend still reaches the page background.
    const up = (1 - easeOut(seg(g, 0.04, 0.34))) * 46;
    r.bambooBase.style.transform = `translate3d(0,${up}%,0)`;

    // the cut: a red slash, then the top of the bamboo slides off along it
    r.slash.style.transform = `rotate(13.4deg) scaleX(${easeOut(seg(g, 0.42, 0.49))})`;
    r.slash.style.opacity = String(1 - seg(g, 0.5, 0.6));
    const cut = seg(g, 0.49, 0.9);
    const slide = easeInOut(seg(cut, 0, 0.55));
    const fall = Math.pow(seg(cut, 0.4, 1), 2);
    r.bambooTop.style.transform = `translate3d(${slide * 13 + fall * 10}%,${up + slide * 4.6 + fall * 42}%,0) rotate(${fall * 16}deg)`;
    r.bambooTop.style.opacity = String(1 - seg(cut, 0.8, 1));
  });

  return (
    <section className="garden" id="garden" ref={root} data-theme="light">
      <div className="pin">
        <div className="garden-rule">
          <i />
        </div>
        <p className="garden-cap mono">
          MOTION WITH PURPOSE
          <br />
          NOT DECORATION
        </p>
        <h2 className="garden-title" aria-label="One clean cut.">
          <SplitChars text="One clean cut." />
        </h2>

        <div className="bamboo">
          <img className="bamboo-base" src={images.bamboo} alt="" />
          <img className="bamboo-top" src={images.bamboo} alt="" />
          <i className="bamboo-slash" />
        </div>
        <img className="maple" src={images.maple} alt="Ink painting of a red maple tree" />
      </div>
    </section>
  );
}
