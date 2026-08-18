# MERP-UI 1.6.0-alpha.2 — Compendium Pass corrigé

Baseline : **MERP-UI 1.5.1 Stable — RMU 1.5.33**.

## Changement de modèle

### 1.5

```text
MERP-UI
  → installateurs JavaScript
  → centaines de Documents copiés dans le World
```

### 1.6

```text
MERP-UI
  → Compendiums permanents
  → drag & drop / import à la demande
```

Un monde neuf n'est plus peuplé automatiquement.

Un monde 1.5 existant conserve ses Documents. La présence de Documents 1.5 est
détectée et MERP-UI ne les supprime pas.

## Cultures et Races

L'ancienne duplication par Âge est supprimée :

- 40 Races → 12 Races canoniques ;
- 173 Cultures → 59 Cultures canoniques.

Les variantes d'Âge originales ne sont pas perdues. Elles sont stockées dans
chaque source canonique et appliquées au drop selon le réglage du monde.

Le cas Honnin conserve notamment :

- Âge I : Honnin 8/0 ;
- Âge II : Honnin 8/0 + Apysaïque 6/4 ;
- Âge III : Honnin 8/0 + Apysaïque 4/2 ;
- Âge IV : Honnin 8/0.

## Professions

Le pack affiche 21 Professions :

- 11 Professions MERP-UI complètes ;
- 10 Professions basées sur un châssis RMU natif.

Les 10 dernières sont résolues lors du drop depuis RMU Core 1.5.33, puis
l'overlay MERP-RMU est appliqué.

## Packs Foundry

Les chemins déclarés dans `module.json` sont modernes et sans extension :

```text
packs/merp-rmu-races
packs/merp-rmu-cultures
...
```

Cette alpha inclut également les `.db` bootstrap afin que Foundry effectue la
migration officielle vers LevelDB lors du premier chargement.

La release finale 1.6 devra distribuer les dossiers LevelDB générés et validés.

## 9 Compendiums

### Items

1. Races
2. Cultures
3. Professions
4. Compétences
5. Listes de Sorts
6. Talents & Défauts
7. Herbes & Substances

### Journaux

8. Langues
9. Règles & Références
