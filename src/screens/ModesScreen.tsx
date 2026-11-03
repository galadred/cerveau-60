import { motion } from 'motion/react';
import { useNavigation } from '@/app/navigation';
import { MODES } from '@/core/modes';
import { useGameStore } from '@/state/GameStore';
import { IconArrowRight } from '@/ui/Icons';
import { ModeGlyph } from '@/ui/ModeGlyph';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Screen, stagger } from './Screen';

export function ModesScreen({ direction }: { direction: 1 | -1 }) {
  const { navigate } = useNavigation();
  const { stats } = useGameStore();

  return (
    <Screen direction={direction}>
      <ScreenHeader eyebrow="Choisis ton terrain" title={<>Modes de <em className="accent">jeu</em></>} />
      <motion.ul className="mode-grid" variants={stagger.container} initial="hidden" animate="show">
        {MODES.map((m) => {
          const ms = stats.byMode[m.id];
          return (
            <motion.li key={m.id} variants={stagger.item}>
              <button className={`mode-card card mode-card--${m.id}`} onClick={() => navigate({ name: 'briefing', mode: m.id })}>
                <span className="mode-card__index num">{m.index}</span>
                <span className="mode-card__art"><ModeGlyph glyph={m.glyph} /></span>
                <span className="mode-card__body">
                  <span className="eyebrow">{m.tagline}</span>
                  <span className="display mode-card__name">{m.name}</span>
                  <span className="mode-card__desc">{m.description}</span>
                </span>
                <span className="mode-card__foot">
                  <span className="mode-card__best">
                    {ms.games > 0 ? (
                      <>Record <span className="num accent">{ms.bestScore.toLocaleString('fr-FR')}</span></>
                    ) : (
                      'Jamais joué'
                    )}
                  </span>
                  <span className="mode-card__go"><IconArrowRight /></span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </Screen>
  );
}
