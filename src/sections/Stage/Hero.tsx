import { useRef } from 'react';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { site } from '../../config/site';
import { useFitText } from '../../lib/useFitText';

export function Hero({ onNext }: { onNext: () => void }) {
  const word = useRef<HTMLDivElement>(null);
  useFitText(word, (vw) => (vw < 760 ? 0.42 : 0.26));

  return (
    <div className="hero">
      <h1 className="hero-title">
        {site.title.map((line, i) => (
          <span className="ln" key={line}>
            <span>
              {line}
              {i === 1 && (
                <small>
                  Built by
                  <br />
                  {site.studio}
                </small>
              )}
            </span>
          </span>
        ))}
      </h1>

      <div className="hero-chip">
        <span className="mono">Work Hub</span>
        <div className="chip-card">
          <img src={images.ronin} alt="" />
          <span>Focus</span>
        </div>
      </div>

      <div className="hero-word" ref={word} aria-hidden="true">
        <SplitChars text={site.brand} />
        <sup className="ch">©</sup>
      </div>

      <div className="hero-meta mono">
        <p>
          SCROLL, MOTION
          <br />
          AND REAL-TIME 3D
          <br />
          FOR THE WEB
        </p>
        <p>
          CODE-FIRST. NO
          <br />
          TEMPLATES
        </p>
      </div>

      <div className="bubble">
        <p>
          You made it, traveller. <b>刃</b> This is the dojo of {site.brand} — where every pixel is cut with intent.
        </p>
        <button className="bubble-next" onClick={onNext}>
          Next
        </button>
      </div>
      <img className="bubble-avatar" src={images.master} alt="" />
    </div>
  );
}
