# MERP-UI 1.5.0 — Refactor Pass 3

Baseline : `1.5.0-alpha.2.4`.

Cette passe isole trois domaines fonctionnels qui disposaient encore de chemins
de localisation/installation distincts dans le contrôleur principal.

## 1. Langues

Nouveau module : `culture-languages.js`.

Il possède désormais :
- normalisation des identités linguistiques ;
- génération/synchronisation des Langues de Campagne RMU ;
- résolution de la Culture de référence d’un Actor ;
- Starting Languages ;
- création/mise à jour des compétences Language Spoken / Language Written ;
- synchronisation d’un Actor ou de tous les Actors.

Le contrôleur principal ne conserve que les appels d’orchestration et les hooks
Foundry qui déclenchent la synchronisation.

## 2. Herbes

Nouveau module : `herbs.js`.

Il possède :
- chargement de `herbs-v1.json` ;
- installation du catalogue ;
- installation/localisation du Journal ;
- dossier racine Herbs/Herbes ;
- réglages world version/langue.

La localisation des Items continue d’utiliser le moteur commun
`refreshManagedDatasetLocalization()`.

## 3. Talents & Défauts

`talents-flaws.js` reste un module dédié car il contient une vraie règle métier :
les restrictions par Race/Culture.

En revanche il n’implémente plus son propre moteur de dossiers/localisation :
- `ensureItemFolder`, `localizedFolderName`, `localizedFolderAliases`,
  `folderParentId` viennent de `content-folders.js`;
- la localisation des Items et sous-dossiers passe par
  `refreshManagedDatasetLocalization()`.

Le repositionnement canonique des Items reste explicitement séparé de la
localisation afin de conserver le comportement de migration des anciens mondes.

## Résultat

`merp-rmu-content.js` devient davantage un orchestrateur et perd les
implémentations détaillées de ces trois domaines sans modifier les données.
