import type { ReactNode } from 'react';
import { useNavigation } from '@/app/navigation';
import { IconArrowLeft } from './Icons';

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, aside }: Props) {
  const { back, canGoBack, home } = useNavigation();
  return (
    <header className="screen-header">
      <button className="icon-btn" onClick={canGoBack ? back : home} aria-label="Retour">
        <IconArrowLeft />
      </button>
      <div className="screen-header__text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display screen-header__title">{title}</h1>
        {subtitle && <p className="screen-header__sub">{subtitle}</p>}
      </div>
      {aside && <div className="screen-header__aside">{aside}</div>}
    </header>
  );
}
