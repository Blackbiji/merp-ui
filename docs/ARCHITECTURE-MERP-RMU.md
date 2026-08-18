# Architecture MERP-RMU — création de personnage

## Objectif

Séparer progressivement les responsabilités sans modifier le comportement validé du système RMU ni les automatismes de magie.

## Couches

### `scripts/merp-rmu/creation-rules.js`
Règles pures MERP-RMU utilisées pendant la création de personnage :
- clés techniques des Professions ;
- caractéristiques primordiales MERP-RMU ;
- normalisation des identités de Listes de sorts ;
- règle Herutano : six Listes de base choisies parmi neuf.

Ce fichier ne doit pas enregistrer de hooks Foundry et ne doit pas modifier les prototypes RMU.

### `scripts/merp-rmu/creation-adapter.js`
Adaptateur Foundry/RMU pour les restrictions de bas niveau :
- hooks `preCreateItem` / `preUpdateItem` ;
- blocage des compétences MERP interdites ;
- prévention des doublons de Listes de base ;
- application du plafond Herutano.

Les prédicats MERP-RMU sont injectés depuis la couche de contenu/règles afin de conserver un couplage faible.

### `scripts/merp-rmu-content.js`
Reste, à cette étape, responsable de :
- installation et migrations de contenu ;
- synchronisation des Professions, Cultures, Races et Listes ;
- réparations historiques ;
- patches UI/prototypes RMU nécessaires à la création.

Les patches UI RMU seront extraits dans une étape ultérieure après validation de la 1.3.6.

### `scripts/merp-rmu-magic.js`
Couche gelée pendant ce refactor :
- lancement des sorts ;
- Risque d’attirer l’Ombre ;
- Corruption ;
- Paroles de Commandement et intégration JLS/SCR.

Aucune dépendance de création ne doit être ajoutée dans ce fichier.

## Principe de migration

Chaque extraction doit être comportementalement neutre : déplacer d’abord les règles, valider dans Foundry, puis seulement poursuivre avec la couche suivante.
