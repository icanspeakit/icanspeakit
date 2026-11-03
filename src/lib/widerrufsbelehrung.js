// The Widerrufsbelehrung and the Muster-Widerrufsformular — one source for /widerruf, the
// section in /terms and the purchase mail (emails/content.mjs), so the three
// can never say different things (WIDERRUF-14-TAGE-PROMPT.md).
//
// Since 2026-10-04 buyers keep the full 14-day right of withdrawal: no § 356 Abs. 5 BGB
// consent any more, a withdrawal means a full refund, no Wertersatz for digital content
// (§ 357a Abs. 3 BGB).
//
// The wording is the official model, word for word: Anlage 1 (Muster-Widerrufsbelehrung)
// and Anlage 2 (Muster-Widerrufsformular) zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB. Only the
// placeholders are filled: [1] "des Vertragsabschlusses" (digital content, not on a physical
// medium), [2] operator details from src/lib/legal.js, [3] the optional sentence on the
// electronic withdrawal on our website (/widerrufen). Do not rephrase it — not into the
// du-form either; the model protects best against Abmahnungen as it stands.
// TODO(legal): the lawyer confirms the filled-in model (docs/legal-drafts/offene-rechtsfragen.md).
import { LEGAL } from "./legal.js";

const SITE = "https://icanspeak.it/spanish";
const ADDRESS = `${LEGAL.operatorName}, icanspeak Spanish, ${LEGAL.operatorStreet}, ${LEGAL.operatorPostcode} ${LEGAL.operatorCity}`;

/** @type {{ heading: string, paragraphs: string[] }[]} plain text, no HTML */
export const BELEHRUNG = [
  {
    heading: "Widerrufsrecht",
    paragraphs: [
      "Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.",
      "Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.",
      `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${ADDRESS}, Telefon: ${LEGAL.operatorPhone}, E-Mail: ${LEGAL.contactEmail}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Sie können das Muster-Widerrufsformular oder eine andere eindeutige Erklärung auch auf unserer Webseite (${SITE}/widerrufen) elektronisch ausfüllen und übermitteln. Machen Sie von dieser Möglichkeit Gebrauch, so werden wir Ihnen unverzüglich (z. B. per E-Mail) eine Bestätigung über den Eingang eines solchen Widerrufs übermitteln.`,
      "Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.",
    ],
  },
  {
    heading: "Folgen des Widerrufs",
    paragraphs: [
      "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.",
    ],
  },
];

export const FORMULAR = {
  heading: "Muster-Widerrufsformular",
  intro: "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)",
  lines: [
    `An ${ADDRESS}, E-Mail: ${LEGAL.contactEmail}:`,
    "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)",
    "Bestellt am (*)/erhalten am (*)",
    "Name des/der Verbraucher(s)",
    "Anschrift des/der Verbraucher(s)",
    "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)",
    "Datum",
  ],
  foot: "(*) Unzutreffendes streichen.",
};

/** Where the Belehrung lives on its own, for links from Checkout, mails and buttons. */
export const BELEHRUNG_URL = `${SITE}/widerruf`;
