// MERP-UI — default Human race for a newly created RMU Character.
// Only the initial embedded Race of a *new* Actor is changed.  The native RMU
// character creation flow, actor flags, stats and subsequent race picker remain
// authoritative. No existing Actors or selected Race items are altered.

const MERP_RACE_PACK = "merp-ui.merp-rmu-races";
const HILDOR_DOCUMENT_ID = "WRq9ldgFiYPvVoyV";
const HILDOR_CANONICAL_KEY = "race-humans";
const PATCH_MARKER = Symbol.for("merp-ui.default-hildor-race");

/** Replace the native first Race *within pre-creation*, never with createItem. */
export function installDefaultHildorRace() {
  if (game.system?.id !== "rmu") return false;
  const proto = CONFIG.Actor.documentClass?.prototype;
  const native = proto?._rmuCharacterPreCreate;
  if (typeof native !== "function") {
    console.warn("merp-ui | Race Hildor par défaut : préparation RMU indisponible.");
    return false;
  }
  if (native[PATCH_MARKER]) return true;

  async function merpHildorCharacterPreCreate(data, options, user) {
    // Let RMU initialise all its actor state and its fallback Common Human.
    const result = await native.call(this, data, options, user);
    if (result === false || this.type !== "Character") return result;

    // An actor explicitly constructed with a Race must keep that exact race.
    if (data?.items?.some?.(item => item?.type === "race")) return result;

    try {
      const pack = game.packs.get(MERP_RACE_PACK);
      const hildor = await pack?.getDocument(HILDOR_DOCUMENT_ID);
      if (!hildor || hildor.type !== "race" ||
          hildor.flags?.["merp-ui"]?.canonicalKey !== HILDOR_CANONICAL_KEY) {
        console.warn("merp-ui | Race Humains (Hildor) introuvable : race RMU par défaut conservée.");
        return result;
      }
      const race = hildor.toObject();
      // Match RMU's own generation of the initial size and weight, using the
      // *Hildor* frame instead of retaining a build rolled for Common Human.
      const { generateRandomHeightWeight } = await import(
        "/systems/rmu/module/rmu/chat/render-frame.js"
      );
      race.system.build = await generateRandomHeightWeight("male", race.system);

      // updateSource changes the pending actor document before first save.
      // It does NOT create or delete embedded Items on an existing actor and
      // consequently does not invoke MERP culture-language/skill hooks.
      const otherItems = (this.toObject().items ?? []).filter(item => item.type !== "race");
      this.updateSource({ items: [...otherItems, race] });
    } catch (error) {
      // Preserve RMU native defaults if the compendium is not yet available.
      console.warn("merp-ui | Race Hildor par défaut indisponible : race RMU conservée.", error);
    }
    return result;
  }

  merpHildorCharacterPreCreate[PATCH_MARKER] = true;
  proto._rmuCharacterPreCreate = merpHildorCharacterPreCreate;
  return true;
}
