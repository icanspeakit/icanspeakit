// Level chips and search over rows already in the page — the library
// (lehrkraefte/arbeitsblaetter/index.astro) and the partner page (…/partner/index.astro).
// The search looks across all levels, so a teacher who types "Perfekt" finds it without
// guessing its level first. The chosen level is remembered for both pages.
export function mountIndexFilter(root) {
  if (!root) return;
  const rows = [...root.querySelectorAll("[data-abi-row]")];
  const chips = [...root.querySelectorAll("[data-abi-level]")];
  const search = root.querySelector("[data-abi-search]");
  const empty = root.querySelector("[data-abi-empty]");
  let level = "A1";
  try { level = localStorage.getItem("ab.level") || "A1"; } catch {}
  // A level remembered on the other page that this one has no chip for (C1): the first chip.
  if (chips.length && !chips.some((c) => c.dataset.abiLevel === level)) level = chips[0].dataset.abiLevel;

  const apply = () => {
    const q = search?.value.trim().toLowerCase() ?? "";
    let shown = 0;
    rows.forEach((r) => {
      const ok = q ? r.dataset.q.includes(q) : r.dataset.level === level;
      r.hidden = !ok;
      if (ok) shown++;
    });
    chips.forEach((c) => c.setAttribute("aria-pressed", String(!q && c.dataset.abiLevel === level)));
    root.querySelectorAll(".abi-sec").forEach((sec) => {
      const n = sec.querySelectorAll("[data-abi-row]:not([hidden])").length;
      sec.hidden = n === 0;
      const count = sec.querySelector("[data-abi-count]");
      if (count) count.textContent = String(n);
    });
    if (empty) empty.hidden = shown > 0;
  };
  chips.forEach((c) => c.addEventListener("click", () => {
    level = c.dataset.abiLevel;
    if (search) search.value = "";
    try { localStorage.setItem("ab.level", level); } catch {}
    apply();
  }));
  search?.addEventListener("input", apply);
  apply();
}
