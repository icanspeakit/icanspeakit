// Bruno sucht den Hochstapler: small pieces of markup every screen shares (Party, projector, phone).
import { avatarSrc } from "../liveQuiz/names.js";
import { withBase } from "../paths.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** A player's animal as an <img>, or nothing for an animal this page does not know. */
export function avImg(p, cls = "hst-av") {
  const src = avatarSrc(p?.avatar);
  return src ? `<img class="${cls}" src="${withBase(src)}" alt="" width="64" height="64" />` : "";
}

/**
 * The word's card: article + word, picture, and its meaning in the reader's language (small).
 * `w.m` is a meaning already picked for the reader (the phone's sealed seat); otherwise w[lang].
 */
export function wordCard(w, lang) {
  const meaning = w.m ?? w[lang] ?? (lang === "de" ? "" : w.en) ?? "";
  const mLang = w.lang ?? lang;
  return `<div class="hst-word">
    ${w.img ? `<img class="hst-word-img" src="${esc(withBase(w.img))}" alt="" width="140" height="140" />` : `<span class="hst-word-noimg" aria-hidden="true">${esc(String(w.de).split(" ").pop()[0])}</span>`}
    <b class="hst-word-de">${esc(w.de)}</b>
    ${meaning && mLang !== "de" ? `<small class="hst-word-meaning" lang="${esc(mLang)}" dir="auto">${esc(meaning)}</small>` : ""}
  </div>`;
}
