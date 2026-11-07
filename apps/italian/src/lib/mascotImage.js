// A mascot (src/lib/mascots.js) as an <img> a canvas can draw, made once per look.
//
// The games put a mascot in the lead role and the name: Bruno Kart (Artikel-Sprint, drawn in
// 3D-look by its renderer, not from here), Hamsti's Bird Safari, Brunos Stadtfahrt,
// Quaki kreuzt (Vorfahrt), Die Legende von Lindenau (Regi as Super-Blubb). They draw it
// with drawImage once `ready(img)` says it has loaded; until then a frame just leaves it out.
import { mascotSvg } from "./mascots.js";

const cache = new Map();

/** @param {"bruno"|"regi"|"hamsti"|"quaki"} name */
export function mascotImage(name, { expr = "happy", view = "front", extra } = {}) {
  const key = `${name}|${expr}|${view}|${extra ?? ""}`;
  let img = cache.get(key);
  if (!img) {
    let svg = mascotSvg({ name, expr, view, extra, size: 200, label: "" });
    // Inline SVG needs no namespace; as an image file it does.
    if (!svg.includes("xmlns=")) svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    cache.set(key, img);
  }
  return img;
}

export const ready = (img) => img.complete && img.naturalWidth > 0;
