# MERP-UI 1.5.0 — Refactor Pass 4

Baseline fonctionnelle : `1.5.0-alpha.3`.

## Objectif

Faire de `merp-rmu-content.js` un orchestrateur. Les domaines métier restants
sont déplacés dans des modules autonomes sans modifier leurs données ni leur
comportement.

## Modules créés

### `managed-content.js`
- recherche et upsert des Items/Journaux gérés ;
- préparation des documents ;
- alias et résolution des liens ;
- enrichissement des descriptions et pages de Journaux.

### `professions.js`
- descriptions de Professions ;
- restauration du châssis RMU natif ;
- clés techniques des Professions sur Actor ;
- installation des Professions RMU natives adaptées.

### `spell-lists.js`
- icônes selon Royaume ;
- traductions des Spell Lists/Spells RMU natifs ;
- listes MERP-RMU propres ;
- localisation des listes custom ;
- réparation manuelle du catalogue.

Les migrations historiques restent séparées dans `spell-list-migrations.js`.

### `special-power-skills.js`
- Healing Songs / Chants de Guérison ;
- Yavanna's Song / Chant de Yavanna ;
- synchronisation Actor ;
- injection dans les dialogues de création ;
- tables de résultats spécifiques.

### `introduction.js`
- Présentation / Introduction MERP-RMU ;
- localisation des pages et dossiers associés.

## Contrôleur restant

`merp-rmu-content.js` conserve :
- chargement du dataset principal ;
- installation globale et prune contrôlée ;
- rafraîchissement global/localisation ;
- hooks Foundry ;
- correctifs de création RMU ;
- orchestration des modules ;
- API MERPUI.

Le but n'est pas encore de supprimer les migrations historiques : ce sera le
Pass 5, une fois cette architecture validée en monde de test.
