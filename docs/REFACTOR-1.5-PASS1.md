# MERP-UI 1.5.0 — Refactor Pass 1

Baseline fonctionnelle : MERP-UI 1.4.42.

Cette passe ne change aucun comportement métier.

## Modules extraits

### `content-folders.js`
Responsabilités :
- résolution parent/enfant ;
- création/réutilisation des Folder Foundry ;
- localisation des noms de dossiers ;
- construction des hiérarchies configurées ;
- ordre fixe des dossiers Items MERP-RMU ;
- réparation historique Langues/Languages.

### `content-localization.js`
Responsabilités :
- localisation des Journaux ;
- localisation générique des Items/Journaux gérés ;
- localisation des Folder définis par les datasets ;
- rafraîchissement générique d'un dataset ;
- repaint des répertoires Foundry.

### `content-migrations.js`
Responsabilités :
- point d'entrée vers les migrations historiques existantes ;
- nettoyage des dossiers hérités ;
- suppression de l'ancien dossier vide `Talents & Flaws`.

## Intention du Pass 1

Créer des frontières de modules avant de supprimer quoi que ce soit.
Les rustines historiques restent donc présentes, mais elles ne sont plus mélangées
au cœur du contrôleur principal.

Les passes suivantes pourront modifier/supprimer ces blocs séparément avec des tests
de non-régression ciblés.
