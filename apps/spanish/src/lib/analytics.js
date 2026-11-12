// Analytics: PostHog EU Cloud (Frankfurt), cookieless. Project "icanspeak" → 344818.
//
// cookieless_mode "always": PostHog writes nothing to the device (no cookie, no localStorage)
// and counts visitors server-side with a daily-rotating hash of IP + user agent. That needs
// no consent under §25 TDDDG, so there is no banner. The trade: no session replay, no person
// profiles, and a visitor is a new visitor every day.
//
// Needs "Cookieless server hash mode" switched ON in the PostHog project
// (Settings → Web analytics). Without it PostHog drops every event from this module.
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

// The consent API stays for callers written against the old banner version. There is no
// banner: cookieless needs no answer, and "granted" (cookies, replay) is never reached.
// intent.js checks da_consent itself, so its intent events stay off.
export function getConsent() { return "denied"; }
export function setConsent(_value) {}
export function resetConsent() {}
export function onConsentChange(_fn) { return () => {}; }

function loadStub() {
  // PostHog's official loader snippet: queues calls on window.posthog and fetches array.js
  // from eu-assets.i.posthog.com.
  /* eslint-disable */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing get_explicit_consent_status is_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  /* eslint-enable */
}

/** Call once per page. `app`: which part of icanspeak.it (hub, linguistics, english, …). */
export function initAnalytics(app) {
  if (!analyticsConfigured || window.__icsPostHog) return false;
  loadStub();
  window.posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-05-30",
    cookieless_mode: "always",
    person_profiles: "identified_only",
    disable_session_recording: true,
    capture_exceptions: true,
    // Every event, $pageview included, says which app sent it. (register() would need the
    // storage that cookieless mode does not have.)
    before_send: (event) => {
      if (event && app) event.properties = { ...event.properties, app };
      return event;
    },
  });
  window.__icsPostHog = true; // on window: array.js replaces the window.posthog stub
  return false;
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
