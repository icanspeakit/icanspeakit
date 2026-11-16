// Analytics: PostHog EU Cloud (Frankfurt). Project "icanspeak" → 344818.
//
// Consent decides the mode (since 2026-11-15; before, every visitor was cookieless and there
// was no replay and no banner):
//
//   no answer yet  → cookieless_mode "always": nothing written to the device; PostHog counts
//   "Decline"         visitors server-side with a daily-rotating hash of IP + user agent.
//                     That needs no consent under §25 TDDDG, so every visitor is still counted.
//   "Accept"       → cookieless_mode "on_reject" + opt-in: PostHog keeps its ph_* storage and
//                     records the session (session replay), inputs masked. Intent events
//                     (intent.js) are sent too.
//
// The mode is chosen when PostHog starts, so an answer given on a page takes effect from the
// next page on (PostHog cannot leave cookieless "always" mid-page). The answer itself is
// counted at once, as "consent_answer", cookieless if need be.
//
// The banner is ConsentBanner.astro (same file in every app). Our answer lives in
// localStorage["da_consent"] = "granted" | "denied" — remembering the answer to the question
// is the one storage the law allows without asking. One answer covers all of icanspeak.it
// (one origin). resetConsent() withdraws it (button on the privacy page).
//
// Needs, in the PostHog project: "Cookieless server hash mode" ON (Settings → Web analytics)
// and session replay ON. Without the first PostHog drops every cookieless event.
//
// The same file lives in every app (apps/*/src/lib/analytics.js, hub and linguistics
// included) so all of icanspeak.it reports into one project; `app` on each event says which.
// Keep the copies identical.
//
// Not sent: the Android app build (PUBLIC_TARGET=app), dev servers (localhost, LAN IPs), browsers flagged with ?intern=1 (?intern=0
// undoes it), pages inside an iframe, and pages with Layout's noTracking. For a local test
// run the dev server with PUBLIC_POSTHOG_DEV=on.

// The project token is public by design (it ships in every page's JavaScript anyway).
const KEY = import.meta.env.PUBLIC_POSTHOG_KEY || "phc_AMyBixjKF9itAAjG6FJ8rhzLwoWj9S7KgzPK4rCW8DpY";
const HOST = import.meta.env.PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const DEV_ON = import.meta.env.PUBLIC_POSTHOG_DEV === "on";
const CONSENT_KEY = "da_consent";
// Bump when the banner's text, buttons or timing change, so acceptance can be compared.
export const BANNER_VERSION = "ics-v1-2026-11";

function blocked() {
  if (typeof window === "undefined") return true;
  if (import.meta.env.PUBLIC_TARGET === "app") return true; // the Android app build
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = location.hostname;
  const local =
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(h) ||
    /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) ||
    h.endsWith(".local");
  if (local && !DEV_ON) return true;
  try {
    const flag = new URLSearchParams(location.search).get("intern");
    if (flag === "1") localStorage.setItem("da_internal", "1");
    else if (flag === "0") localStorage.removeItem("da_internal");
    if (localStorage.getItem("da_internal") === "1") return true;
  } catch {}
  return false;
}

export const analyticsConfigured = Boolean(KEY) && !blocked();

/** @returns {"granted" | "denied" | null} */
export function getConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

const listeners = new Set();
export function onConsentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** @param {"granted" | "denied"} value  @param {{ trigger?: string }} [opts] what showed the banner */
export function setConsent(value, { trigger } = {}) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {}
  try {
    window.posthog?.capture("consent_answer", {
      answer: value === "granted" ? "yes" : "no",
      trigger: trigger || "unknown",
      banner: BANNER_VERSION,
      ui_lang: document.documentElement.lang || "",
      mobile: window.matchMedia?.("(max-width: 820px)").matches ?? false,
    });
  } catch {}
  listeners.forEach((fn) => fn(value));
}

/** Withdraw: stop the recording, delete what PostHog stored, ask again. */
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {}
  try {
    window.posthog?.stopSessionRecording?.();
    window.posthog?.opt_out_capturing?.();
  } catch {}
  clearPostHogStorage();
  listeners.forEach((fn) => fn(null));
}

// PostHog's ph_* / __ph_* entries in both storages, and its cookies on host and domain.
function clearPostHogStorage() {
  try {
    for (const store of [localStorage, sessionStorage]) {
      Object.keys(store).filter((k) => k.startsWith("ph_") || k.startsWith("__ph_")).forEach((k) => store.removeItem(k));
    }
  } catch {}
  try {
    const host = location.hostname;
    const domains = ["", host, "." + host.split(".").slice(-2).join(".")];
    document.cookie
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter((n) => n.startsWith("ph_") || n.startsWith("__ph_"))
      .forEach((n) => domains.forEach((d) => {
        document.cookie = `${n}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
      }));
  } catch {}
}

function loadStub() {
  // PostHog's official loader snippet: queues calls on window.posthog and fetches array.js
  // from eu-assets.i.posthog.com.
  /* eslint-disable */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing get_explicit_consent_status is_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  /* eslint-enable */
}

/** Call once per page. `app`: which part of icanspeak.it (hub, linguistics, english, …).
 *  Returns true when the visitor has not answered yet, i.e. the banner may ask. */
export function initAnalytics(app) {
  if (!analyticsConfigured) return false;
  const consent = getConsent();
  if (window.__icsPostHog) return consent === null;
  loadStub();
  const granted = consent === "granted";
  window.posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-05-30",
    cookieless_mode: granted ? "on_reject" : "always",
    person_profiles: "identified_only",
    // Replays never show what someone typed into an exercise or a form.
    session_recording: { maskAllInputs: true },
    // Started in loaded() below, and only after "Accept".
    disable_session_recording: true,
    capture_exceptions: true,
    loaded: (ph) => {
      if (!granted) return;
      // PostHog's own opt-in flag, set once; captureEventName false: no "$opt_in" event.
      if (!ph.has_opted_in_capturing()) ph.opt_in_capturing({ captureEventName: false });
      ph.startSessionRecording();
    },
    // Every event, $pageview included, says which app sent it. (register() would need the
    // storage that cookieless mode does not have.) `tz` is the browser's time zone
    // (e.g. "Europe/Rome"): a rough region for reports, since GeoIP gets no IP in cookieless mode.
    before_send: (event) => {
      if (!event) return event;
      let tz;
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
      event.properties = { ...event.properties, ...(app && { app }), ...(tz && { tz }) };
      return event;
    },
  });
  window.__icsPostHog = true; // on window: array.js replaces the window.posthog stub
  return consent === null;
}

/** Custom event, e.g. track("exam_pack_open", { pack: "dele-a2" }). Ids and numbers only. */
export function track(event, props) {
  if (import.meta.env.DEV && typeof localStorage !== "undefined" && localStorage.getItem("ea-debug-track")) {
    console.debug("[track]", event, props ?? {});
  }
  try {
    window.posthog?.capture(event, props);
  } catch {}
}
