# Catalogue des ressources MERP UI

Le catalogue principal est :

```text
assets/catalog.json
```

Les icônes utilisent désormais le format WebP et sont organisées dans :

```text
assets/icons/<catégorie>/<nom>.webp
```

## Accès depuis la console ou un module

Recherche globale par nom :

```javascript
MERPUI.icon("Bridge")
```

Recherche par catégorie et nom :

```javascript
MERPUI.icon("architecture", "Bridge")
```

Recherche générique :

```javascript
MERPUI.assetPath("icons", "Bridge")
```

Le code consommateur ne doit pas construire lui-même une extension `.png`
ou `.webp`. Il doit utiliser le chemin fourni par le catalogue.
