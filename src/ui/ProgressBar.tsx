interface Props {
  value: number; // 0..1
  label?: string;
  thin?: boolean;
}

export function ProgressBar({ value, label, thin }: Props) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={`progress ${thin ? 'progress--thin' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <div className="progress__fill" style={{ transform: `scaleX(${v})` }} />
    </div>
  );
}
