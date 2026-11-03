# CERVEAU 60 – Brain Training

> Ton cerveau a 60 secondes.

Jeu web de réflexion (logique, observation, énigmes, défi quotidien), en React + TypeScript + Vite.

```bash
npm install
npm run dev        # développement
npm test           # tests unitaires + intégration (Vitest)
npm run build      # typecheck + build de production
npm run audit:visual  # audit au pixel des énigmes Observation (nécessite Playwright + Chromium)
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
│   ├── daily-status.ts
│   ├── random.ts         Rng reproductible + dérivation de graines
│   ├── puzzles/          Générateurs du mode Logique
│   │   ├── sequence.ts   Suites (11 familles de règles, 5 intensités)
│   │   ├── arithmetic.ts Calculs (priorités, parenthèses, pourcentages, opérande manquant)
│   │   ├── deduction.ts  Symboles + recherche exhaustive d'unicité
│   │   ├── solvers.ts    9 solveurs de suites : détectent les réponses concurrentes
│   │   ├── expr.ts       Évaluateur indépendant de ce qui est affiché
│   │   ├── validate.ts   Contrôle final de chaque énigme
│   │   └── logic.ts      Orchestration déterministe (graine, rang, intensité)
│   ├── observation/      Mode Observation
│   │   ├── cells.ts      Formes, symétries de rotation, signature visuelle, vocabulaire
│   │   ├── generators.ts Intrus, différences, erreurs de motif, détails cachés
│   │   ├── validate.ts   Preuves d'unicité (comparaison visuelle, recherche de périodes, comptage)
│   │   └── index.ts      Orchestration déterministe
│   └── engine/
│       ├── sources.ts    Générateur d'énigmes de chaque mode jouable
│       ├── session.ts    Moteur de manche (horloge, réponses, score, pénalités)
│       ├── intensity.ts  Difficulté progressive pendant la manche
│       └── verify.ts     Rejeu intégral d'une manche à partir de sa preuve
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

## Garanties du mode Logique

- **Solution unique et correcte** : chaque énigme est revalidée à partir de ce qui est *affiché*.
  - Suites : 9 solveurs (différences d'ordre 1 à 3, raison, récurrence affine, Fibonacci ± c,
    récurrence d'ordre 2, alternance d'opérations, suites entrelacées). Une suite n'est proposée que si
    toutes les règles qui s'ajustent donnent la même réponse. Exemple rejeté : 1, 3, 6, 11, 19 (31 ou 32).
  - Calculs : réévalués par un analyseur indépendant ; exactement une proposition satisfait l'égalité.
  - Déductions : recherche exhaustive sur tout le domaine annoncé au joueur (entiers de 1 à 20).

## Garanties du mode Observation

- **Comparaison visuelle, jamais paramétrique** : chaque forme a sa symétrie (carré 90°, croix 90°,
  triangle 120°, rond invariant). Un carré tourné de 90° est donc reconnu comme identique — aucune
  « différence invisible » ne peut être proposée.
- **Intrus** : une seule case diffère, toutes les autres sont identiques.
- **Différence** : comparaison case à case des deux images ; exactement un écart.
- **Erreur de motif** : toutes les périodes possibles (colonnes × lignes) sont testées ; une seule case
  doit pouvoir être l'erreur, et chaque élément du motif doit être observé au moins deux fois.
- **Détail caché** : comptage exact ; une seule des 4 propositions est juste.
- **Progression** : grilles de 3 × 3 à 6 × 5 ; écarts de couleur/forme (intensité 1) jusqu'aux rotations
  de 15°, points discrets et changements de taille (intensité 5).
- **Audit visuel** : `npm run audit:visual` dessine 1 500 énigmes avec le vrai composant, les rastérise
  dans Chromium et compare les pixels : exactement une case visiblement différente par énigme, 0 pixel
  d'écart sur toutes les autres. La géométrie des formes (`core/observation/geometry.ts`) est partagée par
  le rendu et par des tests qui prouvent ses symétries.
- **Retour visuel sans ambiguïté** : la bonne case est cerclée dans les deux images ; l'erreur n'est
  marquée (pointillés + ✕) que dans l'image touchée, et l'assombrissement reste identique entre A et B.
- **Mobile** : la taille des grilles s'adapte à la hauteur d'écran ; une manche ne demande jamais de défiler
  (vérifié sur iPhone 13 et iPhone SE).

## Garanties communes

- **Difficulté progressive** : 5 intensités ; la manche démarre au rang de la difficulté et monte d'un
  cran toutes les 4 bonnes réponses (+2 au maximum).
- **Chronomètre** : horloge monotone (`performance.now`) à échéance absolue — changer l'heure du système,
  mettre l'onglet en arrière-plan ou ralentir l'affichage ne change rien. Aucune pause ; le retour visuel
  consomme le temps ; abandonner n'enregistre rien.
- **Score cohérent** : calculé uniquement par le moteur. Avant chaque sauvegarde, la manche est rejouée
  à partir de sa preuve (graine + choix horodatés) ; toute incohérence bloque l'enregistrement.
- **Limite honnête** : un jeu 100 % navigateur ne peut pas empêcher un joueur déterminé de modifier
  le code via les outils de développement. La preuve stockée avec chaque résultat permettra au serveur
  (Supabase) de rejouer et valider les scores avant de les publier au classement en ligne.

## Feuille de route

| Étape | Contenu | État |
|---|---|---|
| 1 | Fondations, design system, stockage, profil, menu, navigation animée, modes, briefing & difficultés, stats, classement local, réglages | ✅ |
| 2 | Moteur de manche (60 s, pénalités, série, score, écran de résultats) + mode **Logique** (générateurs procéduraux) | ✅ |
| 3 | Mode **Observation** (intrus, différences, erreurs de motif, détails cachés) | ✅ |
| 4 | Mode **Énigmes** (banque d'énigmes, vérification tolérante des réponses) | ⏳ |
| 5 | **Défi quotidien** (énigme déterministe du jour, une tentative) | |
| 6 | Finitions : sons, succès, PWA hors ligne, puis Supabase | |
