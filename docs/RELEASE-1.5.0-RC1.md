# MERP-UI 1.5.0-rc.1

## Statut

Release Candidate issue de la baseline fonctionnelle validée
`1.5.0-alpha.5.2`.

Aucune mécanique, donnée éditoriale ou traduction n'a été modifiée lors de la
promotion RC.

## Refactor 1.5

### Pass 1 — Infrastructure
Séparation des dossiers, de la localisation gérée et des migrations.

### Pass 2 — Spell Lists
Séparation du runtime et des réparations historiques ; suppression du self-heal
permanent et de l'ancien Compendium technique du chemin normal.

### Pass 3 — Langues, Herbes, Talents & Défauts
Domaines autonomes utilisant l'infrastructure commune.

### Pass 4 — Orchestrateur
Extraction de `managed-content`, Professions, Spell Lists, Special Power Skills
et Introduction hors du contrôleur principal.

### Pass 5 — Migration 1.4.x → 1.5
Une seule migration versionnée remplace les anciennes rustines historiques.

## Invariants conservés

- bascule FR ↔ EN immédiate ;
- ordre fixe des dossiers Items MERP-RMU ;
- dossier Langues/Languages maintenu après changement de langue ;
- Starting Languages des Cultures ;
- synchronisation des langues sur Actors ;
- listes MERP-RMU propres et listes RMU adaptées ;
- traductions des Spell Lists et sorts ;
- Herbes et Guide des Herbes ;
- Talents & Défauts et restrictions ;
- Special Power Skills ;
- Introduction / Présentation MERP-RMU ;
- correctifs Honnin / Herutano / Razak-Zinul déjà validés.

## Installation de test RC

Cette archive est complète. Remplacer le dossier `modules/merp-ui` par celui de
la RC dans un monde de test, puis vérifier la version :

```js
game.modules.get("merp-ui")?.version
```

Résultat attendu :

```text
1.5.0-rc.1
```
