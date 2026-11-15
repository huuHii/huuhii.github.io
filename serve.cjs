const http = require('node:http');
const { createReadStream } = require('node:fs');
const { realpath, stat } = require('node:fs/promises');
const path = require('node:path');

const host = '127.0.0.1';
const port = Number(process.argv[2] ?? 8000);
const types = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
};

async function start() {
  const root = await realpath(path.join(__dirname, 'nopeustesti'));
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let file;
    let info;
    try {
      const url = new URL(request.url, `http://${host}`);
      const pathname = decodeURIComponent(url.pathname);
      const target = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      const relative = target.slice(1);
      if (relative.split(/[\\/]/).some(part => part.startsWith('.')) || /[\\:]/.test(relative)) {
        response.writeHead(404).end();
        return;
      }
      file = await realpath(path.join(root, relative));
      if (!file.startsWith(root + path.sep)) {
        response.writeHead(404).end();
        return;
      }
      info = await stat(file);
      if (!info.isFile()) {
        response.writeHead(404).end();
        return;
      }
    } catch {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  });

  server.on('error', error => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`Nopeustesti is running at http://${host}:${server.address().port}/`);
  });
}

start().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
