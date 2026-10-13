import { useRef } from 'react';
import { images } from '../../assets/images';
import { SplitChars } from '../../components/SplitChars';
import { site } from '../../config/site';
import { useFitText } from '../../lib/useFitText';

const SLIDES = [
  { image: images.ronin, label: 'Focus' },
  { image: images.painting, label: 'Patience' },
  { image: images.maple, label: 'Balance' },
];
/** Faint copies that trail behind the type as it leaves, like an echo. */
const ECHOES = [1, 2, 3];

function TitleLines() {
  return (
    <>
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
    </>
  );
}

export function Hero({ onNext }: { onNext: () => void }) {
  const word = useRef<HTMLDivElement>(null);
  useFitText(word, (vw) => (vw < 760 ? 0.42 : 0.26), '.hero-word');

  return (
    <div className="hero">
      <div className="hero-title-stack">
        <h1 className="hero-title">
          <TitleLines />
        </h1>
        {ECHOES.map((i) => (
          <div className="hero-title hero-echo" aria-hidden="true" key={i}>
            <TitleLines />
          </div>
        ))}
      </div>

      <div className="hero-chip">
        <span className="mono">Work Hub</span>
        <div className="chip-card">
          {SLIDES.map((slide, i) => (
            <figure className="chip-slide" style={{ animationDelay: `${i * 2.4}s` }} key={slide.label}>
              <img src={slide.image} alt="" />
              <figcaption>{slide.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="hero-word-stack" ref={word} aria-hidden="true">
        <div className="hero-word">
          <SplitChars text={site.brand} />
          <sup className="ch">©</sup>
        </div>
        {ECHOES.map((i) => (
          <div className="hero-word hero-echo" key={i}>
            {site.brand}
            <sup>©</sup>
          </div>
        ))}
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
