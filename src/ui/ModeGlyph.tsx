import type { ModeDefinition } from '@/core/modes';

/** Illustrations vectorielles des modes de jeu. */
export function ModeGlyph({ glyph }: { glyph: ModeDefinition['glyph'] }) {
  const common = { width: '100%', height: '100%', viewBox: '0 0 160 120', 'aria-hidden': true } as const;
  switch (glyph) {
    case 'sequence':
      return (
        <svg {...common}>
          {[2, 4, 8, 16].map((n, i) => (
            <g key={n} transform={`translate(${14 + i * 34} 42)`}>
              <rect width="28" height="36" rx="6" fill="none" stroke="var(--c-line-strong)" />
              <text x="14" y="24" textAnchor="middle" fontFamily="var(--f-mono)" fontSize="13" fill="var(--c-ivory-70)">{n}</text>
            </g>
          ))}
          <path d="M28 92q17 12 34 0M62 92q17 12 34 0M96 92q17 12 34 0" fill="none" stroke="var(--c-red)" strokeWidth="1.4" />
          <text x="79" y="112" textAnchor="middle" fontFamily="var(--f-mono)" fontSize="9" fill="var(--c-red)">×2  ×2  ×2</text>
          <text x="79" y="30" textAnchor="middle" fontFamily="var(--f-display)" fontSize="16" fill="var(--c-ivory-30)">?</text>
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M20 60q60-52 120 0q-60 52-120 0Z" fill="none" stroke="var(--c-line-strong)" strokeWidth="1.4" />
          <circle cx="80" cy="60" r="20" fill="none" stroke="var(--c-ivory-30)" />
          <circle cx="80" cy="60" r="8" fill="var(--c-red)" className="glyph-pupil" />
          {[...Array(7)].map((_, i) => (
            <line key={i} x1={44 + i * 12} y1="18" x2={44 + i * 12} y2="26" stroke="var(--c-line-strong)" />
          ))}
          <circle cx="124" cy="96" r="9" fill="none" stroke="var(--c-red)" strokeDasharray="3 3" />
        </svg>
      );
    case 'key':
      return (
        <svg {...common}>
          <circle cx="52" cy="60" r="20" fill="none" stroke="var(--c-ivory-30)" strokeWidth="1.4" />
          <circle cx="52" cy="60" r="7" fill="none" stroke="var(--c-red)" strokeWidth="1.4" />
          <path d="M72 60h64M120 60v14M106 60v10" stroke="var(--c-ivory-30)" strokeWidth="1.4" fill="none" />
          <text x="128" y="36" textAnchor="middle" fontFamily="var(--f-display)" fontSize="28" fontStyle="italic" fill="var(--c-red)">?</text>
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="40" y="22" width="80" height="80" rx="10" fill="none" stroke="var(--c-line-strong)" strokeWidth="1.4" />
          <path d="M40 44h80M60 14v16M100 14v16" stroke="var(--c-ivory-30)" strokeWidth="1.4" />
          <text x="80" y="88" textAnchor="middle" fontFamily="var(--f-display)" fontSize="34" fill="var(--c-ivory)">{new Date().getDate()}</text>
          <circle cx="120" cy="22" r="6" fill="var(--c-red)" />
        </svg>
      );
  }
}
