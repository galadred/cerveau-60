import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { NAME_MAX, sanitizeName, useGameStore } from '@/state/GameStore';
import { Button } from '@/ui/Button';
import { IconArrowRight } from '@/ui/Icons';
import { Logo } from '@/ui/Logo';
import { TimerRing } from '@/ui/TimerRing';
import { stagger } from './Screen';

/** Premier lancement : création du profil joueur. */
export function Onboarding() {
  const { createProfile } = useGameStore();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = sanitizeName(name).length >= 2;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    await createProfile(name);
  };

  return (
    <motion.main
      className="onboarding container"
      variants={stagger.container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.4 } }}
    >
      <motion.div variants={stagger.item}><Logo /></motion.div>

      <div className="onboarding__body">
        <motion.div variants={stagger.item} className="onboarding__ring">
          <TimerRing progress={1} size={168} stroke={5} ambient>
            <span className="display onboarding__ring-num">60</span>
          </TimerRing>
        </motion.div>
        <motion.p variants={stagger.item} className="eyebrow">Brain training</motion.p>
        <motion.h1 variants={stagger.item} className="display onboarding__title">
          Ton cerveau a <em className="accent">60&nbsp;secondes.</em>
        </motion.h1>
        <motion.p variants={stagger.item} className="onboarding__lead">
          Logique, observation, énigmes. Chaque manche dure une minute. Chaque seconde compte.
        </motion.p>

        <motion.form variants={stagger.item} className="onboarding__form" onSubmit={submit}>
          <label className="field">
            <span className="field__label">Nom de joueur</span>
            <input
              className="field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="Ex. Ada"
              autoComplete="nickname"
              autoFocus
            />
            <span className="field__hint">2 à {NAME_MAX} caractères — modifiable à tout moment.</span>
          </label>
          <Button type="submit" size="lg" block disabled={!valid || busy} iconRight={<IconArrowRight />}>
            Entrer dans l’arène
          </Button>
        </motion.form>
      </div>
    </motion.main>
  );
}
