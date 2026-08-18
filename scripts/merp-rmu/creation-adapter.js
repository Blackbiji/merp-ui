const MODULE_ID = "merp-ui";

/**
 * Register low-level creation restrictions that depend on RMU Actor Items.
 *
 * The adapter deliberately receives all MERP-specific predicates from the
 * content layer.  This keeps Foundry/RMU hook wiring isolated here while the
 * rules themselves remain owned by MERP-RMU data/services.
 */
export function registerCreationRestrictionHooks({
  specialSkillKey,
  specialSkillKeys,
  specialSkillAllowed,
  embeddedSpellListIdentity,
  isInvalidStartlightName
} = {}) {
  Hooks.on("preCreateItem", (item, data, options) => {
    try {
      if (options?.merpUiSpecialPowerSkillInstall || options?.merpUiSpecialPowerSkillSync) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || item.type !== "skill") return;
      const key = specialSkillKey(item);
      if (!specialSkillKeys.has(key) || specialSkillAllowed(actor, key)) return;
      ui.notifications.warn(key === "yavannas-song"
        ? "MERP UI : le Chant de Yavanna est réservé aux Sindar et aux Elfes sylvains."
        : "MERP UI : les Chants de Guérison sont réservés aux Elfes (Quendi)."
      );
      return false;
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de vérifier la restriction d’une Compétence MERP`, error);
    }
  });

  Hooks.on("preCreateItem", (item) => {
    try {
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || item.type !== "skill" || item.name !== "Base Spell List") return;
      const incoming = embeddedSpellListIdentity(item);
      const incomingLabel = item.system?.specialization ?? item.system?.spellListName ?? "";
      if (isInvalidStartlightName(incomingLabel)) {
        ui.notifications?.warn?.("MERP UI : STARTLIGHT est une ancienne liste erronée et ne peut pas être ajoutée.");
        return false;
      }
      if (!incoming.uuid && !incoming.name) return;

      const duplicate = [...(actor.items ?? [])].find((existing) => {
        if (existing.type !== "skill" || existing.name !== "Base Spell List") return false;
        const current = embeddedSpellListIdentity(existing);
        if (incoming.uuid && current.uuid && incoming.uuid === current.uuid) return true;
        return incoming.name && current.name && incoming.name === current.name;
      });
      if (!duplicate) return;

      const label = item.system?.specialization ?? "cette Liste de Sorts";
      ui.notifications?.warn?.(`MERP UI : ${label} est déjà connue par ce personnage.`);
      return false;
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de vérifier le doublon de Liste de Sorts`, error);
    }
  });


}
