import { currentPath } from "./paths.js";
// The „Live-Quiz“ row in the phone drawer (NavDrawer.astro; the header button went 2026-10-28):
// on every page, for teachers only. It ships `hidden` with [data-lq-nav]; this unhides it once
// the account says teacher — the same lazy check as LiveQuizLink.astro, so a signed-out learner
// downloads nothing extra.
//
// Where it leads: the page's own quiz if it has one (a chapter page's LiveQuizLink goes to the
// builder with that chapter, a Lernset's DeckActions to the quiz with the set chosen), otherwise
// the quiz start. Always a new tab: the quiz goes on the projector, this page stays open.
// Not on the quiz pages themselves.
const ON_QUIZ = /^\/(teachers\/quiz|game)(\/|$)/;

function contextHref() {
  const a = document.querySelector('[data-lq-link] a[href], a.da-btn[href^="/teachers/quiz"]');
  return a?.getAttribute("href") || "/teachers/quiz";
}

function show(buttons) {
  const href = contextHref();
  buttons.forEach((b) => {
    b.href = href;
    b.target = "_blank";
    b.rel = "noopener";
    b.hidden = false;
  });
}

const buttons = document.querySelectorAll("[data-lq-nav]");
if (buttons.length && !ON_QUIZ.test(currentPath()) && /(^|;\s*)sb-[^=]*-auth-token[^=]*=/.test(document.cookie)) {
  import("./liveQuiz/custom.js")
    .then(async ({ currentUser, isTeacher }) => {
      if (!isTeacher(await currentUser())) return;
      show(buttons);
      // a deck swapped in place (deckSwap.js) brings its own quiz link
      addEventListener("da:deck-swap", () => show(buttons));
    })
    // a failed check just leaves the button hidden
    .catch(() => {});
}
