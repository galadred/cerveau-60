import type { ReactNode } from 'react';

interface Props {
  /** Fraction restante, 0..1. */
  progress: number;
  size?: number;
  stroke?: number;
  /** Passe en mode alerte (pulsation rouge). */
  alert?: boolean;
  children?: ReactNode;
  label?: string;
  /** Balayage d'ambiance de 60 s (écran d'accueil). */
  ambient?: boolean;
}

/** Anneau de chronomètre. Le rouge mesure le temps restant. */
export function TimerRing({ progress, size = 120, stroke = 6, alert, ambient, children, label }: Props) {
  const r = (size - stroke) / 2;
  const p = Math.max(0, Math.min(1, progress));
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div
      className={`timer-ring${alert ? ' timer-ring--alert' : ''}${ambient ? ' timer-ring--ambient' : ''}`}
      style={{ width: size, height: size }}
      role={label ? 'timer' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`translate(${size / 2} ${size / 2})`}>
          {ticks.map((i) => {
            const long = i % 5 === 0;
            const a = (i / 60) * Math.PI * 2;
            const r1 = r - stroke - (long ? 7 : 3);
            const r2 = r - stroke - 1;
            return (
              <line
                key={i}
                x1={Math.sin(a) * r1} y1={-Math.cos(a) * r1}
                x2={Math.sin(a) * r2} y2={-Math.cos(a) * r2}
                stroke={long ? 'var(--c-ivory-30)' : 'var(--c-line-strong)'}
                strokeWidth={long ? 1.5 : 1}
              />
            );
          })}
        </g>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-anthracite)" strokeWidth={stroke} />
        <circle
          className="timer-ring__arc"
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--c-red)" strokeWidth={stroke} strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="timer-ring__center">{children}</div>
    </div>
  );
}
