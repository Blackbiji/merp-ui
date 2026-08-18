# Personnaliser MERP UI 1.0

La palette centrale se trouve dans :

```text
styles/merp-theme.css
```

Cherchez le bloc :

```css
:root {
  --merp-black: #161616;
  --merp-charcoal: #242424;
  --merp-slate-dark: #333333;
  --merp-slate: #4a4a4a;
  --merp-steel-dark: #5f5f5f;
  --merp-steel: #787878;
  --merp-silver-dark: #9a9a9a;
  --merp-silver: #b8b8b8;
  --merp-pearl: #d8d8d8;
  --merp-paper: #f4f4f4;
  --merp-white: #fafafa;
  --merp-gold: #a27b39;
}
```

Modifier ces variables permet de recolorer l'ensemble du thème sans réécrire
les règles RMU.

Les modules qui utilisent les variables officielles RMU héritent automatiquement
de cette palette. Les modules qui utilisent des couleurs codées en dur devront
être corrigés séparément.
