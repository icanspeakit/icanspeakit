// Site verification and IndexNow. Domain-level verification is enough, so only the hub's
// pages carry these tags. An empty value renders no tag.
//   Bing:   Bing Webmaster Tools → Add site → HTML meta tag → the content="…" value.
//   Google: Search Console → URL-prefix property → HTML tag → the content="…" value.
// (Google's Domain property uses a DNS TXT record instead and needs no tag.)
export const BING_VERIFICATION = import.meta.env.PUBLIC_BING_VERIFICATION ?? '';
export const GOOGLE_VERIFICATION = import.meta.env.PUBLIC_GOOGLE_VERIFICATION ?? '';

// IndexNow key: the file public/<key>.txt must exist and contain the key (scripts/indexnow.mjs).
export const INDEXNOW_KEY = '00efb5e51d6717a1ceb470fb989cb504';
