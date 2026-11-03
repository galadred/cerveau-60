import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { NAME_MAX, sanitizeName, useGameStore } from '@/state/GameStore';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Screen, stagger } from './Screen';

export function SettingsScreen({ direction }: { direction: 1 | -1 }) {
  const { profile, renamePlayer, updateSettings, resetProgress, stats } = useGameStore();
  const [name, setName] = useState(profile!.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const clean = sanitizeName(name);
  const canSave = clean.length >= 2 && clean !== profile!.name;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await renamePlayer(clean);
    setName(clean);
    setToast('Nom mis à jour');
  };

  const reduced = profile!.settings.reducedMotion;

  return (
    <Screen direction={direction}>
      <ScreenHeader eyebrow="Profil & préférences" title={<>Régla<em className="accent">ges</em></>} />

      <motion.div className="settings" variants={stagger.container} initial="hidden" animate="show">
        <motion.form variants={stagger.item} className="card settings__block" onSubmit={saveName}>
          <h2 className="section-title">Joueur</h2>
          <label className="field">
            <span className="field__label">Nom affiché</span>
            <input className="field__input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            <span className="field__hint">Utilisé dans le classement pour tes prochaines parties.</span>
          </label>
          <div className="settings__actions">
            <Button type="submit" disabled={!canSave}>Enregistrer</Button>
          </div>
        </motion.form>

        <motion.section variants={stagger.item} className="card settings__block">
          <h2 className="section-title">Affichage</h2>
          <div className="setting-row">
            <div>
              <p className="setting-row__title" id="rm-label">Réduire les animations</p>
              <p className="setting-row__desc">Désactive les transitions, le grain et les balayages.</p>
            </div>
            <button
              className="switch"
              role="switch"
              aria-checked={reduced}
              aria-labelledby="rm-label"
              onClick={() => updateSettings({ reducedMotion: !reduced })}
            />
          </div>
        </motion.section>

        <motion.section variants={stagger.item} className="card settings__block settings__danger">
          <h2 className="section-title">Données</h2>
          <p className="setting-row__desc">
            Tes données sont enregistrées sur cet appareil ({stats.games} partie{stats.games > 1 ? 's' : ''}, {profile!.xp.toLocaleString('fr-FR')} XP).
          </p>
          <div className="settings__actions">
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Réinitialiser la progression</Button>
          </div>
        </motion.section>
      </motion.div>

      <ConfirmDialog
        open={confirmReset}
        title="Tout effacer ?"
        confirmLabel="Effacer"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          await resetProgress();
          setConfirmReset(false);
          setToast('Progression réinitialisée');
        }}
      >
        Ton historique, tes statistiques, ton XP et tes scores locaux seront supprimés définitivement. Ton nom est conservé.
      </ConfirmDialog>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
