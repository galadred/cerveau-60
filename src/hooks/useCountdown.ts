import { useCallback, useEffect, useRef, useState } from 'react';
import { Countdown } from '@/core/countdown';

interface Options {
  durationMs: number;
  autoStart?: boolean;
  onExpire?: () => void;
}

/** Hook React autour de `Countdown`, rafraîchi à chaque frame d'affichage. */
export function useCountdown({ durationMs, autoStart = false, onExpire }: Options) {
  const cd = useRef(new Countdown(durationMs));
  const [remaining, setRemaining] = useState(durationMs);
  const [running, setRunning] = useState(false);
  const expiredFired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      const r = cd.current.remaining();
      setRemaining(r);
      if (r <= 0) {
        cd.current.pause();
        setRunning(false);
        if (!expiredFired.current) {
          expiredFired.current = true;
          onExpireRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const start = useCallback(() => {
    if (cd.current.expired) return;
    cd.current.start();
    setRunning(true);
  }, []);
  const pause = useCallback(() => {
    cd.current.pause();
    setRemaining(cd.current.remaining());
    setRunning(false);
  }, []);
  const reset = useCallback(() => {
    cd.current.reset();
    expiredFired.current = false;
    setRemaining(cd.current.remaining());
    setRunning(false);
  }, []);
  const penalize = useCallback((ms: number) => {
    cd.current.penalize(ms);
    setRemaining(cd.current.remaining());
  }, []);
  const elapsed = useCallback(() => cd.current.elapsed(), []);

  useEffect(() => {
    if (autoStart) start();
  }, [autoStart, start]);

  return { remaining, running, start, pause, reset, penalize, elapsed, durationMs };
}
