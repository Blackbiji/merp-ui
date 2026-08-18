# MERP-UI 1.5.0 — Refactor Pass 5

Baseline : `1.5.0-alpha.4.5`.

Le runtime 1.5 ne rejoue plus les réparations historiques. Une seule migration
de monde, `migration-1.5.js`, amène un monde 1.4.x vers l’état attendu.

## Migration unique

Setting : `merp-ui.merpRmu15MigrationVersion`

La migration :
- supprime les anciens Talents RMSS/FRP par flag technique ;
- nettoie STARTLIGHT ;
- vide l’ancien Compendium technique de Spell Lists ;
- déduplique uniquement les listes strictement identiques ;
- restaure une fois le châssis RMU des Professions ;
- consolide une fois Langues/Languages ;
- fixe une fois l’ordre des dossiers Items.

Elle ne supprime jamais un catalogue sur la seule base de son nom traduit.

## Runtime normal

Une fois la migration marquée actuelle :
- aucun runner historique ne se relance ;
- une bascule FR/EN ne fait que de la localisation ;
- le démarrage ne fait plus de réparation de châssis historique ;
- les anciens settings de migration ne sont plus enregistrés.
