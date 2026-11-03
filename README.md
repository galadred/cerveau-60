# CERVEAU 60 – Brain Training

> Ton cerveau a 60 secondes.

Jeu web de réflexion (logique, observation, énigmes, défi quotidien), en React + TypeScript + Vite.

```bash
npm install
npm run dev        # développement
npm test           # tests unitaires + intégration (Vitest)
npm run build      # typecheck + build de production
```

## Architecture

```
src/
├── core/                 Domaine pur, sans React ni stockage (100 % testable)
│   ├── types.ts          Profil, résultat de partie, statistiques
│   ├── modes.ts          4 modes, 4 difficultés (multiplicateur, pénalité, niveau requis)
│   ├── countdown.ts      Chronomètre basé sur une échéance absolue (monotone)
│   ├── scoring.ts        Points = (base + bonus vitesse) × difficulté × série
│   ├── progression.ts    XP → niveaux et titres
│   ├── stats.ts          Statistiques calculées depuis l'historique
│   ├── daily.ts          Clé du jour + aléatoire déterministe (défi identique pour tous)
│   └── daily-status.ts
├── services/             Accès aux données, derrière des interfaces asynchrones
│   ├── storage/          KeyValueStore + LocalStorageStore (résistant aux erreurs)
│   ├── repositories/     Contrats Profile/Result/Leaderboard + implémentation locale
│   └── index.ts          Fabrique unique → futur point de bascule Supabase
├── state/GameStore.tsx   Contexte React : profil, résultats, stats, niveau, actions
├── app/                  App racine, navigation (pile + direction des transitions)
├── hooks/                useCountdown (rAF), useNow, formatage du temps
├── ui/                   Composants : Button, TimerRing, ConfirmDialog, Logo, glyphes…
├── screens/              Onboarding, Menu, Modes, Briefing, Stats, Classement, Réglages
└── styles/               tokens.css (palette), base.css, ui.css, screens.css
```

### Intégration Supabase (plus tard)
Les écrans ne parlent qu'aux interfaces de `services/repositories/types.ts`.
Il suffira d'écrire `createSupabaseRepositories()` qui les implémente et de la retourner
depuis `services/index.ts` quand `VITE_SUPABASE_URL` est défini. L'id du profil local
(UUID) servira à rattacher l'historique au compte lors de la première connexion.

## Feuille de route

| Étape | Contenu | État |
|---|---|---|
| 1 | Fondations, design system, stockage, profil, menu, navigation animée, modes, briefing & difficultés, stats, classement local, réglages | ✅ |
| 2 | Moteur de manche (60 s, pénalités, série, score, écran de résultats) + mode **Logique** (générateurs procéduraux) | ⏳ |
| 3 | Mode **Observation** (différences, intrus, détails cachés) | |
| 4 | Mode **Énigmes** (banque d'énigmes, vérification tolérante des réponses) | |
| 5 | **Défi quotidien** (énigme déterministe du jour, une tentative) | |
| 6 | Finitions : sons, succès, PWA hors ligne, puis Supabase | |
