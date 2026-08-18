import { folderParentId } from "./content-folders.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";

export async function removeEmptyLegacyTalentsFlawsFolder() {
  const root = game.folders.find((folder) =>
    folder.type === "Item" &&
    folder.name === ROOT_FOLDER &&
    folderParentId(folder) === null
  ) ?? null;
  if (!root) return 0;

  const candidates = game.folders.filter((folder) =>
    folder.type === "Item" &&
    folder.name === "Talents & Flaws" &&
    folderParentId(folder) === root.id
  );

  let deleted = 0;
  for (const folder of candidates) {
    const hasItems = game.items.some((item) => item.folder?.id === folder.id);
    const hasChildren = game.folders.some((child) => folderParentId(child) === folder.id);
    if (!hasItems && !hasChildren) {
      await folder.delete({ merpUiLocalizationRefresh: true });
      deleted += 1;
    }
  }
  return deleted;
}
