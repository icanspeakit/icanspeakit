// Pexels and Pixabay behind one interface, for scripts/fetch-hub-bilder.mjs.
//
// Mirrors the SOURCES object in scripts/fetch-sprechen-bilder.mjs (see its header for why
// these two libraries and not Unsplash). That script keeps its own copy for now; moving it
// onto this module is a mechanical follow-up once it has been re-run against the live API.
//
// Each source normalises its hits to { id, width, height, author, authorURL, tags,
// pageURL, fileURL }.

export const SOURCES = {
  pexels: {
    env: "PEXELS_API_KEY",
    request(key, q, { perPage = 12 } = {}) {
      const p = new URLSearchParams({
        query: q,
        orientation: "landscape",
        size: "large",
        per_page: String(perPage),
      });
      return [`https://api.pexels.com/v1/search?${p}`, { headers: { Authorization: key } }];
    },
    hits: (json) => json.photos ?? [],
    norm: (h) => ({
      id: h.id,
      width: h.width,
      height: h.height,
      author: h.photographer,
      authorURL: h.photographer_url,
      tags: h.alt ?? "",
      pageURL: h.url,
      // original, not large2x: the hero is cut to 1600px and the OG image to 1200×630,
      // and large2x is often narrower than that.
      fileURL: h.src?.original ?? h.src?.large2x,
    }),
    license:
      "Pexels-Lizenz — freie kommerzielle Nutzung, keine Namensnennung nötig; die API-Richtlinien verlangen einen Link auf Pexels, der unter dem Foto steht",
  },
  pixabay: {
    env: "PIXABAY_API_KEY",
    request(key, q, { perPage = 12, minWidth = 1600 } = {}) {
      const p = new URLSearchParams({
        key,
        q,
        image_type: "photo",
        orientation: "horizontal",
        min_width: String(minWidth),
        safesearch: "true",
        per_page: String(perPage),
        order: "popular",
      });
      return [`https://pixabay.com/api/?${p}`, {}];
    },
    hits: (json) => json.hits ?? [],
    norm: (h) => ({
      id: h.id,
      width: h.imageWidth,
      height: h.imageHeight,
      author: h.user,
      authorURL: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
      tags: h.tags,
      pageURL: h.pageURL,
      fileURL: h.largeImageURL,
    }),
    license: "Pixabay Content License — freie kommerzielle Nutzung, keine Namensnennung nötig",
  },
};

/** The library to use: `asked` if given, else Pexels when its key is set, else Pixabay.
 *  Exits with a readable message when the key is missing. */
export function pickSource(asked) {
  if (asked && !SOURCES[asked]) {
    console.error(`--source ${asked}: unbekannt. Möglich: ${Object.keys(SOURCES).join(", ")}`);
    process.exit(1);
  }
  const name = asked ?? (process.env[SOURCES.pexels.env] ? "pexels" : "pixabay");
  const source = SOURCES[name];
  const key = process.env[source.env];
  if (!key) {
    console.error(`${source.env} fehlt — in .env.local eintragen.`);
    process.exit(1);
  }
  return { name, source, key };
}

/** "(noch N Anfragen, zurückgesetzt in S s)" from the rate-limit headers, or "". */
export function rateInfo(res) {
  const left = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const parts = [];
  if (left !== null) parts.push(`noch ${left} Anfragen`);
  if (reset !== null) {
    const n = Number(reset);
    const secs = n > 1e6 ? Math.max(0, Math.round(n - Date.now() / 1000)) : n;
    parts.push(`zurückgesetzt in ${secs} s`);
  }
  return parts.length ? ` (${parts.join(", ")})` : "";
}
