// Offline audio packs existed only in the Android app (Capacitor), which icanspeak Spanish
// does not ship. Same exports, nothing downloaded: audio always plays from the site.
export function initPacks() { return Promise.resolve(); }
/** @param {string} _path @returns {string|null} */
export function downloadedUrl(_path) { return null; }
export async function listPacks() { return []; }
export async function downloadPack() { throw new Error("audio packs: app only"); }
export async function deletePack() {}
