// SPDX-License-Identifier: AGPL-3.0-only
// Imported assets are bundled with Vite; no changes to the upstream asset submodule.
const files = import.meta.glob<string>("./sprites/*.png", { eager: true, query: "?url", import: "default" });
export const forgeBaseSprites = Object.entries(files).map(([path, url]) => ({
  key: "forge-base-" + path.split("/").pop()!.replace(".png", ""),
  url,
}));
