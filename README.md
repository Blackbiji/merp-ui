# MERP UI 0.8.0

Cette version sépare clairement :

- `styles/merp-typography.css` : PragRoman et les métriques de texte ;
- `styles/merp-theme.css` : fonds, couleurs, cadres et titres.

PragRoman n'est appliquée qu'aux zones textuelles. Les boutons, onglets,
barres d'outils, contrôles de fenêtre et icônes Foundry restent natifs.

## Compatibilité

```text
fennas-drunin-rmu-0.5.10-rmu-skill-tooltips
```

## Diagnostic

```javascript
MERPUI.typography()
```

```javascript
await MERPUI.loadTypography({ force: true })
```
