// Whether a grammar topic counts yet.
//
// New topics are drafted before Edgar has checked them (GRAMMAR-PROMPT.md, Part B). A draft
// gets its page, so it can be reviewed, but nothing that promises or plans treats it as
// real: not the topic count (inventory.js), the catalogue and the menus built on it, the
// guided run, the search index, the worksheet index or the PDFs. (Its own worksheet page
// exists, noindex, behind the page's „Drucken / PDF“, so the sheet can be reviewed too.) `"status": "geprueft"` in the
// topic's JSON is the one switch that changes that. No status at all means reviewed: every
// topic that existed before the field did has been checked.
export const REVIEWED = "geprueft";
export const DRAFT = "entwurf";

export const statusOf = (topic) => topic?.status ?? REVIEWED;
export const isReviewed = (topic) => statusOf(topic) === REVIEWED;
export const isDraft = (topic) => !isReviewed(topic);
