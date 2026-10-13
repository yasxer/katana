import { Fragment } from 'react';

/** Renders text as per-character spans (grouped by word so lines never break mid-word). */
export function SplitChars({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="wd" aria-hidden="true">
            {[...word].map((char, j) => (
              <span className="ch" key={j}>
                {char}
              </span>
            ))}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  );
}
