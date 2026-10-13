import { images } from '../../assets/images';

type Part = { text: string; mark?: boolean };

/** The master speaks twice. `mark` highlights the words he leans on. */
const LINES: Part[][] = [
  [{ text: 'So, the ' }, { text: 'steel called', mark: true }, { text: ' and you answered. Good.' }],
  [
    { text: 'A blade is only as sharp as the ' },
    { text: 'hand that guides it', mark: true },
    { text: ' — so move slowly, and watch it come home.' },
  ],
];

/** Characters are switched on one by one as the page scrolls. */
export function Dialog({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="dialog">
      <figure className="dialog-card">
        <img src={images.master} alt="" />
        <figcaption className="mono">MASTER SEI</figcaption>
      </figure>
      <div className="dialog-body">
        <div className="dialog-lines">
          {LINES.map((parts, n) => (
            <p className="dialog-text" aria-label={parts.map((part) => part.text).join('')} key={n}>
              {parts.map((part, j) =>
                [...part.text].map((char, i) => (
                  <i className={part.mark ? 'mark' : undefined} aria-hidden="true" key={`${j}-${i}`}>
                    {char}
                  </i>
                ))
              )}
            </p>
          ))}
        </div>
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
