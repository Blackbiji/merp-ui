## 1.6.0-rc.1 — Release Candidate 1
- Baseline gelée : `1.6.0-alpha.18`, validée en conditions réelles dans Foundry.
- Architecture **Compendium-first** retenue comme architecture de publication.
- Neuf Compendiums permanents regroupés sous le dossier `MERP-RMU`.
- Unification des Races et Cultures par Âge : une entrée canonique avec variantes appliquées au drag & drop.
- 21 Professions exposées, avec résolution des châssis RMU natifs depuis le Core lorsque nécessaire.
- Localisation éditoriale EN/FR validée pour Compendiums, dossiers, contenu importé, Game Settings, Langues de Campagne et message d’accueil.
- Anglais défini comme langue éditoriale par défaut des nouveaux mondes.
- Guide d’installation/réglages intégré comme dernière page du Journal `MERP-RMU Presentation`.
- Le bouton du message Chat ouvre le guide dans `Rules & References`; le message est reposté dans la nouvelle langue lors d’une bascule EN/FR.
- Popup de guide supprimé définitivement au profit du Journal.
- Déclaration explicite de la restriction système `rmu`.
- Relation de compatibilité déclarée avec RMU `1.5.33`.
- README et métadonnées de publication réécrits pour la branche 1.6.
- Licence clarifiée : MIT sur le code/structure originaux uniquement; ajout de `NOTICE.md` pour les contenus et marques tiers.
- URLs GitHub `url`, `manifest`, `download`, `bugs`, `changelog` laissées volontairement non renseignées jusqu’au choix définitif du dépôt.

## 1.6.0-alpha.18 — Settings guide moved to Presentation Journal
- Baseline : `1.6.0-alpha.17`.
- Suppression complète du popup de guide : plus de fenêtre de premier lancement, zoom, Fit to Window, boutons de scroll ou réouverture automatique.
- Suppression du module runtime `first-run-guide.js` et de ses APIs `MERPUI.showSettingsGuide()` / `MERPUI.resetSettingsGuide()`.
- Le Journal `MERP-RMU Presentation` reçoit une nouvelle page finale `MERP-UI Installation & Settings Guide` / `Guide d’installation et de réglages MERP-UI`.
- Cette page affiche directement l’image WebP VO ou VF selon la langue éditoriale MERP-RMU.
- Le bouton `Show Settings Guide` / `Afficher le guide de réglages` du message Chat ouvre désormais directement cette page dans le Compendium `Règles & Références`.
- À chaque changement de langue MERP-RMU effectué par le MJ, un nouveau message d’accueil est reposté dans le Chat dans la langue nouvellement choisie.
- Les anciens messages restent dans l’historique du Chat ; aucun message n’est modifié rétroactivement.
- Le message initial au premier lancement reste publié une seule fois par monde.
- Aucun changement aux Compendiums de données, mécaniques de personnages ou réglages de campagne.

## 1.6.0-alpha.17 — Stable guide controls & localized welcome chat
- Baseline : `1.6.0-alpha.16`.
- Réécriture du contrôleur de zoom du guide : zoom strictement linéaire, borné de 60 % à 240 %, sans rebond ni cycling.
- Les boutons `Zoom -` et `Zoom +` sont désactivés automatiquement lorsque leur borne est atteinte.
- `Fit to Window` remet le multiplicateur à 100 % de l’échelle d’adaptation et replace le scroll en haut.
- Les boutons ▲/▼ utilisent une position cible absolue bornée entre `0` et le véritable `maxScrollTop`.
- Les boutons ▲/▼ sont automatiquement désactivés aux extrémités.
- Une vraie barre de défilement verticale reste visible dans la zone d’image.
- Le message Chat de bienvenue existant est maintenant relocalisé en place lors du changement de langue MERP-RMU.
- EN → FR traduit le message Chat en français ; FR → EN le repasse en anglais, sans créer de doublon.
- Le guide passe à la version interne 5 afin que le nouveau contrôleur soit proposé une fois.
- Aucun changement aux Compendiums ou données éditoriales.

## 1.6.0-alpha.16 — Guide follows content-language changes
- Baseline : `1.6.0-alpha.15`.
- Après une bascule de `MERP-RMU Content Language`, le guide de réglages est rouvert automatiquement dans la nouvelle langue.
- EN → FR rouvre immédiatement le guide VF ; FR → EN rouvre le guide VO.
- Cette réouverture contextuelle utilise `markSeen:false` et ne modifie donc pas le marqueur de premier lancement.
- Le titre, l’introduction, les libellés de zoom et le bouton de fermeture suivent explicitement la langue éditoriale MERP-RMU, indépendamment de la langue générale de Foundry.
- Fit to Window, zoom et boutons verticaux de défilement sont conservés.
- Aucun changement aux Compendiums, Game Settings, message Chat ou données MERP-RMU.

## 1.6.0-alpha.15 — Guide vertical scroll controls
- Baseline : `1.6.0-alpha.14`.
- Ajout de deux boutons verticaux à droite du guide : monter et descendre.
- Les boutons font défiler uniquement la zone de l’image, sans modifier le zoom ni déplacer le popup.
- Le défilement est doux et avance/recul d’environ 72 % de la hauteur visible du guide.
- Les contrôles restent disponibles quel que soit le niveau de zoom.
- Le guide passe à la version interne 4 afin que la nouvelle interface soit proposée une fois aux utilisateurs ayant vu la version précédente.
- Aucun changement aux Compendiums, Game Settings, message de bienvenue ou données MERP-RMU.

## 1.6.0-alpha.14 — Responsive first-run guide
- Baseline : `1.6.0-alpha.13`.
- Le popup du guide occupe désormais environ 78 % de la largeur et 88 % de la hauteur disponibles, avec limites adaptées aux grands écrans.
- L’image est automatiquement ajustée à la zone réellement disponible dans la fenêtre.
- Ajout de contrôles intégrés : zoom -, adapter à la fenêtre, zoom +.
- Plage de zoom : 55 % à 250 %, par pas de 20 %.
- Si l’image agrandie dépasse la fenêtre, la zone d’image devient scrollable.
- Le guide recalcule son échelle lors du redimensionnement de la fenêtre utilisateur.
- Sur petits écrans, les contrôles se compactent automatiquement pour privilégier l’image.
- Le guide passe à la version interne 3 afin que cette nouvelle présentation soit proposée une fois aux utilisateurs ayant vu une version antérieure.
- Aucun changement aux Compendiums, Game Settings, message de bienvenue ou données MERP-RMU.

## 1.6.0-alpha.13 — First-run guide & welcome chat startup fix
- Baseline : `1.6.0-alpha.12`.
- Le guide de premier lancement utilise désormais un numéro de version client (`settingsGuideVersion`) au lieu d’un simple booléen.
- La version actuelle du guide est `2` : les utilisateurs qui avaient déjà vu une ancienne version du popup pendant les alphas le verront donc une fois à nouveau.
- `MERPUI.resetSettingsGuide()` remet la version vue à `0` pour permettre un nouveau test.
- Correction du bug de placement de `maybePostWelcomeChat()` : l’appel était accidentellement imbriqué dans le `catch` de la synchronisation des Langues de Campagne.
- Le message de bienvenue est maintenant évalué normalement à chaque `ready` du MJ puis publié une seule fois par monde grâce à `welcomeChatPosted`.
- Aucun changement aux Compendiums, Game Settings, données ou mécaniques.

## 1.6.0-alpha.12 — Settings localization, compact guide & welcome chat
- Baseline : `1.6.0-alpha.11`.
- Correction des clés techniques utilisées par la localisation dynamique des Game Settings : la partie Magie suit désormais entièrement la langue éditoriale MERP-UI.
- Les clés corrigées sont `merpMagicAutomation`, `merpMagicShadowActivity`, `merpMagicAgePeriod`, `merpMagicRegion`, `merpMagicCorruptionAuto` et `merpMagicShadowWhisper`.
- Remplacement de `Automate the Consequences of Magic` par `Magic Consequences Automation` en VO.
- Remplacement de `Automatiser les conséquences de la magie` par `Automatisation des conséquences de la magie` en VF.
- Le popup de premier lancement est réduit d’environ 30 % et son image est affichée à 70 % de largeur.
- L’image du guide n’est plus un lien vers `/modules/...` : le clic ne peut donc plus ouvrir une page `localhost`.
- Ajout d’un message de bienvenue dans le chat, publié une seule fois par monde par le MJ.
- Le message rappelle la langue MERP-RMU, l’Âge de campagne, les réglages de l’Ombre et l’injection automatique des Langues de Campagne dans RMU.
- Le message comporte un bouton pour rouvrir le guide et un bouton pour ouvrir les Game Settings.
- Le message peut être retesté avec `await MERPUI.resetWelcomeChat()` puis rechargement.
- Aucun changement aux Compendiums, Races, Cultures, Professions ou données éditoriales.

## 1.6.0-alpha.11 — Culture folders & deterministic language switching
- Baseline : `1.6.0-alpha.10`.
- Suppression du redimensionnement spécifique du Compendium Cultures : il retrouve le comportement et la taille standard des autres Compendiums.
- Les anciens dossiers de Cultures issus des quatre Âges sont désormais ramenés à six clés techniques canoniques : `cultures-dunedain`, `cultures-khazad`, `cultures-humans`, `cultures-elves`, `cultures-hobbits`, `cultures-restricted`.
- Les Folder documents historiques portant des clés telles que `cultures-age-1-humans`, `cultures-age-3-elves`, etc. sont fusionnés dans leur dossier canonique.
- Si plusieurs Folder documents portent déjà la même clé canonique, leurs Items/enfants sont déplacés dans un seul dossier puis les doublons sont supprimés.
- La bascule de langue MERP-UI n’utilise plus deux déclencheurs concurrents (`onChange` + `updateSetting`) : `onChange` devient l’unique source de vérité.
- Suppression du second passage qui pouvait réappliquer la langue précédente immédiatement après FR→EN ou EN→FR.
- La fenêtre anti-double-déclenchement interne passe de 300 ms à 1500 ms pour absorber les rerenders Foundry sans bloquer un vrai changement ultérieur.
- Les Game Settings et les Compendiums sont toujours rerendus après la transaction de langue.
- Aucun changement aux données éditoriales, aux Cultures elles-mêmes, aux règles ou aux Compendiums hors organisation/localisation.

## 1.6.0-alpha.10 — Language switch hardening, Culture folders & guide sizing
- Baseline : `1.6.0-alpha.9`.
- Le popup du guide de premier lancement est réduit et l’image est désormais intégralement adaptée à la fenêtre (`object-fit: contain`, hauteur max 68vh), tout en restant cliquable pour ouverture en taille réelle.
- Le Compendium Cultures ouvre désormais avec une taille minimale confortable et adaptée à l’écran.
- Les catégories de Cultures sont canonisées indépendamment des anciens Âges : un seul dossier Humains/Humans, Elfes/Elves, Restreint/Restricted, etc.
- Les anciens dossiers culturels redondants deviennent obsolètes et sont nettoyés par le mécanisme de maintenance des Compendiums.
- La localisation des Documents des Compendiums reçoit désormais explicitement la langue demandée au lieu de dépendre seulement d’un override global.
- Le re-rendu des applications de Compendium est rendu compatible avec `Array`, `Map` ou objet Foundry afin d’éviter qu’une erreur de rendu interrompe une bascule FR/EN.
- Les Game Settings MERP-UI suivent maintenant la langue éditoriale MERP-RMU (FR/EN), indépendamment de la langue générale de l’interface Foundry.
- Les libellés, aides et options de Campaign Age, Shadow Activity, Magic Risk et Region Type sont réécrits à chaque rendu du panneau Settings.
- Après une bascule de langue réussie, les fenêtres Settings ouvertes sont explicitement re-rendues.
- Le texte indiquant qu’un rechargement est nécessaire pour changer de langue est supprimé : la bascule reste immédiate.

## 1.6.0-alpha.9 — First-run settings guide
- Baseline : `1.6.0-alpha.8`.
- Intégration de deux guides visuels MERP-UI / MERP-RMU dans `assets/guides/` :
  - `merp-ui-settings-guide-en.webp`
  - `merp-ui-settings-guide-fr.webp`
- Les deux guides sont convertis en WebP qualité 80 afin de limiter fortement le poids du module.
- Au premier lancement de MERP-UI sur un client RMU, un popup affiche directement le guide correspondant à la langue éditoriale MERP-UI active.
- Le popup n’est affiché automatiquement qu’une seule fois par client/utilisateur grâce au setting caché `settingsGuideSeen`.
- Chaque joueur et MJ reçoit donc son propre guide de premier lancement ; l’état d’affichage n’est pas partagé entre tous les utilisateurs du monde.
- Le guide peut être rouvert à tout moment via `MERPUI.showSettingsGuide()`.
- Pour retester le premier lancement : `await MERPUI.resetSettingsGuide()` puis rechargement.
- Un clic sur l’image du popup ouvre également le guide en taille réelle.
- Aucun changement aux Compendiums, Game Settings, mécaniques ou données validés en alpha.8.

## 1.6.0-alpha.8 — Localized Game Settings & Herbs card alignment
- Baseline : `1.6.0-alpha.7`.
- Les Game Settings MERP-UI/RMU n’utilisent plus de libellés français codés en dur : noms, descriptions et choix sont maintenant fournis par les fichiers i18n Foundry.
- Avec Foundry en anglais, les réglages MERP-UI s’affichent en VO ; avec Foundry en français, ils s’affichent en VF.
- Sont localisés : Âge de la campagne, automatisation de la magie, activité de l’Ombre, période du Risque magique, type de région, Corruption automatique et jets secrets de l’Ombre.
- Les choix Premier/Deuxième/Troisième/Quatrième Âge et les périodes du Risque magique sont eux aussi localisés.
- Ajout des chaînes bilingues destinées au futur popup de premier lancement et au Guide d’installation et de réglages MERP-UI.
- Recentrage spécifique de la carte `Herbs & Substances`, avec une légère réduction locale de la police pour empêcher le débordement.
- Aucun changement aux Compendiums, contenus, mécaniques ou données validés en alpha.7.

## 1.6.0-alpha.7 — Compendium root folder
- Baseline : `1.6.0-alpha.6`.
- Les 9 Compendiums MERP-RMU sont regroupés sous un unique dossier parent `MERP-RMU` dans l’onglet Compendiums.
- Le rangement utilise `packFolders` dans `module.json`.
- L’ordre interne des packs reste celui de MERP-RMU : Races, Cultures, Professions, Compétences, Listes de Sorts, Talents & Défauts, Herbes & Substances, Langues, Règles & Références.
- Aucun changement au contenu, aux sous-dossiers internes, à la localisation FR/EN, aux règles ou à la typographie validée en alpha.6.

## 1.6.0-alpha.6 — Compendium folders & Journal presentation
- Baseline : `1.6.0-alpha.5`.
- Fusion des deux anciens dossiers `Races Restreintes` en un seul dossier canonique, indépendant des variantes d’Âge historiques.
- Les anciens dossiers de Compendium gérés par MERP-UI sont supprimés automatiquement lorsqu’ils deviennent vides et ne correspondent plus à une clé de dossier valide.
- Le Compendium `Règles & Références` est réorganisé intégralement en cinq dossiers ordonnés :
  - `0 - Présentation de MERP - RMU`
  - `1 - Magie dans MERP`
  - `2 - Economie`
  - `3 - Religions`
  - `4 - Herbes et Substances, guide des simples`
- Tous les Journaux de `Règles & Références` appartiennent désormais à l’un de ces dossiers ; plus aucun Journal n’est laissé au niveau racine.
- `Herbes & Substances — Guide du voyageur` devient `Herbes et Substances, guide des simples` en français.
- Le titre anglais reste `Herbs & Substances — Traveller’s Guide`.
- Les titres des fenêtres des Compendiums `JournalEntry` sont centrés via une classe dédiée, sans modifier la présentation des Compendiums d’Items.
- Aucun changement aux mécaniques, données RMU ou comportements Compendium-first validés en alpha.5.

## 1.6.0-alpha.5 — Compendium labels & English default
- Baseline : `1.6.0-alpha.4`.
- La langue éditoriale MERP-UI par défaut passe de `fr` à `en` pour les nouveaux mondes.
- Les mondes existants conservent leur valeur `contentLanguage` enregistrée ; aucune préférence existante n’est écrasée.
- Le fallback interne de localisation devient également l’anglais.
- Les labels natifs des 9 packs dans `module.json` sont désormais anglais, cohérents avec la langue par défaut.
- Correction du changement visuel des noms de Compendiums : MERP-UI ne dépend plus de `CompendiumCollection.configure({label})`, qui ne modifiait pas de manière fiable le label d’un pack fourni par un module.
- Ajout d’une localisation de présentation sur `renderCompendiumDirectory` : les cartes affichent le label FR ou EN correspondant à la langue MERP-UI.
- Ajout d’une localisation du titre des fenêtres de Compendium ouvertes.
- Après une bascule FR/EN, le répertoire des Compendiums et les fenêtres de packs ouvertes sont explicitement re-rendus.
- Le contenu, les Items et les dossiers internes continuent à suivre la langue active comme en alpha.4.
- La taille de police des Compendiums validée en alpha.4 est inchangée.

## 1.6.0-alpha.4 — Shadow Ages, Journal titles & monolingual Compendiums
- Baseline fonctionnelle : `1.6.0-alpha.3`, validée dans Foundry.
- Ajout d’une option neutre `+0` au Modificateur d’Âge du Risque magique.
- Ajout de paramètres MERP-RMU proposés pour le Premier Âge : Guerre contre Morgoth `+25`, Morgoth en pleine puissance `+40`.
- Ajout de paramètres MERP-RMU proposés pour le Deuxième Âge : avant l’essor de Sauron `-10`, Sauron en puissance `+10`, Guerre de la Dernière Alliance `+25`.
- Les valeurs Premier/Deuxième Âge sont explicitement présentées comme des choix de campagne MERP-RMU, et non comme des valeurs canoniques ICE/RMU.
- Le Journal `Risque d’attirer l’Ombre` documente désormais ces nouvelles options en FR et EN.
- Les pages des Journaux MERP-RMU distribués en Compendium ont `title.show=false` afin d’éviter le double affichage du titre Foundry + titre éditorial.
- La règle est également appliquée aux Journaux déjà présents dans les packs et à ceux importés dans le World.
- Les noms des 9 Compendiums sont désormais monolingues et suivent la langue éditoriale active de MERP-UI.
- La synchronisation utilise `CompendiumCollection.configure({ label })` pour changer le libellé visible du pack.
- Les noms et dossiers internes des Compendiums continuent de suivre la langue active comme en alpha.3.
- La typographie des cartes de Compendiums est légèrement réduite (`0.88em`, ligne `1.08`) pour préserver la lisibilité.
- Aucun changement aux mécaniques de Races/Cultures/Professions validées en alpha.3.

## 1.6.0-alpha.3 — Compendium folders, bilingual libraries & clean fresh Worlds
- Le Prêtre Honnin et le Skill Tatouage ne sont plus injectés automatiquement dans un monde Compendium-first vierge.
- L’installateur Honnin historique ne s’exécute plus au `ready` que pour un monde 1.5 existant.
- Les sources Compendium conservent désormais un chemin de dossier technique et des libellés FR/EN.
- MERP-UI construit/actualise les dossiers internes des Compendiums à partir de ces chemins après migration Foundry.
- Les Compendiums Professions, Spell Lists, Talents & Défauts, Herbes, Races et Cultures retrouvent ainsi leur hiérarchie logique.
- Les Compendiums eux-mêmes sont désormais relocalisés lors d’une bascule FR/EN : noms ET contenus des Documents changent dans la bibliothèque avant import.
- Les Documents déjà importés continuent également à être relocalisés.
- Les dossiers internes des packs changent eux aussi de nom selon la langue.
- Les traits raciaux MERP-only connus qui provoquaient `rmu: racial talent not found` sont retirés de `system.talents` et conservés sous `flags.merp-ui.merpOnlyRacialTraits`.
- Sont concernés : Disease Immunity, Light Step, Fearless — Ghosts of Men, Large, Critical Resistance et Daywalker.
- Aucun de ces traits éditoriaux n’est perdu ; ils ne sont simplement plus soumis au résolveur de Talents natif RMU tant qu’un adaptateur dédié n’existe pas.
- Aucun fichier historique `data/merp-rmu/*.json` n’est modifié.

## 1.6.0-alpha.2 — Compendium-first corrigé
- Rebase complet sur `1.5.1 Stable — RMU 1.5.33`.
- Le runtime n’installe plus automatiquement les Items/Journaux MERP-RMU dans un monde neuf.
- Les mondes 1.5 existants sont détectés et leur contenu est conservé.
- 9 Compendiums permanents : 7 packs Item + 2 packs JournalEntry.
- Les chemins de packs sont déclarés sans extension, conformément au modèle LevelDB Foundry V11+.
- Les `.db` présents dans cette alpha servent uniquement de bootstrap de migration vers les dossiers LevelDB lors du premier chargement Foundry.
- 40 Races d’Âge deviennent 12 Races canoniques avec variantes d’Âge.
- 173 Cultures d’Âge deviennent 59 Cultures canoniques avec variantes d’Âge.
- Nouveau réglage de monde `MERP-RMU — Âge de la campagne / Campaign Age`.
- Le drag & drop applique automatiquement la variante d’Âge ; une Race/Culture indisponible à cet Âge est refusée.
- Le cas Honnin conserve ses Starting Languages propres à chaque Âge.
- Le pack Professions contient 21 Professions. Les 10 châssis RMU natifs sont résolus depuis `rmu.core` au drag & drop avant application de l’overlay MERP-RMU.
- Les Items/Journaux importés depuis les nouveaux Compendiums conservent leurs données FR/EN et se relocalisent avec MERP-UI.
- Les Langues (34 Journaux) et Règles & Références (13 Journaux) sont désormais elles aussi distribuées en Compendiums.
- Les fichiers historiques `data/merp-rmu/*.json` restent inchangés.

## 1.5.1 — Stable Hotfix — RMU 1.5.33
- Corrige l’installation MERP-RMU sur un monde RMU vierge.
- `managed-content.js` importe désormais explicitement `folderParentId()` depuis `content-folders.js`.
- `managed-content.js` importe également `localizeJournalDocument()` depuis `content-localization.js`, seconde dépendance manquante détectée pendant l’audit.
- Corrige le chemin `folderLineageNames() → ageFolderName() → chooseLinkTarget()` utilisé lors de la construction des liens sur un monde neuf.
- Smoke test ciblé du calcul de lignée de dossiers et de la préparation des Journaux : OK.
- Aucun changement aux données, traductions, règles ou contenus MERP-RMU.
- Compatibilité de référence inchangée : RMU 1.5.33.

## 1.5.0 — Stable — RMU 1.5.33
- Promotion de `1.5.0-rc.3` en version stable.
- Version de référence MERP-UI : `1.5.0`.
- Compatibilité de référence validée : `Rolemaster Unified 1.5.33`.
- Aucun changement fonctionnel par rapport à la RC.3.
- La localisation FR/EN, les Langues de Campagne, les Spell Lists, les Professions, les Talents & Défauts, les Herbes, les Starting Languages et la migration 1.4.x → 1.5 restent identiques à la RC.3 validée.
- Cette version devient la baseline stable pour les développements futurs.

## 1.5.0-rc.3 — Déduplication des Langues de Campagne
- Correction de la RC.2 : les anciennes formes FR et EN d’une même langue MERP-RMU sont désormais fusionnées en une seule entrée canonique.
- Les doublons historiques tels que `Adûnaïque`/`Adúnaic`, `Apysaïque`/`Apysaic`, `Parler Noir`/`Black Speech`, etc. sont supprimés automatiquement lors de la synchronisation.
- La fusion utilise l’identité technique canonique et ne dépend pas du nom actuellement affiché.
- Les langues non gérées par MERP-UI ne sont ni fusionnées ni renommées.
- Les éventuels champs RMU supplémentaires de la première entrée existante sont conservés.
- Les capacités parlé/écrit/lisible sur les lèvres/langue des signes restent celles définies par MERP-RMU ; Waildyth reste signalée uniquement.
- Aucun changement aux Starting Languages ni aux rangs S/W.

## 1.5.0-rc.2 — Localisation des Langues de Campagne
- Les noms des langues dans `Game Settings > RMU > Campaign Languages` suivent désormais explicitement la langue éditoriale MERP-UI.
- Ajout d’un résolveur d’identité canonique : les libellés FR et EN d’une même langue (`Adûnaïque` / `Adúnaic`, `Parler Noir` / `Black Speech`, `Orc` / `Orkish`, etc.) pointent vers la même langue technique.
- Les langues créées par d’anciennes versions sans `flags.merpUiTechnicalName` sont reconnues, renommées et mises à niveau sans duplication.
- Les clés techniques sont conservées dans `flags.merpUiTechnicalName`; seule la présentation change.
- Les langues non gérées par MERP-UI sont conservées telles quelles.
- La liste est retriée après changement de langue.
- Waildyth conserve son comportement spécifique signalé uniquement.
- Aucun changement aux Starting Languages des Cultures ni aux rangs S/W.

## 1.5.0-rc.1 — Release Candidate
- Promotion de `1.5.0-alpha.5.2` en Release Candidate après les cinq passes de refactor et la passe finale de non-régression.
- Aucun changement fonctionnel par rapport à `1.5.0-alpha.5.2`.
- Architecture 1.5 validée : dossiers/localisation/migrations séparés, Spell Lists nettoyées, Langues/Herbes/Talents modularisés, contrôleur principal réduit à l’orchestration, migration 1.4.x → 1.5 unique et versionnée.
- Bascule FR ↔ EN conservée avec ses invariants de dossiers.
- Données MERP-RMU strictement inchangées.
- Validation finale : JSON, syntaxe JavaScript, imports/exports, frontières de modules, constantes MERP/RMU, chemins de localisation et migration, smoke test d’import du contrôleur sous environnement Foundry simulé.

## 1.5.0-alpha.5.2 — Restauration des invariants de bascule FR/EN
- Correction du Pass 5 : `enforceMerpRmuTopLevelItemFolderOrder()` et `repairLanguagesJournalFolderName()` ne sont pas de simples migrations historiques ; ce sont des invariants idempotents de l’interface après changement des noms traduits.
- Ces deux opérations sont rétablies dans `refreshMerpRmuLocalization()`.
- Les vrais nettoyages historiques (STARTLIGHT, ancien Compendium, doublons, ancien import RMSS, restauration ponctuelle du châssis) restent exclusivement dans `migration-1.5.js`.
- Aucun nettoyage destructif n’est réintroduit dans la bascule FR/EN.
- Le moteur de traduction et les datasets restent inchangés.

## 1.5.0-alpha.5.1 — Correctif des hooks Item / Culture
- Les hooks génériques `createItem`, `updateItem` et `deleteItem` sont retirés de `culture-languages.js`.
- Ces hooks sont replacés dans `merp-rmu-content.js`, leur véritable niveau d’orchestration.
- Corrige `ReferenceError: isInvalidStartlightName is not defined` pendant la création des Spell Lists.
- Supprime aussi deux dépendances cachées de `culture-languages.js` vers les domaines Professions et Special Power Skills (`normalizeEmbeddedProfessionTechnicalKey` et `syncMerpSpecialPowerSkillsForActor`).
- `culture-languages.js` ne gère désormais plus que la logique des langues et ne possède plus aucun hook générique de cycle de vie des Items.
- Aucun changement aux données, langues, règles, Spell Lists ou migrations du Pass 5.

## 1.5.0-alpha.5 — Refactor Pass 5 : migration 1.4.x → 1.5
- Suppression des anciens runners de migrations 1.2/1.3/1.4 du fonctionnement normal.
- Suppression de `legacy-migrations.js` et des anciens settings de migration historique, Spell Lists et châssis de Professions.
- Nouvelle migration unique `migration-1.5.js`, versionnée par `merpRmu15MigrationVersion`.
- Cette migration s’exécute une seule fois après installation des domaines principaux.
- Elle regroupe uniquement les réparations sûres encore nécessaires : anciens Items Talents identifiés par flag technique, STARTLIGHT, ancien Compendium Spell Lists, doublons exacts, châssis des Professions, consolidation Langues/Languages et ordre des dossiers.
- `Talents & Flaws` n’est jamais traité comme obsolète sur son seul nom visible.
- Les bascules FR/EN ne lancent plus aucun nettoyage historique.
- Le démarrage normal ne rejoue plus les anciennes migrations Spell Lists ni la réparation permanente du châssis.
- Les outils manuels de diagnostic/réparation restent disponibles, et `MERPUI.migrateTo15()` est ajouté.
- Aucun changement aux données, règles, traductions ou contenus.

## 1.5.0-alpha.4.5 — Correctif frontière Special Power Skills
- `MERP_SPECIAL_POWER_SKILL_KEYS` est désormais exporté par `special-power-skills.js`, son module propriétaire.
- `merp-rmu-content.js` importe explicitement ce Set pour enregistrer les restrictions de création.
- Corrige `ReferenceError: MERP_SPECIAL_POWER_SKILL_KEYS is not defined` lors d’une bascule de langue.
- Audit des identifiants constants `MERP_*` / `RMU_*` encore utilisés dans l’orchestrateur : aucune référence non déclarée restante.
- Audit import/export complet : OK.
- Aucun changement aux données, règles ou traductions.

## 1.5.0-alpha.4.4 — Déclenchement de langue indépendant du global
- Le changement FR/EN ne dépend plus de la disponibilité préalable de `globalThis.MERPUI.requestContentLanguage`.
- `merp-ui.js` utilise désormais `requestMerpRmuContentLanguageDirect()`, qui privilégie l’API déjà exposée mais importe directement `merp-rmu-content.js` si nécessaire.
- Le module importé est mis en cache dans une Promise unique afin de ne pas créer plusieurs instances.
- Le `onChange` et le hook `updateSetting` utilisent exactement le même chemin.
- Corrige `requestContentLanguage() unavailable after language change`.
- Aucun changement aux données, traductions ou règles.

## 1.5.0-alpha.4.3 — Correctif du déclenchement FR/EN
- Le moteur de localisation n’est pas modifié ; correction du circuit de déclenchement.
- Nouveau dispatcher `requestMerpRmuContentLanguageChange()` avec déduplication courte.
- `MERPUI.requestContentLanguage()` est exposé dans l’API publique.
- Le `onChange` du setting `contentLanguage` utilise ce dispatcher.
- Ajout d’un hook `updateSetting` de secours pour `merp-ui.contentLanguage`.
- Les deux signaux convergent vers l’unique `applyMerpRmuContentLanguage()`.
- Aucun changement aux données, traductions ou règles.

## 1.5.0-alpha.4.2 — Correctif TDZ du rafraîchissement de langue
- `contentLanguageRefreshQueue` est désormais initialisée immédiatement après `MODULE_ID`, avant tout enregistrement de hook ou autre effet de bord du module.
- Corrige `Cannot access 'contentLanguageRefreshQueue' before initialization` lorsque Foundry déclenche `ready` pendant le chargement du module.
- Audit ciblé des variables module-level de type Cache/Queue/State/Promise déclarées après les hooks.
- Aucun changement aux données, règles, localisations ou modules métier du Pass 4.

## 1.5.0-alpha.4.1 — Correctifs de portée Pass 4
- `managed-content.js` importe désormais explicitement `localizeManagedDocument()`.
- Restauration de la variable module-level `contentLanguageRefreshQueue` utilisée par la sérialisation des bascules FR/EN.
- `MERP_MANAGED_JOURNAL_COLLECTIONS_WITH_INLINE_TITLES` est replacée avec les constantes module-level avant tout hook `ready`, supprimant l’erreur de temporal dead zone.
- Audit ciblé des identifiants module-level de type cache/queue/state dans le contrôleur et les nouveaux modules.
- Audit import/export complet et import dynamique des modules Pass 4 : OK.
- Aucun changement aux données ni aux règles.

## 1.5.0-alpha.4 — Refactor Pass 4: contrôleur/orchestrateur
- `merp-rmu-content.js` devient un contrôleur d’orchestration plutôt qu’un conteneur de logique métier.
- Nouveau `managed-content.js` : upsert/recherche des Items et Journaux gérés, enrichissement des liens et alias.
- Nouveau `professions.js` : descriptions, châssis RMU natifs, réparation des clés techniques Actor et installation des Professions RMU natives adaptées.
- Nouveau `spell-lists.js` : icônes de Royaume, traductions natives, clones/listes custom, localisation et réparation manuelle du catalogue.
- Nouveau `special-power-skills.js` : Chants de Guérison, Chant de Yavanna, options de création et tables de résultats spécifiques.
- Nouveau `introduction.js` : installation et localisation des Journaux de Présentation/Introduction MERP-RMU.
- Le contrôleur principal conserve l’installation globale, les hooks Foundry, les correctifs de création RMU et l’orchestration de la bascule FR/EN.
- Audit import/export complet sur tous les modules relatifs : OK.
- Import dynamique des cinq nouveaux modules autonomes sous Node : OK.
- Aucun changement aux données ni aux règles.

## 1.5.0-alpha.3 — Refactor Pass 3: Langues, Herbes, Talents & Défauts
- Extraction complète de la gestion des Langues vers `scripts/merp-rmu/culture-languages.js`.
- Le nouveau module regroupe les Langues de Campagne RMU, les Starting Languages des Cultures et leur synchronisation vers les Actors.
- Extraction complète du catalogue d’Herbes et de son Journal vers `scripts/merp-rmu/herbs.js`.
- Les réglages de version/langue des Herbes sont désormais enregistrés par le module Herbes lui-même.
- `talents-flaws.js` utilise désormais les helpers communs de dossiers (`content-folders.js`) au lieu de maintenir sa propre implémentation parallèle.
- La localisation des Talents & Défauts passe désormais par `refreshManagedDatasetLocalization()` du moteur commun.
- Le repositionnement canonique des Items Talents/Défauts est conservé séparément de la localisation afin de préserver le comportement validé des mondes anciens.
- `merp-rmu-content.js` ne contient plus les implémentations métier des Langues ni des Herbes ; il ne fait que les orchestrer.
- Aucun changement aux données, aux rangs S/W, aux langues attribuées, aux effets des Herbes, aux restrictions de Talents/Défauts ni aux traductions.
- Aucun changement aux Spell Lists du Pass 2.

## 1.5.0-alpha.2.4 — Correctif dépendances runtime Spell Lists
- `removeExactImportedSpellListDuplicates()` est déplacée hors du module de migrations vers `spell-list-utils.js`.
- `upsertConfiguredNativeSpellLists()` retrouve ainsi sa dépendance runtime normale.
- Le module de migration réutilise le même helper partagé.
- Audit exact des imports/exports entre `merp-rmu-content.js`, `spell-list-utils.js` et `spell-list-migrations.js` : aucune dépendance référencée non importée restante.
- Aucun changement aux données, listes, sorts, traductions ou règles.

## 1.5.0-alpha.2.3 — Correctif helpers Spell Lists
- `spellListSignature()` et `spellListSystemFingerprint()` sont sortis du module de migrations.
- Nouveau module partagé `spell-list-utils.js` pour les helpers purs d’identité/comparaison.
- Le runtime (`merp-rmu-content.js`) et la migration Spell Lists importent désormais ces helpers depuis le même module.
- Corrige `ReferenceError: spellListSignature is not defined` pendant l’installation/localisation des listes RMU natives adaptées.
- Audit des exports du module de migration afin de vérifier qu’aucune autre fonction de migration n’est utilisée implicitement comme dépendance runtime.
- Aucun changement aux données, aux listes, aux traductions ni aux règles.

## 1.5.0-alpha.2.2 — Correctif état module Spell Lists
- Restauration de la variable module-level `nativeSpellTranslationsCache`, perdue lors du refactor Pass 2.
- `loadNativeSpellTranslations()` retrouve son cache de traductions natif et peut de nouveau charger `native-spell-translations.json`.
- Audit statique supplémentaire des identifiants de type cache/queue/state du contrôleur principal afin de détecter d’autres variables de module éventuellement perdues.
- Aucun changement aux données, aux traductions, aux listes de sorts ni à la logique du Pass 2.

## 1.5.0-alpha.2.1 — Correctif import localisation
- Ajout de l’import manquant `applyManagedJournalLocalization` depuis `content-localization.js`.
- Corrige l’installation et la localisation de l’Introduction MERP-RMU au démarrage et lors des bascules FR/EN.
- Aucun autre comportement du Pass 2 n’est modifié.

## 1.5.0-alpha.2 — Refactor Pass 2: Spell Lists
- Le fonctionnement normal des Spell Lists est séparé des réparations historiques.
- Une bascule FR/EN ne recrée plus les listes MERP-RMU, ne déduplique plus le monde et ne touche plus à l’ancien Compendium World.
- Un monde dont le schéma MERP-RMU est déjà à jour effectue désormais uniquement la passe éditoriale/localisation ; le précédent « self-heal » permanent est supprimé.
- Lors d’une vraie installation de contenu, les listes MERP-RMU propres sont créées/mises à jour directement via `syncNonRmuWorldSpellLists()`, sans passer par une fonction de réparation de catalogue.
- Le nettoyage de l’ancien Compendium `world.merp-rmu-spell-lists` et la déduplication des imports Spell Law deviennent une migration versionnée exécutée une seule fois : `spell-list-migrations.js`.
- Suppression du réglage obsolète `merpRmuSpellListPackVersion` et des fonctions permanentes `syncNonRmuSpellListPack()` / `refreshNonRmuSpellListPackLocalization()`.
- `MERPUI.syncNonRmuSpellListPack()` reste uniquement comme alias de compatibilité et déclenche explicitement la migration technique 1.5.
- Ajout du helper `MERPUI.migrateSpellListArchitecture()` pour une migration/diagnostic manuel.
- `MERPUI.deduplicateSpellLists()` reste disponible comme outil manuel, mais n’est plus appelé automatiquement par le fonctionnement normal.
- Aucun changement aux données, aux listes elles-mêmes, aux sorts, aux traductions, aux icônes de Royaume ni aux règles de sélection.

## 1.5.0-alpha.1 — Refactor Pass 1: Infrastructure
- Première passe du refactor 1.5.0, volontairement limitée à l’infrastructure.
- Extraction des helpers de dossiers vers `scripts/merp-rmu/content-folders.js`.
- Extraction du moteur générique de localisation gérée vers `scripts/merp-rmu/content-localization.js`.
- Extraction de l’orchestration des migrations/nettoyages historiques vers `scripts/merp-rmu/content-migrations.js`.
- `merp-rmu-content.js` conserve l’orchestration métier et appelle désormais ces trois modules.
- Les signatures et comportements des fonctions déplacées sont conservés ; `removeEmptyLegacyTalentsFlawsFolder` reste exporté depuis `merp-rmu-content.js` pour compatibilité.
- Aucun changement aux données MERP-RMU, aux Races, Cultures, Professions, Skills, Spell Lists, sorts, Talents, Herbes, langues, rangs culturels ou règles de création.
- Aucun nettoyage fonctionnel des rustines historiques n’est encore effectué dans cette passe : elles sont seulement isolées pour permettre leur suppression contrôlée lors des passes suivantes.

## 1.4.42
- Correction définitive des doublons `Langues / Languages`.
- Le correctif identifie désormais le dossier qui contient réellement les Journaux gérés du gazetteer linguistique (`section: langages`) au lieu de prendre le premier dossier homonyme.
- Tous les Journaux linguistiques sont déplacés vers un dossier canonique unique.
- Ce dossier est forcé à `Langues` en FR et `Languages` en EN.
- Les anciens dossiers alias `Langues`, `Langages` ou `Languages` sont supprimés uniquement s’ils sont vides après consolidation.
- Le helper `MERPUI.fixLanguagesFolder()` renvoie désormais le nombre de Journaux déplacés, le nombre de doublons trouvés et supprimés.

## 1.4.41
- Correctif renforcé du dossier Journal `Langues / Languages`.
- MERP-UI cible désormais directement l’identité technique `regles-langages`, indépendamment du mécanisme général de localisation des dossiers.
- En français, le nom est forcé à `Langues`.
- En anglais, le nom est forcé à `Languages`.
- Les anciens noms `Langages`, `Langues` et `Languages` sont tous reconnus et migrés.
- Réparation exécutée après installation, après bascule de langue et au démarrage.
- Ajout du helper console `MERPUI.fixLanguagesFolder()`.
- Aucun changement à l’ordre des dossiers Items validé en 1.4.39/1.4.40.

## 1.4.40
- Correctif critique du démarrage introduit en 1.4.39.
- `installMerpRmuContent()` n’utilise plus une variable `itemRoot` hors portée.
- Le dossier racine Items `MERP-RMU` est désormais résolu explicitement avant l’application de l’ordre fixe des sous-dossiers.
- Aucun changement à la logique `Langues ↔ Languages`, à l’ordre demandé des dossiers, ni aux données de contenu.

## 1.4.39
- Dossier de Journaux linguistiques : `Langues` en français et `Languages` en anglais.
- Réparation des anciens noms `Langues`, `Langages` et `Languages` à chaque bascule.
- Ordre fixe sous `Items → MERP-RMU` :
  1. Races
  2. Cultures
  3. Professions
  4. Compétences / Skills
  5. Listes de Sorts / Spell Lists
  6. Talents & Défauts / Talents & Flaws
  7. Herbes & Substances / Herbs & Substances
- Le dossier racine `MERP-RMU` utilise le tri manuel et les sept dossiers reçoivent des valeurs `sort` stables.
- Le correctif sait reconnaître les racines Talents et Herbes installées par leurs sous-systèmes dédiés.
- Ajout du helper `MERPUI.fixItemFolderOrder()` pour forcer la réparation si nécessaire.

## 1.4.38
- Traduction anglaise complète du Journal `Herbes & Substances — Guide du voyageur`, désormais `Herbs & Substances — Traveler's Guide`.
- Traduction des cinq pages du guide : Book of Simples, Finding Herbs in the Wild, Drinks & Provisions, Medicinal Preparations, Diseases.
- Le sous-dossier de Journal bascule désormais explicitement `Herbes & Substances ↔ Herbs & Substances` à chaque changement de langue.
- Le dossier du gazetteer linguistique est réparé explicitement `Langages ↔ Languages` sur les mondes ayant conservé un ancien nom.
- Honnin : langues désormais dépendantes de l’Âge.
- Deuxième Âge : Honnin S8/W0 + Apysaïque S6/W4 (inférence MERP-RMU fondée sur la longue cohabitation Honnin/Apysani décrite p. 96).
- Troisième Âge : Honnin S8/W0 + Apysaïque S4/W2 (inférence MERP-RMU représentant une connaissance résiduelle après l’isolement progressif).
- Premier et Quatrième Âges : Honnin S8/W0 uniquement.
- Les rangs apysaïques inférés sont explicitement marqués `contextual-inference` dans les données et dans la description ; ils ne sont pas présentés comme une valeur imprimée par RMSS/RMFRP.

## 1.4.37
- Correctif des Starting Languages sur les personnages dont la Culture a été ajoutée avant la migration 1.4.32.
- Une Culture embarquée n’a plus besoin de contenir elle-même `flags.merp-ui.languages.starting` pour être reconnue.
- MERP-UI résout désormais l’Item Culture de référence courant par `flags.merp-ui.key`, puis `canonicalKey`, puis la valeur technique de Culture et enfin le nom.
- Les rangs S/W sont récupérés depuis la Culture de référence actuelle lorsque la copie Actor est ancienne.
- Les Cultures dont `sourceStatus` n’est pas `verified` restent volontairement sans attribution automatique.
- Le diagnostic `MERPUI.syncCultureLanguages()` indique désormais la Culture embarquée, la Culture de référence et si la copie embarquée possédait déjà les données linguistiques.

## 1.4.36
- Francisation des noms de langues dans la VF du gazetteer et des réglages de campagne.
- `Adúnaic` → `Adûnaïque`, `Apysaic` → `Apysaïque`, `Haradaic` → `Haradaïque`.
- `Orkish` → `Orc`, `Black Speech` → `Parler Noir`.
- `Silvan` → `Sylvain`, `Rohirric` → `Rohirrique`, `Umitic` → `Umitique`.
- `Debased Westron` → `Westron dégradé`, `Debased Labba` → `Labba dégradé`.
- `Rhovaik` reste inchangé.
- Les noms techniques/anglais restent conservés comme identités internes afin de ne pas casser les compétences ni la bascule FR/EN.
- Ajout d’un registre `metadata.languageDisplayNames` pour dissocier nom technique et affichage localisé.

## 1.4.35
- Ajout du sous-dossier bilingue `MERP-RMU → Langages / Languages`.
- Création de 34 Journaux, un pour chaque langue actuellement utilisée par les Cultures MERP-RMU.
- Les notices s’appuient prioritairement sur le répertoire linguistique RMSS/RMFRP pp. 218–219 et les descriptions de Cultures.
- Quenya, Sindarin, Parler Noir, Khuzdul (écriture) et Westron sont complétés par les ressources officielles du Tolkien Estate.
- Chaque notice distingue explicitement les langues de Tolkien des développements MERP/ICE et des variantes de jeu.
- Les notices restent descriptives : aucune mécanique de rang linguistique n’est modifiée.
- Bascule FR/EN intégrale du dossier, des Journaux et de leur contenu.

## 1.4.34
- `RMU → Langues de Campagne` : les quatre capacités sont cochées pour toutes les langues MERP-RMU.
- Exception : `Waildyth` reste uniquement une langue signalée.
- Les entrées MERP-RMU déjà présentes dans le réglage sont resynchronisées avec ces capacités.
- Les `Starting Languages` des Cultures sont désormais appliquées aux Actors via les compétences RMU natives `Language Spoken` et `Language Written`.
- Les rangs culturels sont écrits dans `system.cultureRanks`; les rangs personnels et de montée de niveau restent intacts.
- Changer ou retirer la Culture retire seulement la contribution culturelle ; une langue développée par le joueur est conservée.
- Les personnages existants sont réparés automatiquement au démarrage.
- Ajout du helper `MERPUI.syncCultureLanguages(actor?)`.

## 1.4.33
- Correctif critique de démarrage de la synchronisation des Langues de Campagne.
- Remplacement de l’appel inexistant `normalizeKey()` par un normaliseur local dédié `normalizeCampaignLanguageKey()`.
- Le normaliseur ne sert qu’à comparer les identités de langues ; les noms visibles restent inchangés.
- La synchronisation `RMU → Langues de Campagne` reste non destructive.
- Aucun changement aux données de Cultures, aux rangs S/W, aux sorts, professions, races ou autres contenus.

## 1.4.32
- Intégration des `Starting Languages` RMSS/RMFRP dans les Items Culture MERP-RMU.
- Suppression complète de l’ancien champ `adolescentAllowed` : le développement adolescent n’est pas importé en RMU.
- Chaque langue de départ documentée stocke désormais séparément ses rangs `spoken` (S) et `written` (W).
- Ajout d’un encadré bilingue `Langues de départ / Starting Languages` dans les descriptions des Cultures documentées.
- Les langues sans écriture conservent explicitement `written: 0`.
- `Waildyth` conserve S8/W0 dans la Culture mais est déclaré comme langue signalée dans le réglage RMU.
- Synchronisation non destructive avec `RMU → Langues de Campagne` : seules les langues MERP-RMU manquantes sont ajoutées ; les entrées déjà configurées par le MJ ne sont ni modifiées ni supprimées.
- Ajout du helper console `MERPUI.syncCampaignLanguages()`.
- Les Cultures dont le bloc exact `Starting Languages` n’a pas pu être établi depuis la référence sont marquées `sourceStatus: starting-languages-not-resolved` plutôt que complétées par supposition.

## 1.4.31
- Passe finale sur les 36 Spell Lists propres ou converties par MERP-RMU.
- Validation exhaustive de 734 / 734 sorts : noms et descriptions FR/EN présents.
- Validation de tous les cadres Notes FR/EN et synchronisation de leurs titres / `notesLabel` avec le nom localisé de la Liste.
- Correction des dernières références anglaises dans les Notes françaises de `Nature's Movement/Senses` : `Chameleon Skin`, `Lion Claws` et `Viperfang` deviennent `Peau de Caméléon`, `Griffes de Lion` et `Croc de Vipère`.
- Cette passe couvre notamment Animiste, Rôdeur, Drughân, Devin, Astrologue, Alchimiste, Razak-Zinul, Herutano et Prêtre Honnin.
- Aucun champ mécanique des sorts ou des listes n’est modifié.
- Aucun fallback lexical automatique.

## 1.4.30
- Traduction française exhaustive des 46 Listes RMU Core / Spell Law utilisées par MERP-RMU.
- 1 150 / 1 150 sorts natifs couverts : nom et description.
- Traduction de tous les cadres `system.notes` concernés, avec conservation de leur structure HTML d’origine (`h2`, paragraphes, gras et italiques).
- `Animal Mastery` conserve le modèle éditorial validé et ses Notes complètes.
- Les données mécaniques (`level`, `aoe`, `duration`, `range`, `spellType`, `rr`, `effects`, etc.) restent exclusivement celles du Compendium RMU Spell Law.
- Le Compendium RMU n’est jamais modifié : MERP-UI applique uniquement une couche éditoriale aux clones gérés.
- La bascule vers l’anglais reconstruit les Listes depuis la source RMU officielle ; la bascule vers le français réapplique la couche éditoriale complète.
- Aucun fallback lexical automatique.

## 1.4.29
- La couche de traduction des listes RMU natives prend désormais en charge `system.notes` en plus du nom de liste et des sorts.
- `Animal Mastery` : cadre Notes traduit intégralement en français en conservant sa structure HTML en trois paragraphes et ses italiques.
- Ajout de `MERPUI.exportNativeSpellTranslationSources()` : export en une seule commande des 46 listes RMU natives distinctes réellement utilisées par MERP-RMU, avec Notes et sorts complets.
- L’export lit directement le Compendium officiel RMU Spell Law et ne le modifie jamais.
- Cette passe prépare la traduction exhaustive sans fallback lexical automatique ni reconstruction approximative des descriptions.

## 1.4.28
- Prototype de traduction des sorts RMU natifs réutilisés par MERP-RMU.
- Nouvelle couche `native-spell-translations.json`, totalement séparée du Compendium Spell Law.
- Première liste couverte : `Animal Mastery`, avec 25/25 sorts traduits (nom + description).
- La mécanique, les paramètres et la source des sorts restent ceux de RMU Spell Law.
- En français, MERP-UI applique uniquement la couche éditoriale ; en anglais, le clone est reconstruit depuis la source officielle RMU.
- La bascule FR/EN reconstruit les listes RMU natives gérées par MERP-RMU afin d’éviter tout résidu de traduction.
- Aucun fallback lexical automatique.
## 1.4.27
- Les icônes des Spell Lists MERP-RMU suivent désormais exclusivement `system.realms`, comme dans RMU Spell Law.
- Essence → `icons/magic/symbols/elements-air-earth-fire-water.webp`.
- Mentalism → `icons/magic/symbols/circled-gem-pink.webp`.
- Channeling → `icons/magic/symbols/rune-sigil-horned-white-purple.webp`.
- Channeling + Essence → `icons/magic/symbols/circle-ouroboros.webp`.
- Essence + Mentalism → `icons/magic/symbols/rune-sigil-hook-white-red.webp`.
- Channeling + Mentalism → `icons/magic/symbols/chevron-elipse-circle-blue.webp`.
- Suppression de la logique 1.4.26 qui choisissait une icône selon la Profession ou la famille de liste.
- Les futures listes MERP-RMU reçoivent automatiquement l’icône RMU correspondant à leur Royaume.
- Aucun changement aux mécaniques, aux noms, aux descriptions ni à l’architecture des listes.

## 1.4.26
- Harmonisation des icônes des Spell Lists MERP-RMU à partir d’icônes SVG Foundry standard.
- Les listes du Devin utilisent `icons/svg/eye.svg`.
- Les listes de l’Astrologue utilisent `icons/svg/rune.svg`.
- Les listes sans icône valide des autres familles MERP-RMU reçoivent une icône générique cohérente par famille.
- Aucun changement de nom, description, mécanique ou architecture des Spell Lists.

## 1.4.25
- Correction du lookup RMU natif `Nature's Protections` → `Nature's Protection`, conformément au nom canonique de Spell Law.
- Le libellé français `Protections de la Nature` reste inchangé.
- Remplacement des références d’icônes inexistantes `eye-ringed-glow-angry-small-blue.webp` et `star-rune-sigil.webp` par des icônes Foundry standard existantes.
- Aucun changement à l’architecture ou au contenu mécanique des Spell Lists.

## 1.4.24
- Correctif critique de chargement : `scripts/merp-rmu/localization.js` fournit désormais explicitement `flattenLocalizationUpdate` ainsi que tous les helpers de localisation attendus par `honnin-beta.js` et `merp-rmu-content.js`.
- Corrige l’erreur `The requested module './localization.js' does not provide an export named 'flattenLocalizationUpdate'`.
- Rétablit l’initialisation complète de `merp-rmu-content.js` et l’exposition des helpers `MERPUI.applyContentLanguage`, `MERPUI.installMerpRmuContent`, `MERPUI.repairCustomSpellLists`, etc.
- Aucun changement fonctionnel supplémentaire : ce patch rétablit d’abord le chargement correct du pipeline déjà présent en 1.4.23.

## 1.4.23
- Les dossiers MERP-RMU reçoivent désormais une identité technique stable `folderKey`, indépendante de leur nom FR/EN.
- Le Prêtre Honnin ne construit plus son propre chemin `Professions Magiques Pures → Théurgie` à partir de texte : il est déplacé vers le dossier canonique `professions-pures-canalisation`.
- Les trois listes Honnin sont créées/mises à jour directement dans le dossier canonique `spell-lists-channeling-honnin`.
- Nettoyage automatique de l’ancien arbre Honnin dupliqué lorsqu’il devient vide.
- Ajout d’une seule passe déterministe `repairMerpRmuCustomSpellListCatalog()` pour les 33 listes converties et le Honnin.
- Contrôle explicite des 9 listes Razak-Zinul après réparation.
- Ajout du helper console `MERPUI.repairCustomSpellLists()` pour diagnostic/réparation manuelle.
- Suppression d’une ancienne référence de résumé `nonRmuMirrorCleanup` devenue obsolète.

## 1.4.22
- Correctif d’intégrité des Spell Lists MERP-RMU : leur présence dans le monde n’est plus conditionnée à l’exécution d’une migration complète.
- Même lorsque la version de contenu est déjà courante, MERP-UI vérifie et recrée les 33 listes RMSS/RMFRP converties manquantes dans leurs dossiers.
- Les 9 listes propres de Razak-Zinul sont donc recréées automatiquement si elles sont absentes.
- Le contrôle Honnin recrée automatiquement `Artisanat du Tatouage`, `Voies Aviaires` et `Communions` si l’une des trois manque.
- `Animal Mastery`, `Herb Mastery` et `Nature's Lore` restent exclusivement les listes natives RMU Spell Law.
- La bascule FR/EN sert également de point de contrôle léger d’intégrité, sans réinstallation mécanique générale.

## 1.4.21
- Architecture des Spell Lists unifiée : `MERP-RMU → Listes de Sorts` contient uniquement les listes propres à MERP-RMU.
- Les 33 listes RMSS/RMFRP converties sont désormais des Items du monde dans leurs dossiers de Profession.
- Les trois listes propres au Prêtre Honnin (`Artisanat du Tatouage`, `Voies Aviaires`, `Communions`) sont des Items du monde sous `Prêtre Honnin (Base)`.
- Les trois listes Honnin déjà natives dans RMU (`Animal Mastery`, `Herb Mastery`, `Nature's Lore`) restent uniquement les listes officielles Spell Law et ne sont plus clonées.
- Ajout des dossiers `Alchimiste (Base)` et `Prêtre Honnin (Base)`.
- Le Compendium monde historique `MERP-RMU — Listes de Sorts` est vidé de ses entrées gérées afin d’éviter tout doublon dans les sélecteurs RMU.
- La bascule FR/EN s’applique directement aux listes MERP-RMU du monde et à leurs sorts embarqués.
## 1.4.20
- Localisation FR/EN des sorts embarqués dans les Spell Lists MERP-RMU converties.
- 692/692 sorts des 33 listes RMSS/RMFRP converties disposent désormais d’un nom et d’une description FR/EN.
- Cela couvre notamment Herutano, Razak-Zinul, Alchimiste, Devin, Astrologue, les listes supplémentaires Animiste/Rôdeur, Drughân, etc.
- 42/42 sorts des trois listes Honnin originales disposent également d’un nom et d’une description FR/EN.
- `system.spells[]` est désormais localisé génériquement lors de la création et de chaque bascule de langue.
- Le champ technique `spellList` de chaque sort suit le nom localisé de sa Liste ; Profession, niveau et autres données mécaniques restent inchangés.
- Les arrays `system.spells` sont remplacés atomiquement lors du rafraîchissement afin d’éviter des mises à jour partielles de DataModel.
- Les listes et sorts provenant directement de RMU Spell Law restent les contenus officiels RMU ; MERP-UI ne crée pas de copie traduite de ces sorts natifs.

## 1.4.19
- Traduction anglaise intégrale des 7 Skills MERP-RMU du catalogue principal.
- Traduction anglaise intégrale des deux Skills spéciaux `Healing Songs` et `Yavanna's Song`.
- Traduction bilingue du Skill Honnin `Tattooing`.
- Dossier `Compétences` ↔ `Skills`.
- Traduction bilingue des 33 Spell Lists RMSS/RMFRP converties gérées dans le Compendium MERP-RMU : nom de Liste et notice intégrale.
- Traduction bilingue des 3 Spell Lists Honnin originales et des 3 clones natifs du Prêtre Honnin.
- Localisation d’affichage FR/EN des 57 références de Spell Lists RMU natives lorsque MERP-RMU crée un clone/adaptation ; les listes Spell Law réellement réutilisées restent les objets officiels, sans miroir.
- Le Compendium monde bascule entre `MERP-RMU — Listes de Sorts` et `MERP-RMU — Spell Lists`.
- `applyContentLanguage()` couvre désormais aussi le Compendium des Spell Lists converties, les listes Honnin et les libellés RMU des Chants spéciaux.
- Aucun sort individuel embarqué n’est renommé ou retraduit dans cette passe : seules les Skills et les Spell Lists sont concernées.
- Aucune réinstallation mécanique RMU lors d’une bascule de langue.

## 1.4.18
- Correctif de démarrage : suppression de la dernière référence orpheline à `installedLanguage` dans `installMerpRmuContent()`.
- Le chemin current-version appelle désormais directement le rafraîchissement léger sans dépendre d’un ancien flag de langue.
- Vérification globale : aucune référence `installedLanguage` restante dans les scripts MERP-UI.

## 1.4.17
- Correction du timing du setting FR/EN : la valeur reçue par `onChange` est désormais transmise explicitement à toute la transaction de localisation.
- Les fonctions de localisation ne relisent plus l’ancienne valeur du setting pendant que Foundry est encore en train de l’enregistrer.
- Ajout d’un override de langue temporaire, strictement limité à la passe sérialisée de localisation.
- Rafraîchissement visuel unique des répertoires Items et Journaux après la transaction afin que les noms de dossiers et d’Items changent immédiatement à l’écran.
- Aucun reload et aucune réinstallation mécanique RMU.

## 1.4.16
- Refonte et simplification du déclenchement FR/EN.
- Le setting `Langue du contenu MERP-RMU` ne requiert plus de reload et appelle immédiatement une seule fonction autoritaire `applyContentLanguage()`.
- `applyContentLanguage()` localise en une passe sérialisée : contenu principal, Présentation/Journaux, Herbes et Talents & Défauts.
- Le hook `ready` n’est plus un déclencheur principal : il effectue uniquement un contrôle de cohérence via la même fonction.
- Suppression des passes finales redondantes ajoutées en 1.4.10–1.4.15.
- Suppression des comparaisons de langue redondantes de la couche de descriptions de Professions et des variables de flags de langue devenues sans effet.
- `MERPUI.refreshLocalization()` reste disponible comme alias de compatibilité et utilise désormais le même chemin complet.
- Les changements de langue restent strictement éditoriaux : aucune réinstallation mécanique RMU.

## 1.4.15
- Rétablissement et généralisation du déclenchement final FR ↔ EN validé en 1.4.10.
- La passe finale vérifie maintenant les quatre couches éditoriales : contenu principal, Présentation/Journaux, Herbes, Talents & Défauts.
- Les flags de langue ne sont plus considérés comme preuve suffisante : l’état réel des Documents est comparé à chaque démarrage GM.
- Les Herbes effectuent également leur comparaison légère même si leur flag de langue est déjà à jour.
- Le catalogue Talents & Défauts expose désormais son rafraîchissement léger à la passe finale globale.
- Aucune réinstallation mécanique complète : seuls les champs localisés réellement différents sont modifiés.

## 1.4.14
- Correction Foundry v14 du catalogue Talents & Défauts : les recherches de dossiers et d’Items n’utilisent plus `Collection.contents`.
- La bascule FR ↔ EN retrouve désormais les 85 Items existants et ne modifie que leurs champs éditoriaux localisés.
- Un seul arbre `Talents & Défauts` / `Talents & Flaws` est conservé et renommé en place.
- Nettoyage automatique des anciens arbres traduits dupliqués uniquement lorsqu’ils sont entièrement vides.
- Aucun Item ni contenu utilisateur n’est supprimé ou déplacé par le nettoyage des doublons.
- Aucune réinstallation mécanique complète lors d’une simple bascule de langue.

## 1.4.13
- Traduction anglaise intégrale des 85 Talents & Défauts spécifiques MERP-RMU.
- Noms VO canoniques conservés lorsqu’ils étaient déjà présents dans les noms source.
- Traduction des trois Talents raciaux dúnedain : Dúnedain Longevity, Disease Resistance, Western Endurance.
- Dossiers `Talents & Défauts` et sept sous-catégories localisés FR/EN.
- Bascule FR ↔ EN optimisée : seuls les champs éditoriaux localisés des Talents/Défauts sont comparés et mis à jour.
- Les restrictions raciales/culturelles et toutes les données mécaniques restent inchangées.
- Aucun résumé et aucun fallback lexical automatique.

## 1.4.12
- Révision des noms français des Herbes possédant un surnom anglais : traduction française affichée avant la VO canonique.
- Exemples : `Aloe (Guérit-Brûlure / Heat-heal)`, `Arlan (Pantoufle Blanche / White Slipper)`, `Balák (Don-des-Os / Boneboon)`, `Bluedrake (Langue Bleue / Bluetongue)`.
- Correction grammaticale des descriptions standardisées selon la forme botanique : `ce nectar`, `ce bulbe`, `ce cône`, `ce roseau`, etc.
- Localisation d’affichage de la feuille RMU Herb selon le setting MERP-UI : saisons, difficultés, formes, préparations et libellés.
- Les valeurs techniques RMU stockées restent inchangées.
- FR : `Automne`, `Feuille`, `Décoction`, `Difficile`, etc. EN : `Autumn`, `Leaf`, `Decoction`, `Hard`, etc.
- Aucun fallback lexical automatique sur les descriptions éditoriales.

## 1.4.11
- Traduction anglaise intégrale des 187 Herbes et Substances MERP-RMU.
- Noms VO repris depuis les noms source RMSS/RMFRP stockés dans le catalogue.
- Chaque notice conserve l’intégralité des informations françaises : habitat, climat, région, rareté, préparation, effet, durée, risques et dépendance.
- Dossiers et sous-dossiers du catalogue localisés FR/EN.
- Le rafraîchissement léger FR ↔ EN de la 1.4.10 est utilisé ; aucune réinstallation mécanique complète.
- Les nouvelles installations créent directement les Herbes dans la langue sélectionnée.
- Aucun fallback lexical automatique.

## 1.4.10
- Correction du déclenchement du rafraîchissement FR ↔ EN : une passe éditoriale finale est désormais exécutée après tous les installateurs au démarrage GM.
- Cette passe finale empêche un installateur secondaire de remettre ensuite un nom ou une description dans l’ancienne langue.
- Aucun mécanisme RMU n’est réinstallé : seuls les champs éditoriaux localisés sont comparés et modifiés.
- Correction des quatre dossiers de Races restreintes : `Liste de Races Restreintes` ↔ `Restricted Races`.

## 1.4.9
- Correction du rafraîchissement léger FR ↔ EN des Items gérés : recherche plus robuste par clé et mises à jour Foundry aplaties.
- Le rafraîchissement léger effectue désormais un contrôle de cohérence à chaque démarrage GM et auto-répare les Documents restés dans l’ancienne langue.
- Correction du Journal `Présentation de MERP-RMU`, désormais comparé et localisé en place même si le flag de langue était déjà à jour.
- Localisation FR/EN des dossiers d’Objets : Âges, Restricted, peuples, groupes de Professions, royaumes et Spell Lists.
- Localisation des dossiers Herbes & Substances et de leurs catégories, prête avant la traduction des Items Herbes.
- Localisation des dossiers réels Talents & Défauts ↔ Talents & Flaws.
- Suppression automatique de l’ancien dossier vide `Talents & Flaws` créé par le catalogue principal historique.
- Aucune réinstallation mécanique complète lors d’un simple changement de langue.

## 1.4.8
- Optimisation générique de la bascule FR ↔ EN des contenus MERP-RMU.
- Un simple changement de langue ne relance plus l’installation mécanique complète des 284 Documents gérés.
- Seuls les champs présents dans `localizations` sont mis à jour en place.
- Items : noms, descriptions et autres champs éditoriaux localisés uniquement.
- Journaux : nom, nom des pages et contenu des pages uniquement.
- Dossiers : renommage uniquement lorsque leur définition possède une localisation.
- Présentation MERP-RMU mise à jour en place au lieu d’être supprimée/recréée lors d’un changement de langue.
- Infrastructure de langue ajoutée aux Herbes : leurs futures traductions bénéficieront automatiquement du même rafraîchissement léger.
- API de maintenance : `MERPUI.refreshLocalization()`.

## 1.4.7
- Traduction anglaise intégrale des 6 pages de Présentation MERP-RMU.
- Traduction anglaise intégrale des 11 Journaux de Règles MERP-RMU.
- Bascule FR ↔ EN des noms de dossiers, Journaux, pages et contenus.
- Renommage sûr des dossiers existants afin d’éviter les doublons lors d’un changement de langue.
- Structure HTML, tableaux, listes et mise en forme conservés.
- Aucun résumé et aucun fallback lexical automatique.

## 1.4.6
- Reprise intégrale des traductions anglaises des Races et Cultures à partir des descriptions françaises complètes.
- 12 descriptions raciales uniques et 59 descriptions culturelles uniques couvertes intégralement.
- Conservation exacte des titres, paragraphes, sous-titres et listes de la source française.
- Conservation des traductions Humans (Hildor) et Harfoots déjà validées.
- Correction du nom anglais de la Race Hobbit : Hobbits (Kuduk).
- Aucun résumé et aucun fallback lexical automatique.

## 1.4.5
- Traductions anglaises complètes des 59 Cultures uniques, propagées aux 173 entrées d’Âge.
- Noms VO alignés autant que possible sur MERP Character Creation Using RMSS/RMFRP v2.5.
- Conservation de la traduction Harfoots déjà validée.
- Correction du nom anglais de la Race Hobbit : Hobbits (Kuduk).
- Localisation explicite de `system.culture` en plus du nom affiché et de la description.
- Aucun remplacement lexical automatique.

## 1.4.4
- Traductions anglaises complètes des 12 descriptions raciales uniques.
- Les 40 Races des différents Âges basculent entre Français et English.
- La traduction Humans (Hildor) déjà validée est conservée.
- Aucun remplacement lexical automatique n’est utilisé.

## 1.4.3
- Traductions anglaises complètes des 20 Professions MERP-RMU.
- Bascule des noms affichés FR ↔ VO pour les 20 Professions.
- Les 10 Professions basées sur un châssis RMU natif utilisent désormais le même mécanisme de localisation que les Professions gérées directement.
- Les clés techniques RMU et les données mécaniques restent inchangées.

### 1.4.2 — English editorial correction: Professions
- Replaced the automatic lexical fallback with complete hand-written English descriptions for all 20 MERP-RMU Professions.
- Preserved the validated Fighter translation and canonical Rolemaster/RMU profession names.
- No mechanical or technical RMU identifiers were changed.

## 1.4.2
- Correctif du schéma de localisation FR/EN des Races, Cultures et Professions.
- Chaque Document géré possède désormais explicitement `localizations.fr` et `localizations.en`.
- Les descriptions sont stockées sous `system.description`, conformément au prototype 1.4.1 validé.
- La bascule FR ↔ EN réécrit complètement les noms et descriptions gérés après rechargement.

## 1.4.1

- Ajout du réglage mondial **Langue du contenu MERP-RMU** : Français / English.
- Première localisation éditoriale de test : Humans (Hildor), Harfoots, Fighter et Natural Physique.
- Le changement de langue réinstalle proprement les Documents gérés concernés sans modifier leurs identifiants techniques RMU.
- Harmonisation du numéro de version public MERP-UI.

## 1.3.10

- Corrige le plafond « 6 Listes de base parmi 9 » pour Herutano et Razak-Zinul sans interrompre le workflow RMU.
- Les Listes déjà choisies sont retirées du sélecteur sur une copie des données RMU ; les choix restants demeurent visibles.
- Une fois six Listes présentes, le bouton natif d’ajout est désactivé dans le contexte du dialogue au lieu d’annuler une création d’Item ou de renvoyer un sélecteur vide.
- Supprime les interceptions fragiles de `_onSelectorChanged` introduites pendant les essais 1.3.8–1.3.9.
- Aucun changement dans l’automatisation de la magie / Ombre / Corruption.

## 1.3.9

- Correction du plafond Herutano « 6 Listes parmi 9 » : interception de `Base Spell List` dans `_onSelectorChanged` avant que RMU n’ouvre le sous-sélecteur de Listes.
- Suppression du filtrage du sélecteur parent introduit en 1.3.8, qui ne correspondait pas à la structure réelle du dialogue RMU.
- Aucun changement dans l’automatisation des sorts (`merp-rmu-magic.js`).

## 1.3.8

- Corrige le verrou Herutano « 6 Listes parmi 9 » sans interrompre le workflow RMU.
- Le choix « Base Spell List » est retiré du sélecteur parent dès que les six Listes de base ont été choisies ; RMU n’ouvre donc plus le sous-dialogue susceptible de rester bloqué lors d’une tentative de septième Liste.
- Les groupes de Listes retournés par RMU sont désormais clonés avant filtrage afin d’éviter toute mutation d’un état de sélecteur potentiellement mis en cache.
- Suppression du filet de sécurité `createItem` qui créait puis supprimait une septième Liste et pouvait laisser la feuille dans un état incohérent.
- Aucun changement dans `merp-rmu-magic.js`.

## 1.3.7

- Corrige le verrou des Listes de base Herutano : le filtrage ne modifie plus les objets RMU en place.
- Évite d’annuler brutalement `preCreateItem`/`preUpdateItem`, ce qui pouvait bloquer le workflow de création après une tentative de 7e Liste.
- Ajoute un filet de sécurité post-création qui supprime une éventuelle 7e Liste sans laisser la feuille dans un état bloqué.

## 1.3.6 — 2026-08-15

- Refactorisation conservatrice de la création de personnage MERP-RMU : extraction des règles pures dans `scripts/merp-rmu/creation-rules.js`.
- Déplace sans changement fonctionnel les caractéristiques primordiales MERP-RMU, les clés techniques de Profession et la règle Herutano « 6 Listes de base parmi 9 ».
- `creation-adapter.js` reste responsable des hooks Foundry/RMU ; `merp-rmu-content.js` conserve les migrations de contenu et les patches UI RMU pour cette étape.
- Aucun changement dans `merp-rmu-magic.js` ni dans l’automatisation de lancement des sorts, du Risque d’attirer l’Ombre ou de la Corruption.

## 1.2.69

- Supprime explicitement toute ancienne liste erronée `STARTLIGHT` / `STARTLIGHTS` des Items du monde, des Actors et des Compendiums de monde.
- Empêche `STARTLIGHT` d’être ajoutée comme `Base Spell List` et la retire du sélecteur RMU si une donnée résiduelle la réinjecte.
- Conserve la liste canonique de l’Astrologue telle que définie dans les données MERP-RMU ; le correctif vise uniquement le faux nom `STARTLIGHT`.

## 1.2.67

- Corrige l’affichage des caractéristiques primordiales du Razak-Zinul : **Intuition** et **Raisonnement** sont désormais marquées par une astérisque pendant la création de personnage.
- Répare automatiquement les élections culturelles RMU où `Religion/Philosophy` avait été enregistrée sous `Other Lores`, et retire/déplace les `Region Lore` enregistrées par erreur sous `Religion/Philosophy`.
- Ajoute `MERPUI.repairCultureReligionPhilosophy()` pour forcer ce nettoyage sur les Actors existants.
- Nettoie le Compendium MERP-RMU de l’Astrologue : `Far Voice`, `Holy Vision`, `Starlore`, `Starsense` et `Way of the Voice` sont laissées au Compendium officiel RMU ; seule `Starlights` reste une liste MERP-RMU.
- Schéma de contenu MERP-RMU : 46.

## 1.2.66
- Corrige l’automatisation **Risque d’attirer l’Ombre** pour reprendre les résultats officiels de la *Spell Use Risk Chart* MERP/RMSS : Sighting, Spotting, Creature, Patrol, Ambush, Army Unit, Kidnapping, Assassin et Special.
- La carte MJ affiche désormais le terme officiel, sa traduction française et la conséquence concrète à appliquer ; le second jet n’est plus réduit à une simple étiquette comme « Localisation ».
- Conserve la table par type de région et le jet ouvert de conséquence, mais l’interprétation affichée suit désormais directement les définitions de la source.
- Met à jour la page de règles MERP-RMU pour employer les termes officiels Sighting/Spotting et préciser qu’un résultat de détection entraîne immédiatement le second jet de conséquence.
- Schéma MERP-RMU 45.

## 1.2.65
- Corrige une erreur de syntaxe dans `merp-rmu-content.js` qui empêchait le script de contenu de se charger en 1.2.64 ; cela expliquait l'absence de l'API `MERPUI.installMerpRmuContent` et l'absence de Razak-Zinul/Kekhavra dans le monde.
- Réexpose immédiatement les commandes de diagnostic et d'installation MERP-RMU, sans dépendre uniquement du hook `ready`.
- Astrologue : réutilise désormais les cinq listes déjà présentes dans le Compendium officiel RMU (`Far Voice`, `Holy Vision`, `Starlore`, `Starsense`, `Way of the Voice`) et ne conserve que `Starlights` dans le Compendium MERP-RMU, supprimant les doublons.
- Schéma MERP-RMU 44.

## 1.2.64

- Intègre la profession **Kekhavra**, lanceuse hybride de Canalisation + Mentalisme réservée aux femmes de culture Variag dans la source MERP/RMSS.
- Ajoute ses six Listes de base : Blood Law, Bone Law, Concussion’s Ways, Muscle Law, Herb Law et Communal Ways.
- Réutilise les mécaniques RMU actuelles : Concussion’s Way pour Concussion’s Ways et Herb Mastery pour Herb Law ; les autres listes proviennent directement des listes RMU de Canalisation correspondantes.
- Les six listes sont réattribuées à la clé technique `Kekhavra` et au royaume hybride `Channeling,Mentalism`, afin d’être proposées comme listes de base sans collision avec leurs versions RMU natives.
- Schéma de contenu MERP-RMU 43.

## 1.2.63

- Intègre la profession **Razak-Zinul**, utilisateur pur de Canalisation réservé aux traditions khazâdes.
- Ajoute neuf Listes de base Razak-Zinul au Compendium MERP-RMU : Armourer, Craftsman, Dwarven Inorganic Skills, Loremaster, Own Realm Imbedding, Other Realm Imbedding, Symbols, Wards et Weaponsmith.
- Conserve la règle MERP/RMSS : le personnage choisit normalement six Listes parmi ces neuf.
- Les sept Listes spécifiques sont converties depuis MERP/RMSS pp. 233–240 ; les deux Listes d’imprégnation sont adaptées depuis Alchemy Companion pp. 120–121.
- Les listes non-RMU restent uniquement dans le Compendium MERP-RMU, sans miroir Monde.
- Schéma de contenu MERP-RMU 42.

## 1.2.62

- Déduplique à l’affichage les choix identiques du sélecteur de Listes de Sorts RMU lorsque le système agrège plusieurs sources (Monde + Compendiums).
- Corrige notamment les six Listes de base de l’Astrologue apparaissant en double sans supprimer aucune source de données.

## 1.2.61
- Intégration de l’Astrologue MERP-RMU (hybride Canalisation + Mentalisme).
- Ajout de ses six Listes de base issues du Mentalism Companion : Far Voice, Holy Vision, Starlights, Starlore, Starsense et Way of the Voice.
- Schéma de contenu MERP-RMU 41.

## 1.2.60 — 2026-08-11

### MERP-RMU — Alchimiste
- Intègre l’Alchimiste comme utilisateur pur de l’Essence avec la clé technique `Alchemist`.
- Ajoute six Listes de base non-RMU au Compendium **MERP-RMU — Listes de Sorts** : `Essence Imbedding`, `Mentalism/Channeling Imbedding`, `Enchanting Ways`, `Organic Skills`, `Inorganic Skills` et `Liquid/Gas Skills`.
- Les Listes sont adaptées depuis le *Core-Rules Alchemist* de **Alchemy Companion** et converties au format `spell-list` RMU.
- Les magies épiques source au-delà du niveau 90 ne sont pas importées dans cette première conversion.
- Met à jour la description de Profession pour distinguer ce noyau jouable du pool plus large de Listes proposé par le supplément MERP/RMSS.
- Schéma MERP-RMU : **40**.

## 1.2.59 — Devin

- Ajoute la profession **Devin** (Seer) comme lanceur pur de **Mentalisme**, basée mécaniquement sur le châssis RMU du Mentalist.
- Ajoute les six Listes de base historiques du Seer depuis le *Mentalism Companion* : Far Visions, Future Visions, Mind Visions, Past Visions, Vision Borrowing et Vision Guard.
- Les six listes sont stockées uniquement dans le Compendium MERP-RMU des listes non natives, afin d’éviter les doublons World/Compendium.
- Ajoute la clé technique stable `Seer` et la réparation automatique des Actors portant la profession affichée `Devin`.
- Schéma de contenu MERP-RMU : 39.

## 1.2.58

- Ajout du Barde MERP-RMU comme semi-lanceur d’Essence basé sur le Barde RMU.
- Intégration de ses six Listes de base RMU : Controlling Songs, Entertaining Ways, Inspiring Songs, Item Lore, Sound Control et Sound Projection.
- Ajout de la clé technique `Bard` et réparation automatique sur les Actors.
- Le chargeur de professions natives peut désormais résoudre une profession RMU par nom de Compendium.

## 1.2.57
- Corrige les doublons des listes MERP-RMU non natives dans le sélecteur RMU.
- Suppression des miroirs monde de `Nature's Movement/Senses`, `Nature's Summons` et des futures listes non-RMU : RMU agrège déjà le Compendium `MERP-RMU — Listes de Sorts` avec les Items monde.
- Ajoute `MERPUI.cleanupNonRmuSpellListMirrors()` pour nettoyer les miroirs hérités des versions 1.2.51–1.2.56.

## 1.2.56
- Ajout du Rôdeur MERP-RMU comme profession semi-magique de Canalisation.
- Conservation des Listes MERP : Inner Walls, Moving Ways, Nature’s Guises, Nature’s Summons, Nature’s Way et Path Mastery.
- Nature’s Summons restaurée depuis RMSS et ajoutée au Compendium MERP-RMU.
- Nature’s Way utilise la mécanique RMU de Survival’s Way ; Path Mastery utilise Pathmastery.
- Ajout du support d’import de professions RMU natives avec habillage MERP-UI.

## 1.2.55

- Corrige la duplication des Listes RMU dans le sélecteur de compétences : RMU agrège le Compendium officiel Spell Law et les Items du monde.
- Supprime uniquement les copies monde dont `_stats.compendiumSource` pointe vers `rmu-spell-law.spell-lists`; le Compendium officiel reste la source canonique.
- Les Listes RMU utilisées sans modification par MERP-RMU (notamment les six Listes du Magicien) ne sont plus recréées comme miroirs monde.
- Les variantes MERP-RMU nécessaires, comme les Listes `Animist` dérivées du `Druid`, restent des Items monde distincts.
- Ajoute `MERPUI.cleanupImportedSpellLawLists()` pour lancer/diagnostiquer uniquement ce nettoyage.
- Schéma de contenu 35.

## 1.2.54

- Corrige le nettoyage des doublons de listes de sorts sous Foundry VTT v14 : suppression unitaire et vérification des documents encore présents afin d'éviter l'erreur `Item "..." does not exist!`.
- Le nettoyage continue même lorsqu'un document a déjà été supprimé par une étape précédente de synchronisation.
- Ajoute `MERPUI.deduplicateSpellLists()` pour diagnostiquer et lancer uniquement le dédoublonnage sans réinstaller tout le contenu MERP-RMU.
- Le résumé de migration expose désormais le détail du dédoublonnage (`spellListDeduplication`).

## 1.2.53

- Corrige le nettoyage des doublons de listes de sorts RMU : les imports répétés sont maintenant regroupés selon l’identité réellement utilisée par le sélecteur RMU (nom + type de liste + profession + royaume), même si leurs métadonnées internes diffèrent légèrement.
- Conserve les variantes MERP-RMU distinctes lorsqu’elles utilisent une profession, un type ou un royaume différent.
- Schéma de contenu 33.

# Changelog

## 1.2.52
- Nettoyage global des doublons de `spell-list` présents dans le monde après des imports répétés du Compendium RMU Spell Law.
- Le nettoyage couvre désormais les Listes Base, Open et Closed (et tout autre type strictement identique), pas seulement les Listes de base configurées par MERP-UI.
- Les variantes MERP-RMU restent distinctes : une Liste n’est supprimée que si son identité et l’intégralité de ses données `system` sont identiques.
- Le résumé d’installation expose `deduplicatedSpellLists` pour diagnostic.
- Schéma de contenu 32.

## 1.2.49

- Corrige le dossier cible de la profession Animiste : `professions-pures-canalisation`.
- Incrémente le schéma MERP-RMU à 29 afin de rejouer automatiquement l’installation après l’échec 1.2.48.
- Conserve le Compendium `MERP-RMU — Listes de Sorts` et `Nature's Movement/Senses`.

## 1.2.48

- Correction Foundry V14 : création du compendium via `foundry.documents.collections.CompendiumCollection`.
- Incrément du schéma MERP-RMU à 28 afin de rejouer automatiquement la migration Animiste/Compendium.
- Le compendium monde `MERP-RMU — Listes de Sorts` est recréé/synchronisé automatiquement au prochain chargement MJ.

# 1.2.47

- Ajout de la Profession **Animiste** (Canalisation, utilisateur pur) sur le profil mécanique RMU du Druid, avec la sélection de Listes MERP.
- Import automatique depuis RMU Spell Law de cinq Listes de base : Animal Mastery, Herb Mastery, Nature’s Lore, Nature’s Protection et Plant Mastery.
- Ajout de **Nature’s Movement/Senses**, convertie depuis RMSS Spell Law, comme première Liste spécifique MERP-RMU.
- Création du compendium **MERP-RMU — Listes de Sorts** pour les Listes absentes de RMU ; son contenu est synchronisé automatiquement par MERP UI.

# 1.2.45

## 1.2.46 — Purification de la Corruption

- Développe le Journal **Élément de Morgoth et Corruption** avec les règles MERP-RMU de réduction volontaire des Points de Corruption.
- Ajoute renoncement, réparation, rituels et lieux de purification, guides spirituels et actes de sacrifice exceptionnels.
- Ajoute une **Tentative de Purification** conseillée sous forme de Manœuvre Absolue d’Autodiscipline (0 à -3 PC selon le résultat).
- Précise que la difficulté augmente avec la Corruption actuelle et que la Corruption doit rester plus facile à acquérir qu’à perdre.
- Interdit explicitement de provoquer volontairement des tests de Corruption pour exploiter les fortes réussites.
- Distingue clairement la possibilité prévue par MERP (purification rituelle) de la procédure développée pour MERP-RMU.
- Schéma de contenu MERP-RMU : **29**.

- Réintégration des six Listes de base RMU du Magicien : Earth Law, Fire Law, Ice Law, Light Law, Water Law et Wind Law.
- Ajout de l’arborescence `Listes de Sorts > Listes de Sorts d’Essence > Magicien (Base)`.
- Les listes conservent leurs données RMU natives (sorts, niveaux, portées, durées, types et attaques) et sont marquées comme contenu MERP-RMU géré.
- Mise à jour de la description du Magicien pour refléter l’intégration effective de ses Listes de base.

## 1.2.44

- Ajoute les Journaux **Religions** et **Économie** directement dans le dossier `Règles MERP - RMU`, aux côtés du sous-dossier `Magie`.
- Développe les règles culturelles de religion : Eru, Ainur, Valar, Maiar, cultes de l’Ombre, patronage, Canalisation et relations avec Cultures/Professions.
- Développe les règles économiques : troc, marché monétaire, échange hiérarchique, monnaie-métal, disponibilités locales et profils économiques des principales Cultures.
- Étend l’installateur de Journaux MERP-RMU pour accepter des entrées placées directement à la racine de `Règles MERP - RMU`, sans créer de sous-dossier artificiel.
- Passage du schéma de contenu MERP-RMU à la version 27.

## 1.2.43

- Corrige l’affichage des Points de Corruption dans les fiches Actor RMU AppV2.
- Résout désormais l’Actor directement depuis l’identifiant de fenêtre `CharacterSheetV2RMU-Actor-<actorId>`.
- La ligne **Corruption (PC)** est automatiquement réinjectée sous **Saignement (PV/Rd)** après un rerender de la fiche provoqué par une modification des PC.

## 1.2.42
- Corrige définitivement l’injection des Points de Corruption dans l’onglet États RMU : ajout d’un observateur global du DOM et d’un scan des applications ouvertes pour gérer le rendu paresseux de l’onglet.
- Ajoute `MERPUI.magic.refreshCorruptionUI()` et enrichit `diagnostics()` avec `corruptionRows` et `bleedingRows`.


## 1.2.41
- Corrige l’affichage des Points de Corruption dans l’onglet États des fiches RMU : l’onglet étant rendu paresseusement, MERP-RMU observe désormais la fiche et insère la ligne sous « Saignement (PV/Rd) » dès que cette zone apparaît.
- Synchronise la valeur visible avec les mises à jour automatiques de Corruption de l’Actor.
## 1.2.40

- Affiche les Points de Corruption MERP-RMU directement dans l’onglet **États** des Actors RMU, sous **Saignement (PV/Rd)**.
- Le champ est éditable par les propriétaires de l’Actor et persiste dans `flags.merp-ui.corruptionPoints`.
- L’affichage se met à jour automatiquement lorsque l’automatisation de Corruption modifie le total.

## 1.2.38

- Corrige l’activation visible des automatismes de magie : branchement principal sur le hook natif RMU `rmu.scr`, avec secours via `createChatMessage`.
- Rend l’annotation « Parole de Commandement » compatible avec le rendu ApplicationV2 du dialogue `SpellCastingDialogV2`.
- Ajoute `MERPUI.magic.diagnostics()` pour vérifier immédiatement l’état des réglages et du GM chargé du traitement.
- Empêche les doubles traitements quand les hooks `rmu.scr` et ChatMessage sont tous les deux émis.

# Changelog

## 1.2.36

- Ajoute le répertoire de Journaux **Règles MERP - RMU → Magie**.
- Intègre neuf Journaux complets : Nature de la magie ; Essence, Canalisation et Mentalisme ; Usage discret de la magie ; Risque d’attirer l’Ombre ; Élément de Morgoth et Corruption ; Sorcellerie ; Déclin et disponibilité des Listes ; Apprentissage des Listes ; Incantation et Paroles de Commandement.
- Ajoute un encadré **Résumé pratique** au début de chaque entrée tout en conservant les développements détaillés.
- Ajoute les liens dynamiques entre Journaux de règles et Items MERP-RMU lorsque des cibles correspondantes existent.
- Prépare l’architecture de données pour les futures automatisations de lancement de sorts, sans modifier encore la résolution RMU native.
- Passe le schéma de contenu MERP-RMU à 26.

## 1.2.35
- Ajoute **Alchimiste** et **Magicien** dans `Professions > Professions Magiques Pures > Essence`.
- Le **Magicien** conserve la mécanique de la fiche RMU fournie (Pure, Essence, 6 Listes de base, coûts et Compétences professionnelles natifs).
- L’**Alchimiste** reçoit une première adaptation RMU cohérente avec son profil MERP/RMSS, marquée comme provisoire avant intégration de ses Listes de sorts.
- Ajoute les alias dynamiques `Alchemist → Alchimiste` et `Magician → Magicien`.
- Schéma de contenu MERP-RMU : 25.

## 1.2.34

- Ajout des Professions non magiques **Barbare**, **Roublard**, **Voleur** et **Sans Profession** avec leurs descriptions MERP-RMU développées.
- Déplacement du **Guerrier** dans le nouveau dossier `Professions non magiques` et correction de sa formulation finale selon le style littéral retenu.
- Création de l’arborescence des Professions : `Professions non magiques`, `Professions Magiques Pures`, `Professions Hybrides`, `Professions Semi-Magiques`.
- Création des sous-dossiers `Essence`, `Mentalisme` et `Canalisation` pour chaque famille de Professions magiques, sans dépasser quatre niveaux Foundry.
- Ajout des alias dynamiques `Barbarian` → `Barbare`, `Rogue` → `Roublard`, `Thief` → `Voleur`, `Layman` → `Sans Profession`.
- Schéma de contenu MERP-RMU 24.

## 1.2.33

- Ajout de la Profession **Guerrier** fondée sur le `Fighter` natif de RMU Core Law.
- Conservation intégrale des coûts de développement, Combat Training Costs et Professional Skills RMU.
- Description MERP-RMU extensive en français, articulant Profession, Race et Culture.
- Ajout de l’alias dynamique `Fighter` → `Guerrier` pour les liens Foundry.
- Schéma de contenu MERP-RMU 23 afin de forcer la mise à jour.

## 1.2.32

- Corrige la limite Foundry de 4 niveaux de dossiers : les Cultures restreintes sont désormais placées directement dans `Cultures > Âge > Restreint`.
- Supprime les sous-dossiers de Race sous `Restreint` qui créaient un cinquième niveau (`Orcs`, `Trolls`, `Umli`, etc.).
- Schéma MERP-RMU porté à 22 pour forcer la migration.

# Changelog

## 1.2.31
- Ajout des Cultures restreintes : Petits-Nains, Umli, Orcs communs, Uruk-hai, Demi-Orcs, Trolls des Cavernes, Trolls des Forêts, Trolls des Collines, Trolls des Neiges, Trolls de Pierre, Olog-hai et Demi-Trolls.
- Intégration des descriptions éditoriales longues en HTML et des rangs de développement RMU pour chaque Culture.
- Classement sous Cultures > Âge > Restreint > Race, sans dépasser quatre niveaux de dossiers.
- Extension des liens Foundry dynamiques aux nouvelles Cultures et à leurs principaux noms alternatifs.
- Normalisation terminologique : Orc/Orcs et Demi-Orc/Demi-Orcs dans tout le contenu géré.
- Schéma de contenu MERP-RMU : 21.

## 1.2.30

- Ajoute des liens Foundry dynamiques entre les entrées MERP-RMU citées dans les descriptions.
- Les liens privilégient automatiquement l’entrée du même Âge lorsqu’une Race ou une Culture existe à plusieurs périodes.
- Les noms alternatifs usuels (Quendi, Naugrim, Falmari, Barbes-Raides, etc.) sont également reliés lorsqu’une entrée correspondante existe.
- Une seule occurrence par cible est liée dans chaque description afin de préserver la lisibilité.
- Schéma de contenu MERP-RMU porté à 20 pour forcer la mise à jour des Items existants.

## 1.2.29 — 2026-08-07

- Correction : ajout des rangs de développement culturel RMU (`cultureRanks`) à toutes les Cultures introduites en 1.2.28.
- Profils différenciés selon le mode de vie et l’héritage culturel : survie, équitation, navigation, discrétion, artisanat, langues, combat et savoirs.
- Équilibrage conservé par rapport aux Cultures déjà converties : profils humains, elfiques et khazâd restent dans les mêmes ordres de grandeur.
- Les copies d’une même Culture dans plusieurs Âges utilisent exactement le même profil de développement.
- Passage du schéma MERP-RMU à la version 19 afin de forcer la mise à jour des Items existants.

## 1.2.28 — 2026-08-07

- Ajout et intégration extensive des Cultures humaines : Lossoth, Drúedain / Woses — Drughu, Daen Lintis, Gimútéothraim, Hommes des Collines, Merimetsästäjät, Rijeshnarod, Narodbrijig, Covsheknarod et Honnin.
- Ajout et intégration extensive des Cultures elfiques : Luindrim, Kuorind, Fuinar, Pêdi, Teleri et Penni.
- Ajout et intégration extensive des Maisons khazâd : Bávor — Barbes-Raides, Thelór — Poings-de-Fer, Drúin — Pieds-de-Pierre et Barin — Mèches-Noires.
- Descriptions structurées en HTML avec histoire, société, apparence, traditions, relations, combat et place dans la création de personnage.
- Conservation de la structure Foundry à quatre niveaux maximum : `MERP-RMU > Cultures > Âge > Race`.
- Conservation des Races restreintes dans `MERP-RMU > Races > Âge > Restreint`.
- Disponibilités chronologiques appliquées aux nouvelles Cultures, avec Teleri limité au Premier Âge et Penni aux Premier et Deuxième Âges.
- Passage du schéma MERP-RMU à la version 18 afin de forcer la mise à jour.

## 1.2.27 — 2026-08-07

- Correction de la migration des données MERP-RMU.
- Les versions 1.2.25 et 1.2.26 utilisaient toutes deux le schéma 16 ; Foundry pouvait donc considérer 1.2.26 comme déjà installée et ne pas réimporter les nouvelles descriptions.
- Passage du schéma MERP-RMU à la version 17 afin de forcer la mise à jour des Items existants.
- Aucun changement éditorial supplémentaire par rapport aux descriptions de la 1.2.26.

## 1.2.26 — 2026-08-07

- Réécriture éditoriale plus littérale des descriptions générales des Humains (Hildor), Khazâd (Naugrim), Elfes (Quendi), Dúnedain et Hobbits (Periannath).
- Réduction des listes à puces au profit de paragraphes continus, tout en conservant une structure par sections pour la lecture dans Foundry.
- Intégration identique de chaque description canonique dans toutes ses copies par Âge, sans résumé lors de la duplication.
- Aucun changement des statistiques, rangs culturels, talents, restrictions ou arborescences.
- Passage du schéma MERP-RMU à la version 16.

## 1.2.25 — 2026-08-07

- Réintégration des descriptions éditoriales longues des Races et Cultures sans réduction en résumé.
- Restauration détaillée des Cultures elfiques Noldor, Vanyar, Sindar, Nandor et Avari ; conservation exacte de la description de référence des Elfes sylvains.
- Restauration et enrichissement des descriptions longues des Races restreintes.
- Conservation intégrale des descriptions humaines, dúnedain, hobbites et khazâd déjà développées dans la base 1.2.24.
- Normalisation des descriptions entre les copies par Âge : une même Race ou Culture conserve le même texte canonique.
- Ajout de `data/merp-rmu/descriptions-audit.json` pour contrôler longueur, sections et concordance entre copies.
- Passage du schéma MERP-RMU à la version 16.

## 1.2.6
- Amélioration du contraste des liens dans les Journaux : fond gris clair, texte noir, bordure nette et survol renforcé.
- Aucun changement apporté au module Fennas Drunin RMU.

## 1.2.5
- Assombrissement des titres H4 et H5 dans les Journaux.
- Renforcement de la règle horizontale dans les Journaux.
- Aucun changement apporté à Fennas Drunin RMU.

## 1.2.2

- Localisation française des Compétences et Catégories pendant l’assistant de création RMU.
- Conservation stricte des valeurs techniques anglaises utilisées par Race, Culture et Profession.
- Prise en charge des rendus dynamiques et des assistants Application v1/v2.

# 1.1.3

- Ajout du nom anglais original, en italique et aligné en bas à droite, dans les infobulles françaises des compétences.
- Résolution du nom canonique via le référentiel partagé des compétences.
- Correction de l’API globale `MERPUI` afin que le registre partagé puisse y ajouter `MERPUI.skills`.

## 1.1.2 — 2026-08-02

- Corrige le badge de compétence professionnelle : « Pro » est remplacé directement par « Comp. profess. ».
- Supprime la concaténation visuelle « ProComp. profess. ».

## 1.1.0

- Ajout du référentiel partagé des compétences RMU.
- Ajout des scripts d’import en lecture seule et de génération des traductions.
- Exposition de l’API `MERPUI.skills`.

# Journal des modifications

## 1.0.0 — Première version stable

- Introduction d'une palette centrale `--merp-*`.
- Mapping complet des palettes RMU bleue et violette vers des niveaux de gris.
- Compatibilité automatique avec les modules qui utilisent les variables RMU.
- Feuilles Actor harmonisées.
- Notes et Description lisibles.
- Lignes de compétences uniformisées.
- Badge « Comp. profess. ».
- Infobulles corrigées.
- Onglet États restauré.
- Répertoire Actors harmonisé.
- Barre latérale Foundry et cartes RMU passées en monochrome.
- Migration WebP conservée.
- Aucun changement de logique métier RMU.
- Version considérée comme base stable pour les évolutions futures.


## 1.2.0 — 2026-08-02

- Intégration groupée de 94 traductions de Compétences validées.
- Ajout de 25 Catégories de Compétences traduites et validées.
- Ajout du catalogue `translations/skill-categories/categories.fr.json`.
- Ajout de l’API `MERPUI.skillCategories` et des infobulles de catégories.
- Ajout du glossaire technique français validé.
- Conservation en brouillon des entrées non encore révisées.

## 1.2.4

- Augmentation de la hauteur des bandes de Catégories de Compétences.
- Uniformisation de la hauteur, du centrage vertical et des espacements des lignes de Compétences.

## 1.2.24 — 2026-08-07

- Correction de l’intégration éditoriale des Cultures.
- Remplacement exact, sans résumé ni reformulation, de la description des Elfes sylvains à partir de l’Item Foundry de référence fourni.
- Application de cette description intégrale aux copies des Deuxième, Troisième et Quatrième Âges.
- Ajout d’un audit interne des longueurs, sections et concordances entre copies d’une même Culture.
- Passage du schéma MERP-RMU à la version 15.

## 1.2.23 — 2026-08-07

- Réintégration des descriptions éditoriales développées des Cultures elfiques : Vanyar, Noldor, Sindar, Nandor, Elfes sylvains et Avari.
- Conservation intégrale des descriptions longues déjà présentes pour les Cultures humaines, dúnedain, hobbites et khazâd.
- Harmonisation de la mise en page HTML avec titres, sous-titres, paragraphes et listes.
- Passage du schéma MERP-RMU à la version 15.

## 1.2.22 — 2026-08-07

- Déplacement de toutes les Races restreintes dans `MERP-RMU > Races > Âge > Restreint`.
- Conservation de la limite Foundry de quatre niveaux.
- Remplacement des résumés abrégés par les descriptions éditoriales développées des Demi-Elfes, Umli, Petits-Nains, Orcs, Demi-Orcs, Trolls et Demi-Trolls.
- Conservation intégrale de la mise en forme HTML structurée : titres, sous-titres, paragraphes et listes.
- Passage du schéma MERP-RMU à la version 14.

## 1.2.21 — 2026-08-07

- Ajout des Races restreintes : Demi-Elfes, Umli, Petits-Nains, Orcs, Demi-Orcs, Trolls et Demi-Trolls.
- Intégration des descriptions développées en HTML structuré.
- Ajout des châssis RMU provisoires : statistiques, résistances, santé, taille, talents et limitations professionnelles.
- Disponibilités par Âge et indicateur technique `restricted: true`.
- Les Races restreintes sont placées directement dans le dossier de leur Âge, au même niveau que Dúnedain, Elfes, Humains, Khazâd et Hobbits.
- Aucun niveau de dossier supplémentaire n’est créé ; la limite Foundry de quatre niveaux reste respectée.
- Passage du schéma MERP-RMU à la version 13.

## 1.2.20 — 2026-08-07

- Ajout des principales Cultures elfiques : Vanyar, Noldor, Sindar, Nandor, Elfes sylvains et Avari.
- Disponibilités par Âge : Vanyar au Premier Âge ; Nandor aux Premier et Deuxième Âges ; Elfes sylvains aux Deuxième, Troisième et Quatrième Âges ; Noldor, Sindar et Avari selon leurs périodes respectives.
- Intégration des descriptions développées en HTML structuré.
- Ajout des langues, spécialisations recommandées, liens raciaux et rangs culturels RMU.
- Mise en forme HTML des premières Cultures humaines occidentales et nordiques : Béornides, Beffraens, Dúnedain du Gondor et d’Arnor, Eriadoriens, Gondoriens, Gramuz, Hommes du Nord urbanisés, Rohirrim et Hommes des Bois.
- Maintien de l’arborescence Foundry à quatre niveaux maximum : `MERP-RMU > Cultures > Âge > Race`.
- Passage du schéma des données MERP-RMU à la version 12.

## 1.2.19 — 2026-08-07

- Correction de la profondeur des dossiers Foundry : quatre niveaux maximum en comptant `MERP-RMU`.
- Nouvelle structure des Cultures : `MERP-RMU > Cultures > Âge > Race`.
- Suppression des sous-dossiers `Restreint` situés sous les dossiers raciaux.
- Les Cultures restreintes restent dans le dossier de leur Race et conservent leur indicateur technique `availability.restricted`.
- Nettoyage récursif des anciens dossiers MERP-RMU devenus vides après migration.
- Ajout d’une validation automatique empêchant la génération d’une arborescence dépassant quatre niveaux.
- Passage du schéma des données MERP-RMU à la version 11.

## 1.2.18 — 2026-08-07

- Intégration des descriptions développées des Dorwinrim, Orientaux, Haruze, Variags, Númenóréens Noirs et Corsaires d’Umbar.
- Intégration des descriptions développées des Cultures hobbites : Pieds-velus, Forts et Pâles.
- Intégration des descriptions développées des Cultures khazâd : Maison de Durin — Longues-Barbes et Maisons de Dwálin et de Thrár — Barbes-de-Feu et Torses-Larges.
- Correction terminologique : `Harfoots` devient `Pieds-velus` et `Big Folk` devient `Grandes Gens`.
- Conversion des descriptions concernées en HTML structuré avec titres, sous-titres, paragraphes et listes.
- Réorganisation des Cultures par Race à l’intérieur de chaque Âge, avec sous-dossier `Restreint` propre à chaque Race.
- Ajout de `raceCanonicalKey` aux métadonnées des Cultures afin de sécuriser le filtrage Race → Culture.
- Passage du schéma des données MERP-RMU à la version 10.

## 1.2.17 — 2026-08-06

- Premier lot de Cultures humaines des peuples du Sud et de l’Est.
- Ajout des Dorwinrim, Orientaux, Haruze, Variags, Númenóréens Noirs et Corsaires d’Umbar.
- Respect des disponibilités par Âge : Dorwinrim après 1700 du Deuxième Âge ; Variags aux Troisième et Quatrième Âges ; Corsaires à partir d’environ 1447 du Troisième Âge.
- Les Númenóréens Noirs utilisent la Race Dúnedain et sont classés dans `Restreint`.
- Les Haradrim ne sont pas encore ajoutés, leur profil n’étant pas décrit dans la source principale.
- Passage du schéma des données MERP-RMU à la version 9.

## 1.2.16 — 2026-08-06

- Ajout de la Race `Dúnedain` aux Deuxième, Troisième et Quatrième Âges.
- Intégration de la description complète validée de la Race Dúnedain.
- Conversion des bonus raciaux RMSS : Force +4, Constitution +4 et Présence +3.
- Migration des Cultures `Dúnedain du Gondor` et `Dúnedain du Royaume d’Arnor` vers la nouvelle Race.
- Rééquilibrage des deux Cultures à 85 rangs culturels chacune.
- Ajout de la Race `Elfes (Quendi)` aux quatre Âges.
- Ordre manuel forcé : Premier Âge, Deuxième Âge, Troisième Âge, Quatrième Âge.
- Passage du schéma des données MERP-RMU à la version 8.

## 1.2.15 — 2026-08-06

- Intégration des descriptions développées des Cultures humaines occidentales et nordiques.
- Cultures mises à jour : Beffraens, Béornides, Dúnedain du Gondor, Dúnedain du Royaume d’Arnor, Eriadoriens, Gondoriens, Gramuz, Hommes du Nord urbanisés, Rohirrim et Hommes des Bois.
- Suppression de toute référence méta aux documents sources dans les descriptions.
- Passage du schéma des données MERP-RMU à la version 7.

## 1.2.14 — 2026-08-06

- Premier lot de Cultures humaines occidentales et nordiques.
- Ajout des Beffraens, Béornides, Dúnedain du Gondor, Dúnedain du Royaume Perdu, Eriadoriens, Gondoriens, Gramuz, Hommes du Nord urbanisés, Rohirrim et Hommes des Bois.
- Déclinaison de chaque Culture uniquement dans les Âges où elle est disponible.
- Ajout de descriptions françaises développées, langues, spécialisations, rangs culturels RMU et recommandations de professions.
- Passage du schéma des données MERP-RMU à la version 6.

## 1.2.13 — 2026-08-06

- Ordre par défaut fixé : Premier Âge, Deuxième Âge, Troisième Âge, Quatrième Âge.
- Intégration de la description validée de la Race `Hobbits (Periannath)`, avec `Halflings` traduit par `Halfelins`.
- Ajout des Cultures hobbites `Piévelus`, `Forts` et `Pâles`.
- Déclinaison des trois Cultures hobbites aux Deuxième, Troisième et Quatrième Âges.
- Différenciation culturelle initiale : Piévelus des collines et traditions rurales ; Forts des rivières et marais ; Pâles des bois et traditions elfiques.
- Passage du schéma des données MERP-RMU à la version 5.

## 1.2.12 — 2026-08-06

- Réorganisation de `MERP-RMU/Races` et `MERP-RMU/Cultures` par Âge.
- Création des dossiers `Premier Âge`, `Deuxième Âge`, `Troisième Âge` et `Quatrième Âge`.
- Création d’un sous-dossier `Restreint` dans chaque dossier d’Âge, pour les Races et les Cultures.
- Duplication gérée des Items disponibles dans plusieurs Âges au moyen de `canonicalKey` et de métadonnées de disponibilité.
- Disponibilité initiale : Khazâd et Humains aux quatre Âges ; Quendi au Premier Âge ; Hobbits après le milieu du Deuxième Âge, puis aux Troisième et Quatrième Âges.
- Répartition des deux Cultures khazâd existantes dans les quatre Âges.
- Migration automatique supprimant les anciennes copies MERP-RMU devenues obsolètes.

## 1.2.11 — 2026-08-06

- Intégration de la description validée de la Race `Khazâd (Naugrim)`.
- Intégration de la description validée de la Race `Elfes (Quendi)`.

## 1.2.10 — 2026-08-06

- Remplacement et développement de la description de la Race `Humains (Hildor)`.
- Distinction narrative entre Hauts Hommes, Hommes du Milieu et Hommes Communs.
- Précision du rôle des Cultures humaines dans la création de personnage.

## 1.2.9 — 2026-08-06

- Renommage de la Race `Khazâd` en `Khazâd (Naugrim)`.
- Ajout de la Race `Elfes (Quendi)` dans `MERP-RMU/Races`.
- Ajout de la Race `Hobbits (Periannath)` dans `MERP-RMU/Races`.
- Le profil elfique commun utilise la base raciale Avar ; les différences Noldor, Sindar et autres seront portées par les Cultures.
- Passage du schéma des données MERP-RMU à la version 3.

## 1.2.8 — 2026-08-06

- Ajout de la Race `Humains (Hildor)` dans `MERP-RMU/Races`.
- Conservation des bonus RMSS du profil racial `Common Man` : Force +2 et Autodiscipline +2.
- Ajout d’un profil humain RMU neutre destiné à être complété par les Cultures humaines.
- Passage du schéma des données MERP-RMU à la version 2.

## 1.2.7 — 2026-08-06

- Ajout de la bibliothèque de création de personnage `MERP-RMU` dans le monde Foundry.
- Création idempotente des sous-dossiers `Cultures`, `Professions`, `Races`, `Skills` et `Talents & Flaws`.
- Ajout de la Race commune `Khazâd`.
- Ajout des Cultures `Maison de Durin — Longues-Barbes` et `Maisons de Dwálin et de Thrár — Barbes-de-Feu et Torses-Larges`.
- Ajout des métadonnées de restrictions et recommandations de professions et talents dans `flags.merp-ui`.

## 1.2.37
- Première automatisation de la magie MERP-RMU branchée sur les JLS natifs de RMU.
- Jet secret de Risque d’attirer l’Ombre après chaque événement SCR, avec Facteur de Risque par type de sort, période historique, activité de l’Ombre et table de conséquence par type de région.
- Détection des Listes de Sorcellerie explicitement citées par les règles MERP et déclenchement automatique du test de Corruption.
- Suivi des Points de Corruption sur l’Actor (`flags.merp-ui.corruptionPoints`) et bouton MJ pour provoquer un test lorsque l’intention d’un sort ordinaire est corruptrice.
- Intégration roleplay de la Parole de Commandement dans le dialogue RMU : -3/-4 PA devient une Phrase de Commandement ; les sorts instantanés sont signalés comme Mot de Commandement. Aucun calcul RMU de PA/JLS n’est remplacé.
- Paramètres de Monde : activité de l’Ombre, période, type de région, secret des jets et application automatique des PC.

## 1.2.50
- Corrige les clés techniques des Professions magiques MERP-RMU : `Magicien` utilise `Magician` et `Animiste` utilise `Animist` pour la résolution native RMU des Base Spell Lists.
- Répare automatiquement les Professions déjà embarquées dans les Actors et normalise les nouvelles Professions lors de leur création/mise à jour.
- Le Compendium `MERP-RMU — Listes de Sorts` devient la source des listes non-RMU ; `Nature's Movement/Senses` n'est plus dupliquée comme Item monde géré par MERP-UI.
- Schéma de contenu 30.

## 1.2.51
- Corrige la découverte des Listes de base RMU/MERP-RMU.
- `Nature's Movement/Senses` est de nouveau maintenue comme Item monde (nécessaire au sélecteur RMU) tout en restant archivée dans le Compendium MERP-RMU.
- Corrige la lecture du fichier `non-rmu-spell-lists.json` (`spellLists`).
- Les six Listes natives du Magicien ne sont plus systématiquement recopiées par MERP-UI lorsqu'une version RMU est déjà importée dans le monde.
- Nettoie uniquement les doublons strictement identiques provenant du même `compendiumSource`, afin d'éviter les entrées triples dans le sélecteur RMU.
