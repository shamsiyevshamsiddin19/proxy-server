const http = require('http');
const net = require('net');

const PORT = process.env.PROXY_PORT || 8080;
const AUTH_USER = process.env.PROXY_USER || '';
const AUTH_PASS = process.env.PROXY_PASS || '';
const AUTH_ENABLED = Boolean(AUTH_USER && AUTH_PASS);

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function checkAuth(req) {
  if (!AUTH_ENABLED) return true;
  const header = req.headers['proxy-authorization'];
  if (!header || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  return user === AUTH_USER && pass === AUTH_PASS;
}

function requireAuth(res) {
  res.writeHead(407, {
    'Proxy-Authenticate': 'Basic realm="proxy"',
    'Content-Type': 'text/plain',
  });
  res.end('407 Proxy Authentication Required');
}

// Oddiy HTTP so'rovlarni maqsad serverga uzatish
function handleHttpRequest(clientReq, clientRes) {
  if (!checkAuth(clientReq)) {
    requireAuth(clientRes);
    log('AUTH FAIL', clientReq.socket.remoteAddress, clientReq.url);
    return;
  }

  let target;
  try {
    target = new URL(clientReq.url);
  } catch {
    clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
    clientRes.end('400 Bad Request: to\'liq URL kerak (masalan http://example.com/)');
    return;
  }

  const options = {
    hostname: target.hostname,
    port: target.port || 80,
    path: target.pathname + target.search,
    method: clientReq.method,
    headers: { ...clientReq.headers },
  };
  delete options.headers['proxy-authorization'];
  delete options.headers['proxy-connection'];

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    log('ERROR', target.hostname, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    clientRes.end('502 Bad Gateway: ' + err.message);
  });

  clientReq.pipe(proxyReq);
  log('HTTP', clientReq.method, target.hostname + target.pathname);
}

// HTTPS uchun CONNECT tunnel (TLS trafik shifrlangan holida o'tkaziladi)
function handleConnect(clientReq, clientSocket, head) {
  if (!checkAuth(clientReq)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\n' +
      'Proxy-Authenticate: Basic realm="proxy"\r\n\r\n');
    clientSocket.end();
    log('AUTH FAIL (CONNECT)', clientSocket.remoteAddress, clientReq.url);
    return;
  }

  const [hostname, port] = clientReq.url.split(':');
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    log('CONNECT ERROR', hostname, err.message);
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  });

  clientSocket.on('error', () => serverSocket.destroy());
  log('CONNECT', hostname + ':' + (port || 443));
}

const server = http.createServer(handleHttpRequest);
server.on('connect', handleConnect);

server.listen(PORT, () => {
  log(`Proxy server ishga tushdi: http://0.0.0.0:${PORT}`);
  if (AUTH_ENABLED) {
    log('Autentifikatsiya YOQILGAN (PROXY_USER/PROXY_PASS o\'rnatilgan)');
  } else {
    log('Autentifikatsiya O\'CHIRILGAN. Yoqish uchun PROXY_USER va PROXY_PASS env o\'zgaruvchilarini o\'rnating.');
  }
});
