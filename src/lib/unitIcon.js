// The emoji a lexicon unit (a Lernset) wears in a side nav.
//
// Every set has its own picture. Borrowing the der/die/das pack's icon per topic gave every
// set in a group the same one — Person, Familie and Gefühle all 👫 — and a column of
// identical pictures says nothing. UNIT_ICONS names one per set; a set that is not listed
// (a new one) falls back to its pack's icon, and the check at the bottom fails the build if
// two sets in the same group end up sharing one.
//
// One source, so a set shows the same picture on Wortschatz and on Aussprache.
import packs from "../data/artikel-packs.json";

const UNIT_ICONS = {
  // A1
  "a1-01": "🙋", "a1-02": "👨‍👩‍👧", "a1-03": "😊",
  "a1-04": "🏠", "a1-05": "🛋️",
  "a1-06": "🍎", "a1-07": "🛒", "a1-08": "👕",
  "a1-09": "💪", "a1-10": "🩺",
  "a1-11": "⏰", "a1-12": "💼", "a1-13": "🎒", "a1-14": "⚽",
  "a1-15": "🏙️", "a1-16": "🚦", "a1-17": "🧳",
  "a1-18": "📅", "a1-19": "🌦️", "a1-20": "🐾",
  "a1-21": "🏃", "a1-22": "✍️", "a1-23": "⚖️", "a1-24": "📍", "a1-25": "🔗", "a1-26": "📝",
  // A2
  "a2-01": "🔑", "a2-02": "🤝", "a2-03": "🔧",
  "a2-04": "🍳", "a2-05": "🍽️",
  "a2-06": "🤒", "a2-07": "💊", "a2-08": "🧴",
  "a2-09": "📄", "a2-10": "👥", "a2-11": "🎓",
  "a2-12": "🏦", "a2-13": "📮", "a2-14": "🛡️",
  "a2-15": "📞", "a2-16": "💻", "a2-17": "🔄",
  "a2-18": "🚆", "a2-19": "🚗", "a2-20": "🏨",
  "a2-21": "🎉", "a2-22": "🚴", "a2-23": "🎬",
  "a2-24": "🧑", "a2-25": "💭", "a2-26": "♻️", "a2-27": "🪞", "a2-28": "💬",
  // B1
  "b1-01": "📑", "b1-07": "💶", "b1-19": "📈", "b1-32": "🧑‍💼", "b1-37": "🐷",
  "b1-04": "🏛️", "b1-12": "✒️", "b1-18": "🗳️", "b1-35": "📋", "b1-42": "🚓",
  "b1-02": "🏥", "b1-21": "🧠", "b1-22": "🤸", "b1-33": "🧑‍⚕️",
  "b1-03": "🏢", "b1-25": "🏘️", "b1-34": "💡",
  "b1-05": "📚", "b1-28": "🗣️", "b1-31": "🔬", "b1-36": "🎓",
  "b1-11": "🫂", "b1-17": "🧭", "b1-20": "🎭", "b1-23": "👶", "b1-41": "🤲",
  "b1-06": "🌱", "b1-08": "🛣️", "b1-15": "🧳", "b1-26": "🏞️", "b1-27": "🌡️", "b1-38": "🦺", "b1-45": "🗺️",
  "b1-14": "⚽", "b1-16": "🥦", "b1-24": "🛍️", "b1-29": "👗", "b1-30": "🗓️", "b1-44": "🥾", "b1-46": "🍝",
  "b1-09": "📰", "b1-10": "💬", "b1-13": "📱", "b1-39": "🔍", "b1-40": "⚡", "b1-43": "⚙️",
  // B2
  "b2-01": "🧭", "b2-02": "🌍", "b2-18": "📊", "b2-21": "⛑️", "b2-30": "🧾", "b2-53": "📉",
  "b2-03": "📜", "b2-04": "🏛️", "b2-20": "🗂️", "b2-33": "⚖️", "b2-36": "🕊️", "b2-51": "🏘️", "b2-54": "🔒",
  "b2-11": "🩺", "b2-12": "🛋️", "b2-27": "🔥", "b2-31": "🏥", "b2-46": "🧘",
  "b2-16": "🏗️", "b2-49": "🔨", "b2-50": "🏰",
  "b2-08": "🔬", "b2-10": "🎓", "b2-15": "🎩", "b2-25": "🌱", "b2-37": "🧪", "b2-52": "📣", "b2-56": "📝", "b2-60": "🗣️",
  "b2-05": "👵", "b2-13": "🤝", "b2-14": "🖼️", "b2-24": "👨‍👧", "b2-34": "🏡", "b2-35": "✈️", "b2-39": "🎵", "b2-40": "🧒",
  "b2-06": "🌡️", "b2-17": "🌳", "b2-19": "🚄", "b2-32": "🚒", "b2-38": "💧", "b2-42": "🌪️", "b2-48": "🧳", "b2-55": "♻️",
  "b2-22": "🥫", "b2-23": "🏅", "b2-41": "🧵", "b2-45": "🏷️", "b2-47": "⏳",
  "b2-07": "🔐", "b2-09": "🎙️", "b2-26": "🤝", "b2-28": "📢", "b2-29": "🏭", "b2-57": "🤖", "b2-58": "🌐", "b2-59": "🧩",
  "b2-43": "🪪", "b2-44": "🎨",
  // C1
  "c1-01": "🤔", "c1-02": "📚", "c1-03": "🔗", "c1-04": "🎩", "c1-05": "🧱", "c1-06": "🧩", "c1-07": "💬", "c1-08": "📈",
  "c1-09": "♟️", "c1-10": "💶", "c1-11": "👔",
  "c1-12": "📜", "c1-13": "🏛️", "c1-14": "🕵️",
  "c1-15": "💉", "c1-16": "🧠",
  "c1-17": "⚖️", "c1-18": "🧑", "c1-19": "😌", "c1-20": "🖼️",
  "c1-21": "🔋",
  "c1-22": "💻", "c1-23": "📰", "c1-24": "🎤",
  // C2
  "c2-01": "🦉", "c2-02": "🎙️", "c2-03": "🪶", "c2-04": "🌐", "c2-05": "💭", "c2-06": "☕", "c2-16": "🔀",
  "c2-07": "🖋️", "c2-08": "👑",
  "c2-09": "🔍", "c2-10": "👏", "c2-11": "💎",
  "c2-12": "🗣️",
  "c2-13": "🚶",
  "c2-14": "🏦",
  "c2-15": "🌿",
};

const packIcon = (unit) => {
  const topics = unit?.topics ?? [];
  const pack = packs.topics.find((p) => p.topics.some((t) => topics.includes(t)));
  return pack?.levels?.[unit?.level]?.icon ?? pack?.icon ?? "•";
};

/** @param {{ id?: string, topics?: string[], level?: string|null }} unit */
export function unitIcon(unit) {
  return UNIT_ICONS[unit?.id] ?? packIcon(unit);
}

/** Sets in one group that share a picture — empty when every group is varied. */
export function duplicateIconsIn(groups) {
  const clashes = [];
  for (const g of groups) {
    const seen = new Map();
    for (const set of g.sets ?? []) {
      const icon = unitIcon(set);
      if (seen.has(icon)) clashes.push(`${g.title ?? g.id}: ${seen.get(icon)} und ${set.id} (${icon})`);
      else seen.set(icon, set.id);
    }
  }
  return clashes;
}
