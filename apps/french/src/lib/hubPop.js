// The card pictures on a hub pop in, a group at a time, as the group scrolls into view
// (hub-pics.css). Each picture gets its place in the group as --i for the stagger. A group
// that is hidden (a level tab not chosen yet) pops when it is first shown and scrolled to.
// Without IntersectionObserver nothing is hidden in the first place: the CSS only hides
// pictures under .hub-anim, which is set here.
export function mountHubPop(root = document) {
  const groups = root.querySelectorAll("[data-hub-pop]");
  if (!groups.length || !("IntersectionObserver" in window)) return;
  groups.forEach((g) => g.querySelectorAll(".hub-pic img").forEach((img, i) => img.style.setProperty("--i", String(i))));
  document.documentElement.classList.add("hub-anim");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px" });
  groups.forEach((g) => io.observe(g));
}
