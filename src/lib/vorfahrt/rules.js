// Vorfahrt-Flitzer: the crossings and who goes first. One crossing = what regulates it, where
// the learner is heading and who else is there. `decide()` says whether the learner may drive
// or must wait, and why, in short B1 German. The rules (StVO):
//   §8   rechts vor links; Vorfahrtstraße (Z. 306) / Vorfahrt an der nächsten Kreuzung (Z. 301)
//        beat it; Vorfahrt achten (Z. 205) and Stop (Z. 206) give it away – at Stop always halt.
//   §9   turning left: oncoming traffic going straight goes first; turning: pedestrians crossing
//        the road you turn into go first.
//   §26  Zebrastreifen: pedestrians go first.
//   §37  the traffic light beats every sign.
//   §38  blue light and siren: make way at once, whatever the sign says.
//   §8 (1a) Kreisverkehr (Z. 215 + Z. 205): who is in the circle goes first; no indicator going in.
//   §37 (2) yellow: stop if that is still safe; Grünpfeil (Z. 720): stop first, then turn right.
//   §19  Bahnübergang (Z. 201): a train always goes first; red light flashing = wait.
//   Z. 208 / Z. 308 at a narrow spot: who must let the oncoming traffic through.
//   §9 (1) indicate before turning – the navi says where to, the learner sets the indicator.
// Cross traffic always goes straight, oncoming traffic too: the game never asks about two
// turning cars at once, and never builds a rechts-vor-links crossing where everyone waits.

/** What regulates the crossing, with the sign's name as the learner should learn it. */
export const CONTROLS = {
  rvl: { name: "Keine Schilder: rechts vor links" },
  hauptstrasse: { name: "Vorfahrtstraße" },
  naechste: { name: "Vorfahrt an der nächsten Kreuzung" },
  achten: { name: "Vorfahrt achten" },
  stop: { name: "Halt! Vorfahrt achten (Stoppschild)" },
  gruen: { name: "Ampel: Grün" },
  rot: { name: "Ampel: Rot" },
  zebra: { name: "Zebrastreifen" },
  kreisel: { name: "Kreisverkehr" },
  gelb: { name: "Ampel: Gelb" },
  pfeil: { name: "Ampel: Rot mit Grünpfeil" },
  bahn: { name: "Bahnübergang (Andreaskreuz)" },
  eng208: { name: "Engstelle: Vorrang des Gegenverkehrs" },
  eng308: { name: "Engstelle: Vorrang vor dem Gegenverkehr" },
};

/** Controls with no cross road: the learner's road narrows, or only rails cross it. */
export const NO_CROSS_ROAD = new Set(["zebra", "eng208", "eng308"]);

/** The indicator a crossing asks for: the turn's side; none straight on and none into a Kreisverkehr. */
export const blinkFor = (c) => (c.control === "kreisel" || c.turn === "straight" ? null : c.turn);

/** The verdict when the rule was right but the indicator was not. */
export function blinkVerdict(c, blink) {
  if (c.control === "kreisel") return { go: null, key: "blinkKreisel", why: "In den Kreisverkehr fährst du ohne Blinker ein. Erst beim Hinausfahren blinkst du rechts." };
  if (!blink) return { go: null, key: c.turn === "left" ? "blinkMissL" : "blinkMissR", why: `Du biegst ${c.turn === "left" ? "links" : "rechts"} ab: Vorher ${c.turn === "left" ? "links" : "rechts"} blinken – das zeigt den anderen, wohin du fährst.` };
  if (c.turn === "straight") return { go: null, key: "blinkStraight", why: "Du fährst geradeaus: Kein Blinker. Ein falscher Blinker verwirrt die anderen." };
  return { go: null, key: "blinkWrong", why: `Falscher Blinker: Du biegst ${c.turn === "left" ? "links" : "rechts"} ab, also ${c.turn === "left" ? "links" : "rechts"} blinken.` };
}

export const TURNS = { straight: "geradeaus", left: "links abbiegen", right: "rechts abbiegen" };

/**
 * @param {{ control: string, turn: string, right?: boolean, left?: boolean, oncoming?: boolean,
 *   ped?: boolean, blue?: "left" | "right" | null }} c
 * @returns {{ go: boolean, why: string, key: string }} `key` names the explanation (vf.why.<key> in the UI texts)
 */
export function decide(c) {
  if (c.blue) return { go: false, key: "blue", why: "Blaulicht und Martinshorn: Du musst sofort Platz machen und warten – egal, was die Schilder sagen." };
  if (c.control === "rot") return { go: false, key: "rot", why: "Rote Ampel: Du hältst vor der Haltlinie." };
  if (c.control === "gelb") return { go: false, key: "gelb", why: "Gelbe Ampel: Gleich kommt Rot. Du hältst an, wenn du noch sicher bremsen kannst." };
  if (c.control === "pfeil") return { go: false, key: "pfeil", why: "Grünpfeil: Erst an der Haltlinie anhalten. Dann darfst du vorsichtig rechts abbiegen." };
  if (c.control === "bahn") {
    return c.train
      ? { go: false, key: "bahnZug", why: "Bahnübergang: Das rote Licht blinkt, ein Zug kommt. Der Zug hat immer Vorrang – du wartest." }
      : { go: true, key: "bahnFrei", why: "Bahnübergang: Kein rotes Licht, kein Zug. Du darfst langsam darüber fahren." };
  }
  if (c.control === "kreisel") {
    return c.left
      ? { go: false, key: "kreiselBusy", why: "Kreisverkehr: Wer schon im Kreis fährt, hat Vorfahrt. Du wartest." }
      : { go: true, key: "kreiselFree", why: "Kreisverkehr frei: Du fährst ein – ohne zu blinken." };
  }
  if (c.control === "eng208") {
    return c.oncoming
      ? { go: false, key: "eng208Onc", why: "Rotes Schild mit rotem Pfeil: Der Gegenverkehr hat Vorrang. Du wartest vor der Engstelle." }
      : { go: true, key: "eng208Free", why: "Der Gegenverkehr hat hier Vorrang – aber es kommt niemand. Du darfst fahren." };
  }
  if (c.control === "eng308") {
    return { go: true, key: c.oncoming ? "eng308Onc" : "eng308Free", why: c.oncoming
      ? "Blaues Schild mit weißem Pfeil: Du hast Vorrang. Der Gegenverkehr wartet."
      : "Blaues Schild: Du hast Vorrang vor dem Gegenverkehr. Fahr weiter." };
  }
  if (c.control === "stop") return { go: false, key: "stop", why: "Am Stoppschild hältst du immer an – auch wenn die Kreuzung frei ist." };
  if (c.control === "zebra") {
    return c.ped
      ? { go: false, key: "zebraPed", why: "Am Zebrastreifen dürfen Fußgänger zuerst gehen. Du wartest." }
      : { go: true, key: "zebraFree", why: "Der Zebrastreifen ist frei: Du darfst weiterfahren." };
  }
  if (c.control === "achten" && (c.left || c.right)) {
    return { go: false, key: c.left && c.right ? "achtenLR" : c.left ? "achtenL" : "achtenR", why: `Vorfahrt achten: Das Auto von ${c.left && c.right ? "links und rechts" : c.left ? "links" : "rechts"} hat Vorfahrt.` };
  }
  if (c.control === "rvl" && c.right) return { go: false, key: "rvlR", why: "Rechts vor links: Das Auto von rechts darf zuerst fahren." };
  if (c.turn === "left" && c.oncoming) return { go: false, key: "leftOnc", why: "Du biegst links ab: Der Gegenverkehr fährt geradeaus und darf zuerst fahren." };
  if (c.turn !== "straight" && c.ped) return { go: false, key: "turnPed", why: "Du biegst ab: Fußgänger, die über diese Straße gehen, dürfen zuerst gehen." };

  // Driving is right. Say why, from the rule that let the learner go.
  if (c.control === "gruen") return { go: true, key: "gruen", why: "Grüne Ampel, und niemand hat Vorrang vor dir: Fahr weiter." };
  if (c.control === "hauptstrasse" || c.control === "naechste") {
    const sign = c.control === "hauptstrasse" ? "Vorfahrtstraße" : "Vorfahrt an der nächsten Kreuzung";
    return { go: true, key: `${c.control === "hauptstrasse" ? "hs" : "nx"}${c.left || c.right ? "Busy" : "Free"}`, why: c.left || c.right
      ? `${sign}: Du hast Vorfahrt, die anderen warten. Unnötig warten verwirrt den Verkehr.`
      : `${sign}: Du hast Vorfahrt. Fahr weiter.` };
  }
  if (c.control === "rvl") {
    return { go: true, key: c.left ? "rvlL" : "rvlFree", why: c.left
      ? "Rechts vor links: Das Auto kommt von links – es muss dich durchlassen."
      : "Rechts vor links, aber von rechts kommt niemand: Du darfst fahren." };
  }
  return { go: true, key: "achtenFree", why: "Vorfahrt achten – aber die Kreuzung ist frei: Du darfst fahren." };
}

/** The lesson that explains a crossing's rule. */
export function lessonOf(c) {
  if (c.blue || ["rot", "gruen", "gelb", "pfeil"].includes(c.control)) return "ampel-polizei";
  if (c.control === "zebra" || (c.ped && c.turn !== "straight")) return "fussgaenger-rad-bus";
  return "vorfahrt";
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

/**
 * A random crossing. Roughly half say „fahren“, half „warten“, so pressing one button all the
 * time does not win. The first few are the plain sign cases; turns and extras come later.
 * @param {number} n how many crossings came before (0-based)
 * @param {() => number} rnd
 */
export function makeCrossing(n, rnd = Math.random) {
  const early = n < 4;
  const control = early
    ? pick(["rvl", "rvl", "hauptstrasse", "achten", "stop", "rot", "gruen", "kreisel"], rnd)
    : pick(["rvl", "rvl", "hauptstrasse", "naechste", "achten", "achten", "stop", "rot", "gruen", "gruen", "zebra",
      "kreisel", "kreisel", "gelb", "pfeil", "bahn", "eng208", "eng308"], rnd);
  const c = { control, turn: "straight", right: false, left: false, oncoming: false, ped: false, blue: null, train: false };
  if (control === "zebra") {
    c.ped = rnd() < 0.55;
    return c;
  }
  // The new ones carry only what their rule asks about.
  if (control === "kreisel") { c.left = rnd() < 0.5; return c; }
  if (control === "gelb") return c;
  if (control === "pfeil") { c.turn = "right"; return c; }
  if (control === "bahn") { c.train = rnd() < 0.5; return c; }
  if (control === "eng208" || control === "eng308") { c.oncoming = rnd() < 0.6; return c; }
  if (!early) c.turn = pick(["straight", "straight", "left", "right"], rnd);
  // Lights: the cross traffic stands at its red, so it is never „there“ for the rules.
  const lights = control === "rot" || control === "gruen";
  if (!lights) {
    c.right = rnd() < 0.5;
    c.left = rnd() < 0.45;
  }
  c.oncoming = rnd() < (c.turn === "left" ? 0.55 : 0.35);
  if (c.turn !== "straight") c.ped = rnd() < 0.35;
  // Now and then an ambulance from the side, once the learner knows the basics.
  if (!early && rnd() < 0.08) c.blue = rnd() < 0.5 ? "left" : "right";
  return c;
}

/**
 * A crossing for the same rule as `c` (same sign, same explanation), drawn afresh: other cars,
 * other turn or other side. Brings a missed crossing back. Falls back to `c` itself.
 */
export function similar(c, rnd = Math.random) {
  const key = decide(c).key;
  for (let i = 0; i < 300; i++) {
    const d = makeCrossing(10, rnd);
    if (d.control === c.control && decide(d).key === key && !d.blue === !c.blue) return d;
  }
  return { ...c };
}
