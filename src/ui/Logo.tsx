interface Props {
  size?: number;
  withWordmark?: boolean;
}

/** Marque CERVEAU 60 : anneau de chronomètre + chiffre. */
export function Logo({ size = 36, withWordmark = true }: Props) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="var(--c-anthracite)" strokeWidth="4" />
        <path d="M24 5a19 19 0 1 1-16.45 9.5" fill="none" stroke="var(--c-red)" strokeWidth="4" strokeLinecap="round" />
        <text x="24" y="30" textAnchor="middle" fontFamily="var(--f-display)" fontSize="18" fill="var(--c-ivory)">60</text>
      </svg>
      {withWordmark && (
        <span className="logo__word">
          CERVEAU<span className="accent">60</span>
        </span>
      )}
    </span>
  );
}
