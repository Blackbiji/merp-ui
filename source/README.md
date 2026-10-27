# MERP-UI 1.6 — Sources canoniques des compendiums

`source/compendiums/` est la **source de vérité éditoriale** du modèle *Compendium-first*. **Ce répertoire doit également être présent dans le module installé**, car `scripts/merp-rmu/content-sync.js` lit son manifeste et les JSON sources pour synchroniser les mondes existants.

## Circuit de construction et de mise à jour

```text
source/compendiums/*.json (FR/EN, identifiants stables)
                ↓
npm run build:content-sync
                ↓
source/compendiums/content-sync-manifest.json
                ↓
npm run build:compendium-seeds
                ↓
packs/*.db (bootstrap / validation des sources)
                ↓
Foundry VTT : packs/<nom>/ (LevelDB)
                ↓
synchronisation des mondes via les sources embarquées
```

Les dossiers LevelDB et les fichiers `.db` ont des rôles différents : **conserver les `.db` dans le dépôt de développement** tant que les commandes de validation en dépendent. Dans le **ZIP de distribution CLEAN-29** destiné à Foundry VTT 13/14, les neuf dossiers LevelDB sont fournis directement et les neuf fichiers `.db` (anciens fichiers NeDB) sont exclus. Les chemins `seedPath` du manifeste décrivent les sorties du processus de construction dans le dépôt de développement, et non des fichiers nécessaires à l’exécution. Cette optimisation devra être confirmée sur un monde neuf et un monde déjà existant avant publication.

## Races, Cultures et Âges

Les Races et Cultures ne sont pas dupliquées pour chaque Âge. Chaque définition peut contenir `flags.merp-ui.availability.ages` et `flags.merp-ui.compendiumAgeVariants`. L'Âge de la campagne détermine la variante utilisée lors de l'application à un personnage.

## Professions RMU

Les dix Professions qui utilisent un châssis natif RMU sont conservées dans le compendium sous forme de définitions MERP-RMU. L'application récupère le châssis dans `rmu.core` et lui applique les particularités du module. Les **21 professions** ont désormais des descriptions complètes dans leurs localisations françaises et anglaises.

La liste historique de l’Astrologue « Lumières Stellaires » a été retirée de la source MERP-UI au profit de *Starlights* native dans Spell Law RMU. Le catalogue MERP-UI contient désormais 35 listes ; les listes natives RMU sont fournies par le système et non recopiées.

## Inventaire de référence RC6.1

| Compendium | Documents |
|---|---:|
| Races | 12 |
| Cultures | 60 |
| Professions | 21 |
| Compétences MERP-RMU | 8 |
| Listes de sorts | 35 |
| Talents & Défauts | 85 |
| Herbes & substances | 187 |
| Langues | 34 |
| Règles & références | 13 |
| **Total** | **455** |

## Vérification

Les commandes ci-dessous nécessitent le dépôt de développement complet et son `package.json`. Elles ne sont pas exécutables depuis le ZIP de distribution du module.

```sh
npm run validate:compendium-seeds
npm run validate:content-sync
npm run test:content-sync
npm run audit:release
```

Les tests hors ligne ne remplacent pas la vérification dans Foundry, notamment après changement de version du système RMU ou du moteur Foundry.
