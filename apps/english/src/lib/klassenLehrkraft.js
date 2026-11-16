// /teachers/classes — the teacher's list of classes (KLASSEN-TIERED-PROMPT.md, Tier 1).
// Data goes through src/lib/klassen.js; this file only draws and wires the buttons.
//
// The whole list is redrawn after every change. Which classes have their QR code or member
// list open is kept in two sets, so a redraw doesn't fold anything the teacher opened.
import QRCode from "qrcode";
import { currentUser, isTeacher, setTeacher } from "./liveQuiz/custom.js";
import { loadText, t } from "./liveQuiz/text.js";
import {
  MAX_MITGLIEDER, codeErneuern, joinLink, klasseAnlegen, klasseArchivieren, klasseLoeschen,
  meineKlassen, mitgliedEntfernen, mitglieder,
} from "./klassen.js";
import { currentPath, BASE_PATH } from "./paths.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const datum = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export async function mountKlassen(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  let mounted = false;
  await loadText(() => { if (mounted) render(); });

  /* -------------------------------------------------------------- who ---- */
  $("[data-signin-link]").href = `${BASE_PATH}/anmelden?next=${encodeURIComponent(currentPath() + location.search)}`;
  let user = await currentUser();
  if (!user) return gate("signin");
  if (!isTeacher(user)) {
    gate("teacher");
    await new Promise((resolve) => {
      $("[data-teacher-on]").addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        try {
          user = await setTeacher(true);
          resolve();
        } catch {
          e.currentTarget.disabled = false;
          $("[data-teacher-error]").textContent = t("qb.error.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal.");
        }
      });
    });
  }
  gate("ok");
  mounted = true;

  /* ------------------------------------------------------------ state ---- */
  let klassen = [];
  const shareOpen = new Set();
  const membersOpen = new Map(); // klasse id → members[] (or null while loading)
  const qrCache = new Map(); // code → svg
  const status = (msg) => { $("[data-status]").textContent = msg; };
  const fail = (err, key = "kl.t.err.generic", de = "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal.") => {
    console.error(err);
    status(t(key, de));
  };

  async function load() {
    try {
      klassen = await meineKlassen();
    } catch (err) {
      klassen = [];
      fail(err, "kl.t.err.load", "Deine Klassen konnten nicht geladen werden.");
    }
    render();
  }

  /* ----------------------------------------------------------- render ---- */
  const countText = (k) => t("kl.t.count", "{n} / {max} Personen", { n: k.mitglieder, max: MAX_MITGLIEDER });

  function card(k) {
    const head = `
      <div class="kl-class-head">
        <h3>${esc(k.name)}</h3>
        ${k.niveau ? `<span class="kl-badge">${esc(k.niveau)}</span>` : ""}
        <span class="kl-count">${esc(countText(k))}</span>
      </div>`;
    if (k.archiviert) {
      return `
        <li class="lq-card kl-class kl-class--archived" data-id="${k.id}">
          ${head}
          <div class="kl-row">
            <a class="lq-btn lq-btn--ghost" href="${BASE_PATH}/teachers/classes/class?id=${k.id}">${esc(t("kl.t.open", "Übersicht"))}</a>
            <button type="button" class="lq-btn lq-btn--ghost" data-act="unarchive">${esc(t("kl.t.unarchive", "Zurückholen"))}</button>
            <button type="button" class="lq-btn lq-btn--quiet" data-act="delete">${esc(t("kl.t.delete", "Klasse löschen"))}</button>
          </div>
        </li>`;
    }
    const open = shareOpen.has(k.id);
    const members = membersOpen.get(k.id);
    const link = joinLink(k.code);
    return `
      <li class="lq-card kl-class" data-id="${k.id}">
        ${head}
        <div class="kl-code">
          <span class="kl-muted">${esc(t("kl.t.code", "Code"))}</span>
          <span class="kl-code-big" aria-label="${esc(k.code.split("").join(" "))}">${esc(k.code)}</span>
          <button type="button" class="qb-link" data-act="share" aria-expanded="${open}">${esc(open ? t("kl.t.shareHide", "QR-Code ausblenden") : t("kl.t.share", "QR-Code und Link zeigen"))}</button>
        </div>
        <div class="kl-share" ${open ? "" : "hidden"}>
          <div class="kl-qr" data-qr="${esc(k.code)}" role="img" aria-label="${esc(t("kl.t.qrAlt", "QR-Code zum Beitreten"))}">${qrCache.get(k.code) ?? ""}</div>
          <p class="kl-link">${esc(link)}</p>
          <button type="button" class="lq-btn lq-btn--ghost" data-act="copy">${esc(t("kl.t.copy", "Link kopieren"))}</button>
        </div>
        <div class="kl-row">
          <a class="lq-btn lq-btn--primary" href="${BASE_PATH}/teachers/classes/class?id=${k.id}">${esc(t("kl.t.open", "Übersicht"))}</a>
          <button type="button" class="lq-btn lq-btn--ghost" data-act="members" aria-expanded="${!!members}">${esc(t("kl.t.members", "Mitglieder"))}</button>
          <button type="button" class="lq-btn lq-btn--quiet" data-act="renew">${esc(t("kl.t.renew", "Code erneuern"))}</button>
          <button type="button" class="lq-btn lq-btn--quiet" data-act="archive">${esc(t("kl.t.archive", "Archivieren"))}</button>
        </div>
        ${members === undefined ? "" : memberList(members)}
      </li>`;
  }

  function memberList(list) {
    if (list === null) return `<p class="kl-muted">${esc(t("kl.loading", "Einen Moment …"))}</p>`;
    if (!list.length) return `<p class="kl-muted">${esc(t("kl.t.noMembers", "Noch niemand beigetreten. Zeig den QR-Code oder gib den Code weiter: {link}", { link: `${location.host}/beitreten` }))}</p>`;
    return `<ul class="kl-members">${list
      .map((m) => `
        <li>
          <span>${esc(m.anzeigename)} <small>· ${esc(t("kl.t.joined", "seit {date}", { date: datum(m.beigetreten_at) }))}</small></span>
          <button type="button" class="qb-link" data-act="remove" data-user="${m.user_id}" data-name="${esc(m.anzeigename)}">${esc(t("kl.t.remove", "Entfernen"))}</button>
        </li>`)
      .join("")}</ul>`;
  }

  function render() {
    const active = klassen.filter((k) => !k.archiviert);
    const archived = klassen.filter((k) => k.archiviert);
    $("[data-list]").innerHTML = active.map(card).join("");
    $("[data-empty]").hidden = active.length > 0;
    $("[data-archive]").hidden = archived.length === 0;
    $("[data-archive-summary]").textContent = t("kl.t.archived", "Archiviert ({n})", { n: archived.length });
    $("[data-archive-list]").innerHTML = archived.map(card).join("");
    drawQrs();
  }

  async function drawQrs() {
    for (const el of root.querySelectorAll(".kl-share:not([hidden]) [data-qr]")) {
      const code = el.dataset.qr;
      if (!qrCache.has(code)) {
        qrCache.set(code, await QRCode.toString(joinLink(code), { type: "svg", margin: 1, errorCorrectionLevel: "M" }));
      }
      el.innerHTML = qrCache.get(code);
    }
  }

  /* ---------------------------------------------------------- actions ---- */
  const form = $("[data-new]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameIn = $("[data-new-name]");
    const error = $("[data-new-error]");
    error.textContent = "";
    if (!nameIn.value.trim()) {
      error.textContent = t("kl.t.err.name", "Gib der Klasse einen Namen.");
      return nameIn.focus();
    }
    const btn = $("[data-new-submit]");
    btn.disabled = true;
    try {
      const k = await klasseAnlegen({ name: nameIn.value, niveau: $("[data-new-level]").value || null });
      klassen.unshift(k);
      shareOpen.add(k.id);
      form.reset();
      render();
      status(t("kl.t.created", "Klasse „{name}“ angelegt. Code: {code}", { name: k.name, code: k.code }));
    } catch (err) {
      if (err?.code === "limit") error.textContent = t("kl.t.err.limit", "Du hast schon 20 aktive Klassen. Archiviere eine, dann geht es wieder.");
      else { console.error(err); error.textContent = t("kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."); }
    } finally {
      btn.disabled = false;
    }
  });

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    const li = btn?.closest("[data-id]");
    if (!btn || !li) return;
    const id = li.dataset.id;
    const k = klassen.find((x) => x.id === id);
    if (!k) return;
    status("");

    switch (btn.dataset.act) {
      case "share":
        shareOpen.has(id) ? shareOpen.delete(id) : shareOpen.add(id);
        return render();

      case "copy":
        try {
          await navigator.clipboard.writeText(joinLink(k.code));
          status(t("kl.t.copied", "Link kopiert."));
        } catch {
          status(joinLink(k.code));
        }
        return;

      case "members":
        if (membersOpen.has(id)) {
          membersOpen.delete(id);
          return render();
        }
        membersOpen.set(id, null);
        render();
        try {
          const list = await mitglieder(id);
          membersOpen.set(id, list);
          k.mitglieder = list.length;
        } catch (err) {
          membersOpen.delete(id);
          fail(err);
        }
        return render();

      case "remove": {
        const name = btn.dataset.name;
        if (!confirm(t("kl.t.confirm.remove", "{name} aus der Klasse entfernen? Du siehst dann nichts mehr von dieser Person. Mit dem Code kann sie wieder beitreten.", { name }))) return;
        btn.disabled = true;
        try {
          await mitgliedEntfernen(id, btn.dataset.user);
          const list = (membersOpen.get(id) ?? []).filter((m) => m.user_id !== btn.dataset.user);
          membersOpen.set(id, list);
          k.mitglieder = list.length;
          render();
          status(t("kl.t.removed", "{name} entfernt.", { name }));
        } catch (err) {
          btn.disabled = false;
          fail(err);
        }
        return;
      }

      case "renew":
        if (!confirm(t("kl.t.confirm.renew", "Neuen Code erzeugen? Der alte Code funktioniert dann nicht mehr. Wer schon in der Klasse ist, bleibt drin."))) return;
        btn.disabled = true;
        try {
          k.code = await codeErneuern(id);
          shareOpen.add(id);
          render();
          status(t("kl.t.renewed", "Neuer Code: {code}", { code: k.code }));
        } catch (err) {
          btn.disabled = false;
          fail(err);
        }
        return;

      case "archive":
      case "unarchive": {
        const on = btn.dataset.act === "archive";
        btn.disabled = true;
        try {
          await klasseArchivieren(id, on);
          k.archiviert = on;
          shareOpen.delete(id);
          membersOpen.delete(id);
          render();
          status(on
            ? t("kl.t.archivedDone", "„{name}“ archiviert. Mit dem Code kann niemand mehr beitreten.", { name: k.name })
            : t("kl.t.unarchivedDone", "„{name}“ ist wieder aktiv.", { name: k.name }));
        } catch (err) {
          btn.disabled = false;
          if (err?.code === "limit") status(t("kl.t.err.limit", "Du hast schon 20 aktive Klassen. Archiviere eine, dann geht es wieder."));
          else fail(err);
        }
        return;
      }

      case "delete":
        if (!confirm(t("kl.t.confirm.delete", "„{name}“ endgültig löschen? Die Klasse und die Liste der Mitglieder sind dann weg.", { name: k.name }))) return;
        btn.disabled = true;
        try {
          await klasseLoeschen(id);
          klassen = klassen.filter((x) => x.id !== id);
          render();
          status(t("kl.t.deleted", "„{name}“ gelöscht.", { name: k.name }));
        } catch (err) {
          btn.disabled = false;
          fail(err);
        }
        return;
    }
  });

  await load();
}
