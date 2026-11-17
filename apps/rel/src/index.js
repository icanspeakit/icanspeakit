// PostHog through our own domain: the browser sends analytics to icanspeak.it/rel/..., and
// this Worker forwards it to PostHog EU, so blockers that drop *.posthog.com no longer
// swallow events. "/rel" because "ingest" and "posthog" are on blocklists. Same idea as
// deutschacademy's src/pages/rel/[...path].ts. Consent is unchanged (apps/*/src/lib/analytics.js);
// the data still lands in PostHog EU (Frankfurt).
//
// What is passed on: method, path, query, body, content type and the visitor's IP
// (x-forwarded-for). The IP matters: PostHog's cookieless mode counts visitors with a hash
// of IP + user agent; without it every visitor would be one person in a Cloudflare data
// centre. What is NOT passed on: our cookies and Cloudflare's own headers.

const API = "https://eu.i.posthog.com";
const ASSETS = "https://eu-assets.i.posthog.com";

// Request headers that describe this hop, not the visitor's request.
const DROP_IN = ["host", "cookie", "connection", "content-length", "accept-encoding", "x-forwarded-host", "x-forwarded-proto", "x-real-ip", "forwarded"];
const DROP_OUT = ["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/rel\/?/, "");
    if (!path) return new Response(null, { status: 404 });
    const base = path.startsWith("static/") ? ASSETS : API;
    const target = `${base}/${path}${url.search}`;

    const headers = new Headers(request.headers);
    for (const h of DROP_IN) headers.delete(h);
    for (const h of [...headers.keys()]) if (h.startsWith("cf-")) headers.delete(h);
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) headers.set("x-forwarded-for", ip);

    const hasBody = !["GET", "HEAD"].includes(request.method);
    let res;
    try {
      res = await fetch(target, {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
        redirect: "manual",
      });
    } catch {
      return new Response(null, { status: 502 });
    }

    const out = new Headers(res.headers);
    for (const h of DROP_OUT) out.delete(h);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  },
};
