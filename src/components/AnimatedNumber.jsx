import { useState, useEffect } from 'react';
import { fmt } from '../lib/verdict.js';

export function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const diff  = value - start;
    if (!diff) return;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplay(Math.round(start + (diff * step) / 18));
      if (step >= 18) { clearInterval(id); setDisplay(value); }
    }, 16);
    return () => clearInterval(id);
  }, [value]);  // eslint-disable-line

  return <span>{fmt(display)}</span>;
}
