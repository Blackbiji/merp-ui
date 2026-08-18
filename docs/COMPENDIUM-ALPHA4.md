# MERP-UI 1.6.0-alpha.4

Baseline : `1.6.0-alpha.3` validée dans Foundry.

## Risque magique — Modificateur d'Âge

Valeurs disponibles :

| Période | Modificateur |
|---|---:|
| Neutre / autre période | +0 |
| Premier Âge — Guerre contre Morgoth | +25 |
| Premier Âge — Morgoth en pleine puissance | +40 |
| Deuxième Âge — avant l'essor de Sauron | -10 |
| Deuxième Âge — Sauron en puissance | +10 |
| Deuxième Âge — Guerre de la Dernière Alliance | +25 |
| Début du Troisième Âge | -15 |
| Milieu du Troisième Âge | +0 |
| Fin du Troisième Âge | +25 |
| Quatrième Âge | -25 |

Les nouvelles valeurs du Premier et du Deuxième Âge sont des paramètres de
campagne **MERP-RMU**, pas des valeurs présentées comme officielles ICE/RMU.

## Journaux

Les Journaux MERP-RMU utilisent déjà un titre éditorial dans leur contenu HTML.
Le titre automatique de page Foundry est donc masqué (`title.show=false`) dans :

- les sources des Compendiums ;
- les Documents déjà présents dans les Compendiums lors de la synchronisation ;
- les Journaux importés depuis les Compendiums.

## Noms des Compendiums

Les packs n'affichent plus deux langues simultanément.

### Français

- MERP-RMU — Races
- MERP-RMU — Cultures
- MERP-RMU — Professions
- MERP-RMU — Compétences
- MERP-RMU — Listes de Sorts
- MERP-RMU — Talents & Défauts
- MERP-RMU — Herbes & Substances
- MERP-RMU — Langues
- MERP-RMU — Règles & Références

### English

- MERP-RMU — Races
- MERP-RMU — Cultures
- MERP-RMU — Professions
- MERP-RMU — Skills
- MERP-RMU — Spell Lists
- MERP-RMU — Talents & Flaws
- MERP-RMU — Herbs & Substances
- MERP-RMU — Languages
- MERP-RMU — Rules & References

Le changement utilise la configuration native du Compendium et suit la langue
éditoriale MERP-UI.
