// The „Live-Quiz“ row in the phone drawer (NavDrawer.astro; the header button went 2026-10-28):
// on every page, for teachers only. It ships `hidden` with [data-lq-nav]; this unhides it once
// the account says teacher — the same lazy check as LiveQuizLink.astro, so a signed-out learner
// downloads nothing extra.
//
// Where it leads: the page's own quiz if it has one (a chapter page's LiveQuizLink goes to the
// builder with that chapter, a Lernset's DeckActions to the quiz with the set chosen), otherwise
// the quiz start. A new tab on a laptop: the quiz goes on the projector, this page stays open.
// Not on the quiz pages themselves.
import { withBase, currentPath } from "./paths.js";

const ON_QUIZ = /^\/(profesores\/cuestionario|juego)(\/|$)/;

function contextHref() {
  const a = document.querySelector(`[data-lq-link] a[href], a.da-btn[href^="${withBase("/profesores/cuestionario")}"]`);
  return a?.getAttribute("href") || withBase("/profesores/cuestionario");
}

function show(buttons) {
  const href = contextHref();
  buttons.forEach((b) => {
    b.href = href;
    // New tab only on a laptop (projector); on a phone it would look like a link that led nowhere.
    if (matchMedia("(min-width: 821px)").matches) {
      b.target = "_blank";
      b.rel = "noopener";
    }
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
