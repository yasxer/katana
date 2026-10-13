import { images } from '../../assets/images';

const LINE =
  'So, the steel called and you answered. A blade is only as sharp as the hand that guides it — move slowly, and watch.';

/** The master's line. Characters are switched on one by one as the page scrolls. */
export function Dialog({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="dialog">
      <figure className="dialog-card">
        <img src={images.master} alt="" />
        <figcaption className="mono">MASTER SEI</figcaption>
      </figure>
      <div className="dialog-body">
        <p className="dialog-text" aria-label={LINE}>
          {[...LINE].map((char, i) => (
            <i key={i} aria-hidden="true">
              {char}
            </i>
          ))}
        </p>
        <div className="dialog-bar">
          <i />
        </div>
      </div>
      <button className="dialog-skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
