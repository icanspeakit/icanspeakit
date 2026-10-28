// Keeping a quiz's result: printed (or saved as a PDF from the print dialog) and as an image —
// for the teacher after a class game, and for a learner after a solo round, who has no other
// record of it. Used by the projector's Siegerehrung (host.js) and the phone's end screen
// (player.js).
//
//   mountKeep(area, { name })
//     area: the screen to keep. Its [data-keep-print] and [data-keep-image] buttons are wired
//     up; everything marked [data-keep-skip] (buttons, tabs) stays out of print and image.
//     Panels hidden behind tabs ([data-keep-panel]) are shown for the moment of keeping, so
//     the ranking and the questions both end up on paper.

function print(area) {
  document.documentElement.classList.add("lq-printing");
  area.setAttribute("data-print-area", "");
  const panels = [...area.querySelectorAll("[data-keep-panel]")];
  const was = panels.map((p) => p.hidden);
  panels.forEach((p) => (p.hidden = false));
  const done = () => {
    document.documentElement.classList.remove("lq-printing");
    area.removeAttribute("data-print-area");
    panels.forEach((p, i) => (p.hidden = was[i]));
    removeEventListener("afterprint", done);
  };
  addEventListener("afterprint", done);
  window.print();
}

async function image(area, name, btn) {
  btn.disabled = true;
  // A still copy of the screen, both panels open and the buttons out, laid out off screen at
  // the screen's own width: the live screen is mid-animation and stacks its panels.
  const copy = area.cloneNode(true);
  copy.querySelectorAll("[data-keep-skip]").forEach((n) => n.remove());
  copy.querySelectorAll("[data-keep-panel]").forEach((n) => (n.hidden = false));
  copy.classList.add("lq-keep-copy");
  copy.style.cssText = `position:fixed;left:-10000px;top:0;width:${area.clientWidth}px;padding:20px 16px;`;
  area.parentElement.append(copy);
  try {
    const { domToBlob } = await import("modern-screenshot");
    const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
    const blob = await domToBlob(copy, { scale: 2, backgroundColor: bg, type: "image/png", style: { position: "static", left: "0" } });
    const file = new File([blob], `${name}.png`, { type: "image/png" });
    // A phone: the share sheet (save to photos, send in a chat). Elsewhere a download.
    if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {});
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  } finally {
    copy.remove();
    btn.disabled = false;
  }
}

export function mountKeep(area, { name = "quiz-ergebnis" } = {}) {
  if (!area) return;
  const stamp = () => `${name}-${new Date().toISOString().slice(0, 10)}`;
  area.querySelector("[data-keep-print]")?.addEventListener("click", () => print(area));
  const img = area.querySelector("[data-keep-image]");
  img?.addEventListener("click", () => image(area, stamp(), img));
}
