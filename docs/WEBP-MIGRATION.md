# Migration WebP

Au premier chargement du monde par un MJ, MERP UI recherche les anciens chemins
PNG pointant vers :

```text
modules/merp-ui/assets/icons/
```

Il ne remplace un chemin que lorsqu’un fichier WebP correspondant est présent
dans `assets/catalog.json`.

## Simulation

```javascript
await MERPUI.previewWebPMigration()
```

Cette commande ne modifie aucun document.

## Relance forcée

```javascript
await MERPUI.migrateWebP({ force: true })
```

## Portée

La migration parcourt les documents du monde et leurs documents embarqués,
notamment les Notes, Tiles et Tokens des Scènes. Elle ne modifie pas les
compendiums verrouillés.
