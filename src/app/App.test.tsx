import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

async function onboard(name = 'Ada') {
  render(<App />);
  const input = await screen.findByLabelText(/nom de joueur/i);
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /entrer dans l’arène/i }));
  await screen.findByRole('button', { name: /^jouer$/i });
}

describe('Application', () => {
  it('refuse un nom trop court', async () => {
    render(<App />);
    const input = await screen.findByLabelText(/nom de joueur/i);
    const submit = screen.getByRole('button', { name: /entrer dans l’arène/i });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: ' a ' } });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Ad' } });
    expect(submit).toBeEnabled();
  });

  it('crée le profil, le persiste et affiche le menu', async () => {
    await onboard('  Ada   Lovelace ');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('cerveau60:profile')!).name).toBe('Ada Lovelace');
  });

  it('navigue : menu → modes → briefing → retour', async () => {
    await onboard();
    fireEvent.click(screen.getByRole('button', { name: /^jouer$/i }));
    expect(await screen.findByRole('heading', { name: /modes de jeu/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /logique/i }));
    expect(await screen.findByRole('radiogroup', { name: /difficulté/i })).toBeInTheDocument();
    // Expert et Génie verrouillés au niveau 1
    expect(screen.getByRole('radio', { name: /expert/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /génie/i })).toBeDisabled();
    const confirme = screen.getByRole('radio', { name: /confirmé/i });
    fireEvent.click(confirme);
    expect(confirme).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: /retour/i }));
    expect(await screen.findByRole('heading', { name: /modes de jeu/i })).toBeInTheDocument();
  });

  it('ouvre statistiques, classement et réglages depuis le menu', async () => {
    await onboard();
    fireEvent.click(screen.getByRole('button', { name: /^statistiques$/i }));
    expect(await screen.findByText(/aucune partie pour l’instant/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retour/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^classement$/i }));
    expect(await screen.findByText(/le podium est vide/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /énigmes/i }));
    expect(screen.getByRole('tab', { name: /énigmes/i })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: /retour/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^réglages$/i }));
    expect(await screen.findByRole('heading', { name: /réglages/i })).toBeInTheDocument();
  });

  it('renomme le joueur et bascule la réduction des animations', async () => {
    await onboard();
    fireEvent.click(screen.getByRole('button', { name: /^réglages$/i }));
    const input = await screen.findByLabelText(/nom affiché/i);
    const save = screen.getByRole('button', { name: /enregistrer/i });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Grace' } });
    await act(async () => fireEvent.click(save));
    expect(JSON.parse(localStorage.getItem('cerveau60:profile')!).name).toBe('Grace');
    const sw = screen.getByRole('switch', { name: /réduire les animations/i });
    await act(async () => fireEvent.click(sw));
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
    expect(JSON.parse(localStorage.getItem('cerveau60:profile')!).settings.reducedMotion).toBe(true);
  });

  it('réinitialise la progression après confirmation', async () => {
    localStorage.setItem('cerveau60:profile', JSON.stringify({ id: 'p1', name: 'Ada', createdAt: '', xp: 2000, settings: { reducedMotion: true } }));
    localStorage.setItem('cerveau60:results', JSON.stringify([
      { id: 'r1', playerId: 'p1', playerName: 'Ada', mode: 'logic', difficulty: 'novice', score: 4200, solved: 9, attempted: 10, bestStreak: 5, durationMs: 60000, playedAt: '2026-01-01T00:00:00Z' },
    ]));
    render(<App />);
    expect(await screen.findByText(/niv\. 3/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^réglages$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /réinitialiser la progression/i }));
    const dialog = await screen.findByRole('alertdialog');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^effacer$/i })));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('cerveau60:results')!)).toEqual([]);
    expect(JSON.parse(localStorage.getItem('cerveau60:profile')!).xp).toBe(0);
  });

  it('lance une manche Logique, répond, puis abandonne sans rien enregistrer', async () => {
    await onboard();
    fireEvent.click(screen.getByRole('button', { name: /^jouer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /logique/i }));
    fireEvent.click((await screen.findAllByRole('button', { name: /lancer/i }))[0]);
    // compte à rebours 3-2-1 puis première énigme
    const choices = await screen.findAllByRole('button', { name: /^réponse \d/i }, { timeout: 4000 });
    expect(choices).toHaveLength(4);
    expect(screen.getByRole('timer')).toBeInTheDocument();
    fireEvent.click(choices[0]);
    // verrou pendant le retour visuel : les propositions sont désactivées
    expect(screen.getAllByRole('button', { name: /^réponse \d/i })[1]).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /abandonner la manche/i }));
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: /^abandonner$/i })));
    expect(await screen.findByRole('radiogroup', { name: /difficulté/i })).toBeInTheDocument();
    expect(localStorage.getItem('cerveau60:results')).toBeNull();
  });

  it('lance une manche Observation et répond en touchant une case', async () => {
    await onboard();
    fireEvent.click(screen.getByRole('button', { name: /^jouer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /observation/i }));
    fireEvent.click((await screen.findAllByRole('button', { name: /lancer/i }))[0]);
    expect(await screen.findByRole('timer', {}, { timeout: 4000 })).toBeInTheDocument();
    await screen.findByText(/intrus|différence|motif|détail caché/i, { selector: '.tag' }, { timeout: 4000 });
    const cells = screen.queryAllByRole('button', { name: /ligne \d, colonne \d/i });
    const options = screen.queryAllByRole('button', { name: /^réponse \d/i });
    expect(cells.length + options.length).toBeGreaterThan(0);
    fireEvent.click(cells[0] ?? options[0]);
    // verrou pendant le retour visuel
    expect((cells[1] ?? options[1])).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /abandonner la manche/i }));
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: /^abandonner$/i })));
    expect(localStorage.getItem('cerveau60:results')).toBeNull();
  });

  it('les modes non encore développés n’ont pas de bouton de lancement', async () => {
    await onboard();
    fireEvent.click(screen.getByRole('button', { name: /^jouer$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /énigmes/i }));
    expect(await screen.findByText(/étape 4/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lancer/i })).toBeNull();
  });
});
