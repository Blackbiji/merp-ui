# Flux de travail FontForge

## Import manuel

1. Ouvrir FontForge.
2. `Fichier > Nouveau`.
3. Régler l’EM sur **1000** dans `Élément > Informations de la police > Général`.
4. Pour chaque glyphe :
   - double-cliquer la case Unicode ;
   - `Fichier > Importer` ;
   - choisir le SVG correspondant dans `sources/<face>/glyphs/`.
5. Reporter la chasse depuis `glyphs.csv`.
6. Exécuter :
   - `Élément > Corriger la direction` ;
   - `Élément > Supprimer les chevauchements` ;
   - `Élément > Simplifier`.
7. Régler l’ascendante à **800** et la descendante à **200**.
8. Générer localement vos OTF/WOFF2.

## Construction automatisée

Avec FontForge installé :

```bash
fontforge -script scripts/build_with_fontforge.py \
  sources/FennasRoman-Regular build
```

Ou toute la famille :

```bash
bash scripts/build_all.sh
```

Les binaires compilés restent sur votre machine.
