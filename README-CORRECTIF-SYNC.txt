MERP-UI 1.6.0 RC1 — correctif GitHub : synchronisation générale + typographie

Installation :
1. Fermer Foundry VTT / arrêter le serveur.
2. Copier le contenu du dossier merp-ui/ de cette archive vers
   Data/modules/merp-ui/ (ou le dossier du dépôt GitHub), sans supprimer
   les autres fichiers existants.
3. Redémarrer Foundry et ouvrir un monde RMU avec un MJ.
4. Avant publication publique, tester dans Foundry V13/V14 sur une copie
   du monde, notamment le Compendium Rules & References et les traductions.

Portée du correctif :
- Synchronisation incrémentale des neuf Compendiums MERP-RMU, pilotée par
  un manifeste à empreinte SHA-256 de leurs 455 JSON sources.
- Préservation des identifiants, des pages supplémentaires et du guide
  d'installation ; pas de réécriture automatique des Items des personnages.
- Nouveaux documents ajoutés avec identifiant stable si absents d'un vieux
  Compendium déjà migré en LevelDB.
- L'ancien synchroniseur de l'Introduction reste disponible pour les mondes
  existants et pour la compatibilité ascendante.
- Journaux : corps 13 px, titres H1/H2/H3/H4 réduits, police PragRoman inchangée.
- Aucun fichier de police et aucune base LevelDB propre à un monde inclus.

Maintenance GitHub :
- Après toute modification d'un JSON source :
  npm run build:content-sync
  npm run build:compendium-seeds:en
  npm run validate:content-sync
  npm run test:content-sync
- Pour le détail, lire docs/CONTENT-SYNC.md.

Commandes MJ (console F12) :
  await MERPUI.checkContent();
  await MERPUI.syncContent();
  await MERPUI.syncImportedJournals(); // volontaire : peut remplacer la prose modifiée

Le numéro de version reste 1.6.0-rc.1 pour cet essai.
Tests automatisés hors Foundry OK ; validation en conditions réelles indispensable.
