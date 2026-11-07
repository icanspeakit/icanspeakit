// The tile on a language's card on /culture/mistakes and /test123: a lettermark rather than a
// flag, because a language is not a country (English, Arabic, Portuguese are spoken in many).
const MARK = {
  arabisch: "ع", russisch: "Ру", ukrainisch: "Ук",
  deutsch: "De", franzoesisch: "Fr", italienisch: "It", englisch: "En", portugiesisch: "Pt", rumaenisch: "Ro", chinesisch: "中",
};
export const langMark = (id) => MARK[id] ?? id.slice(0, 2);
