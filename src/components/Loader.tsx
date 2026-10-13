import { useEffect, useState } from 'react';
import './loader.css';

interface Props {
  /** Images that must be decoded before the page is revealed. */
  images: string[];
  onDone: () => void;
}

export function Loader({ images, onDone }: Props) {
  const [loaded, setLoaded] = useState(0);
  const [done, setDone] = useState(false);
  const total = images.length + 1; // + fonts

  useEffect(() => {
    let alive = true;
    const tick = () => alive && setLoaded((n) => n + 1);
    const tasks = images.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        })
    );
    tasks.push(document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve());
    tasks.forEach((task) => task.then(tick));

    Promise.all(tasks)
      .then(() => new Promise((resolve) => setTimeout(resolve, 350)))
      .then(() => {
        if (!alive) return;
        setDone(true);
        onDone();
      });
    return () => {
      alive = false;
    };
    // preload once on mount; `images` and `onDone` are stable for the page's lifetime
  }, []);

  const percent = Math.min(100, Math.round((loaded / total) * 100));
  return (
    <div className={`loader${done ? ' is-done' : ''}`} aria-hidden={done}>
      <div className="loader-mark" />
      <div className="loader-row">
        <span>Forging the blade</span>
        <span>{String(percent).padStart(3, '0')}</span>
      </div>
    </div>
  );
}
