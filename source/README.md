# MERP-UI 1.6 — Sources des Compendiums

`source/` est désormais la **source de vérité éditoriale** du modèle
Compendium-first.

Ne jamais modifier manuellement les packs distribués.

```text
source/compendiums/
        ↓
modification
        ↓
npm run build:compendium-seeds
        ↓
packs/*.db (bootstrap de développement)
        ↓
Foundry VTT
        ↓
migration automatique vers packs/<nom>/ LevelDB
```

## Pourquoi des `.db` existent encore dans cette alpha ?

Foundry VTT 11+ utilise LevelDB pour ses Compendiums. Le CLI officiel Foundry
n'est pas disponible dans l'environnement de build utilisé ici.

La procédure officielle Foundry permet néanmoins de fournir une ancienne base
NeDB `.db` tout en déclarant dans `module.json` le chemin **sans extension**.
Au premier chargement du module, Foundry crée alors le répertoire LevelDB
correspondant.

Exemple :

```text
module.json:
  path: packs/merp-rmu-cultures

bootstrap:
  packs/merp-rmu-cultures.db

après premier chargement Foundry:
  packs/merp-rmu-cultures/
```

Pour une release GitHub finale, le dossier LevelDB généré et validé dans Foundry
sera l'artefact distribué.

## Âges

Les Races et Cultures ne sont plus dupliquées par Âge.

Une seule Culture canonique contient :

```text
flags.merp-ui.availability.ages
flags.merp-ui.compendiumAgeVariants
```

Le réglage du monde **MERP-RMU — Âge de la campagne / Campaign Age** détermine
la variante appliquée au drag & drop.

Une Race/Culture indisponible à l'Âge sélectionné est refusée.

## Professions RMU natives

Les 10 Professions reposant sur un châssis RMU Core sont conservées sous forme
de définitions MERP-RMU dans le Compendium. Au drag & drop, MERP-UI récupère le
châssis correspondant dans `rmu.core` puis applique notre overlay.

Cela évite de redistribuer les données mécaniques propriétaires du Core RMU tout
en présentant les 21 Professions dans une bibliothèque unique.

## Packs

- Races : 12
- Cultures : 59
- Professions : 21
- Compétences : 8
- Listes de Sorts propres MERP-RMU : 36
- Talents & Défauts : 85
- Herbes & Substances : 187
- Langues : 34 Journaux
- Règles & Références : 13 Journaux

Le runtime 1.6 n'installe plus automatiquement ce contenu dans un monde neuf.
