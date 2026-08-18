# MERP-UI 1.5.0 — Refactor Pass 2: Spell Lists

Baseline : `1.5.0-alpha.1`.

## Avant

Trois types d'opérations étaient encore entremêlés :

1. installation fonctionnelle des listes MERP-RMU ;
2. localisation FR/EN ;
3. réparations historiques :
   - recréation permanente des listes custom (« self-heal »),
   - nettoyage de l'ancien Compendium World,
   - déduplication globale des imports Spell Law.

Certaines de ces réparations étaient rejouées au démarrage ou lors d'une simple
bascule de langue.

## Après

### Installation réelle
Une nouvelle version de données installe :
- les clones RMU natifs réellement adaptés par MERP-RMU ;
- les listes propres MERP-RMU comme Items World ;
- le placement canonique Honnin.

### Localisation
Une bascule FR/EN ne fait que localiser les documents existants. Elle ne devient
plus un checkpoint d'intégrité mécanique.

### Migration historique
`spell-list-migrations.js` prend en charge, une seule fois par monde :
- la vidange de l'ancien `world.merp-rmu-spell-lists` ;
- la déduplication des imports Spell Law réellement identiques.

Le réglage versionné est :
`merpUi.merpRmuSpellListArchitectureMigrationVersion`.

## Compatibilité console

Les helpers historiques sont conservés lorsque cela évite de casser les habitudes,
mais ils sont désormais explicitement manuels et ne font plus partie du chemin
normal.
