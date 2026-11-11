// Dev-only router: one address for the whole site, the same split Cloudflare makes in production.
//   /english/*  -> apps/english   (astro dev, port 4521)
//   /spanish/*  -> apps/spanish   (astro dev, port 4522)
//   everything else -> apps/hub   (astro dev, port 4520)
// Run:  node scripts/dev-proxy.mjs   (listens on http://localhost:4500)
// Paths are passed through unchanged, because each app already serves under its base path.
// Built-ins only. Forwards WebSocket upgrades so Astro's live reload keeps working.
import http from 'node:http';

const PORT = Number(process.env.PORT || 4500);
const ROUTES = [
  { prefix: '/english', target: 4521 },
  { prefix: '/spanish', target: 4522 },
];
const DEFAULT_TARGET = 4520; // hub

function pick(url) {
  const path = url.split('?')[0];
  for (const r of ROUTES) {
    if (path === r.prefix || path.startsWith(r.prefix + '/')) return r.target;
  }
  return DEFAULT_TARGET;
}

function forward(req, res) {
  const port = pick(req.url);
  const upstream = http.request(
    { host: '127.0.0.1', port, method: req.method, path: req.url, headers: { ...req.headers, host: `localhost:${port}` } },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    }
    res.end(`dev-proxy: nothing listening on port ${port} (${err.code}). Start that app's dev server.\n`);
  });
  req.pipe(upstream);
}

const server = http.createServer(forward);

server.on('upgrade', (req, socket, head) => {
  const port = pick(req.url);
  const upstream = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers: { ...req.headers, host: `localhost:${port}` } });
  upstream.on('upgrade', (up, upSocket, upHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(up.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
        '\r\n\r\n',
    );
    if (upHead && upHead.length) socket.write(upHead);
    if (head && head.length) upSocket.write(head);
    upSocket.pipe(socket).pipe(upSocket);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
});

server.listen(PORT, () => {
  console.log(`dev-proxy on http://localhost:${PORT}  /english -> 4521, /spanish -> 4522, rest -> 4520`);
});
