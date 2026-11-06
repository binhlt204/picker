// Cổng gộp: 1 địa chỉ duy nhất cho web (3000) + API/socket (3001), để Cloudflare Tunnel chỉ cần trỏ vào đây.
// Chạy: node scripts/gateway.js   (mặc định lắng nghe cổng 8080)
const http = require('http');
const net = require('net');

const PORT = Number(process.env.GATEWAY_PORT || 8080);
const WEB = Number(process.env.WEB_PORT || 3000);
const API = Number(process.env.API_PORT || 3001);
const isApi = (url = '') => /^\/(api|socket\.io|download-app|health)(\/|\?|$)/.test(url);
const target = (url) => (isApi(url) ? API : WEB);

const server = http.createServer((req, res) => {
  const up = http.request(
    { host: '127.0.0.1', port: target(req.url), path: req.url, method: req.method, headers: req.headers },
    (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); }
  );
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Bad gateway'); });
  req.pipe(up);
});

// WebSocket (socket.io, và HMR của Next khi chạy dev)
server.on('upgrade', (req, socket, head) => {
  const up = net.connect(target(req.url), '127.0.0.1', () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    up.write(lines.join('\r\n') + '\r\n\r\n');
    if (head && head.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, () => console.log(`Gateway :${PORT} -> web :${WEB}, api :${API}`));
