// The part of a form the eye should land on, marked in a grammar table cell with braces:
// "schnell{er}", "am schnell{sten}". Table cells are plain strings, and stay plain: the
// braces are the only markup they can carry — no HTML gets through, everything else is
// escaped. Renderers that cannot style (PDF, plain text) strip them with stripMarks().

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const hasMarks = (s) => /\{[^{}]+\}/.test(String(s));

export const stripMarks = (s) => String(s).replace(/[{}]/g, "");

/** "am schnell{sten}" → `am schnell<span class="ct-end">sten</span>`, the rest escaped. */
export const endingHtml = (s) => esc(s).replace(/\{([^{}]+)\}/g, '<span class="ct-end">$1</span>');
