// „Als Aufgabe stellen“ on /lehrkraefte/stundenplan (SCHUELER-STUNDE Tier 3): one Stunde of the
// plan, with the plan's exact key (its count and length of Stunden), as homework for a class.
// The class walks it alone on /stunde; it is done when a student finishes the Stunde
// (lernseite.js logs one attempt with the ref, aufgabenStatus.js counts it).
//
// A small modal <dialog>: class, due date, „Aufgabe stellen“. Browser only; the button that
// opens it is shown to teacher accounts only (stundenplan.astro), RLS decides the rest.
import { stundeRef } from "./lernen.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DAY = 86_400_000;

let dlg = null;

function ensureStyle() {
  if (document.getElementById("sa-style")) return;
  const st = document.createElement("style");
  st.id = "sa-style";
  st.textContent = `
    .sa { width: min(420px, calc(100vw - 32px)); padding: 0; border: 1px solid var(--border); border-radius: 16px; background: var(--surface-card); color: var(--ink); box-shadow: 0 18px 40px rgb(15 23 42 / .22); }
    .sa::backdrop { background: rgb(15 23 42 / .4); }
    .sa form, .sa-body { display: grid; gap: 12px; padding: 18px; }
    .sa h2 { margin: 0; font-size: 1.1rem; }
    .sa p { margin: 0; color: var(--muted); font-size: .9rem; line-height: 1.45; }
    .sa label { display: grid; gap: 4px; font-size: .9rem; font-weight: 600; }
    .sa select, .sa input { min-height: 40px; padding: 0 10px; border: 1px solid var(--border-strong, var(--border)); border-radius: 10px; background: var(--surface); color: var(--ink); font: inherit; font-weight: 400; }
    .sa-row { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
    .sa-err { color: var(--danger, #b42318) !important; }
    .sa a { color: var(--brand-blue-dark); font-weight: 600; }`;
  document.head.append(st);
}

/** key: the Stunde's plan key; name: "Stunde 2: Dativ" (the task's title). */
export async function openStundeAufgabe({ key, name }) {
  ensureStyle();
  dlg?.remove();
  dlg = document.createElement("dialog");
  dlg.className = "sa";
  dlg.setAttribute("aria-labelledby", "sa-title");
  dlg.innerHTML = `<div class="sa-body"><h2 id="sa-title">Als Aufgabe stellen</h2><p>Einen Moment …</p></div>`;
  document.body.append(dlg);
  dlg.addEventListener("close", () => dlg?.remove());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.showModal();

  let klassen = [];
  let api;
  try {
    const [k, a] = await Promise.all([import("../klassen.js"), import("../aufgabenStatus.js")]);
    api = { ...k, ...a };
    klassen = (await k.meineKlassen()).filter((x) => !x.archiviert);
  } catch {
    dlg.innerHTML = `<div class="sa-body"><h2 id="sa-title">Als Aufgabe stellen</h2><p class="sa-err">Das hat gerade nicht geklappt. Prüfe die Internetverbindung.</p><div class="sa-row"><button type="button" class="lp-btn lp-btn--outline" data-sa-close>Schließen</button></div></div>`;
    dlg.querySelector("[data-sa-close]").addEventListener("click", () => dlg.close());
    return;
  }
  if (!klassen.length) {
    dlg.innerHTML = `<div class="sa-body"><h2 id="sa-title">Als Aufgabe stellen</h2>
      <p>Dafür brauchst du eine Klasse. Die Lernenden treten mit einem Code bei.</p>
      <div class="sa-row"><button type="button" class="lp-btn lp-btn--outline" data-sa-close>Schließen</button><a class="lp-btn lp-btn--primary" href="/lehrkraefte/klassen">Klasse anlegen</a></div></div>`;
    dlg.querySelector("[data-sa-close]").addEventListener("click", () => dlg.close());
    return;
  }
  const due = api.berlinTag(new Date(Date.now() + 7 * DAY).toISOString());
  dlg.innerHTML = `<form method="dialog" novalidate>
      <h2 id="sa-title">Als Aufgabe stellen</h2>
      <p><b>${esc(name)}</b><br>Die Klasse macht die Stunde allein, Schritt für Schritt. Erledigt ist sie, wenn jemand sie bis zum Ende geschafft hat; du siehst pro Person, wie weit sie ist.</p>
      <label>Klasse<select data-sa-klasse>${klassen.map((k) => `<option value="${esc(k.id)}">${esc(k.name)}</option>`).join("")}</select></label>
      <label>Fällig am<input type="date" data-sa-due value="${due}" min="${api.berlinTag(new Date().toISOString())}"></label>
      <p class="sa-err" data-sa-err role="alert"></p>
      <div class="sa-row"><button type="button" class="lp-btn lp-btn--outline" data-sa-close>Abbrechen</button><button type="submit" class="lp-btn lp-btn--primary" data-sa-go>Aufgabe stellen</button></div>
    </form>`;
  dlg.querySelector("[data-sa-close]").addEventListener("click", () => dlg.close());
  dlg.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = dlg.querySelector("[data-sa-err]");
    const day = dlg.querySelector("[data-sa-due]").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return (err.textContent = "Wähl ein Datum.");
    const klasseId = dlg.querySelector("[data-sa-klasse]").value;
    const go = dlg.querySelector("[data-sa-go]");
    go.disabled = true;
    err.textContent = "";
    try {
      await api.aufgabeStellen({ klasseId, ref: stundeRef(key), titel: name, faelligAt: api.berlinTagesende(day) });
      const kname = klassen.find((k) => k.id === klasseId)?.name ?? "";
      dlg.innerHTML = `<div class="sa-body"><h2 id="sa-title">Aufgabe gestellt</h2>
        <p>${esc(kname)} sieht „${esc(name)}“ unter „Übungen“ und im Konto.</p>
        <div class="sa-row"><button type="button" class="lp-btn lp-btn--outline" data-sa-close>Schließen</button><a class="lp-btn lp-btn--primary" href="/lehrkraefte/klassen/klasse?id=${encodeURIComponent(klasseId)}">Zur Klasse</a></div></div>`;
      dlg.querySelector("[data-sa-close]").addEventListener("click", () => dlg.close());
    } catch (x) {
      go.disabled = false;
      err.textContent = x?.code === "limit" ? "Diese Klasse hat schon 200 Aufgaben. Lösch alte, dann geht es wieder." : "Das hat gerade nicht geklappt. Versuch es noch einmal.";
    }
  });
}
