# Référentiel partagé des compétences RMU

MERP-UI maintient les identités et traductions communes des compétences RMU.
Le système `rmu` est toujours traité comme une source externe en lecture seule.

## Fichiers

- `translations/skills/source/skills-translation-work.json` : registre canonique et métadonnées RMU.
- `translations/skills/source/skills.fr.work.json` : document éditorial bilingue.
- `translations/skills/skills.fr.json` : catalogue généré chargé par les modules.

## Import depuis RMU

```bash
npm install
npm run import:rmu-skills -- "/chemin/vers/Data/systems/rmu"
npm run build:skills
```

Le script accepte aussi un export JSON du compendium `rmu.core`. Les traductions existantes ne sont jamais écrasées.

## API Foundry

```javascript
await MERPUI.skills.resolve("Body Development")
await MERPUI.skills.resolve("rmu.skill.body-development")
```
