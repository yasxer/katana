import { useEffect, useState } from 'react';
import { images } from './assets/images';
import { Chrome } from './components/Chrome';
import { Loader } from './components/Loader';
import { useScroll } from './scroll/ScrollProvider';
import { Cards } from './sections/Cards/Cards';
import { Craft } from './sections/Craft/Craft';
import { Footer } from './sections/Footer/Footer';
import { Garden } from './sections/Garden/Garden';
import { Principles } from './sections/Principles/Principles';
import { Quote } from './sections/Quote/Quote';
import { Stage } from './sections/Stage/Stage';

const PRELOAD = Object.values(images);

export function App() {
  const { start } = useScroll();
  const [ready, setReady] = useState(false);

  // scrolling is locked until every image and font is in
  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', !ready);
    if (ready) start();
  }, [ready, start]);

  return (
    <>
      <Loader images={PRELOAD} onDone={() => setReady(true)} />
      <Chrome />
      <main id="top">
        <Stage ready={ready} />
        <Garden />
        <Quote />
        <Principles />
        <Cards />
        <Craft />
        <Footer />
      </main>
    </>
  );
}
