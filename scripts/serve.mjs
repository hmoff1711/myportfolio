import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.vcf': 'text/vcard; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  if (pathname === '/') { response.writeHead(302, { Location: '/myportfolio/' }); response.end(); return; }
  if (!pathname.startsWith('/myportfolio/')) { response.writeHead(404); response.end('Not found'); return; }
  let relative = pathname.slice('/myportfolio/'.length);
  if (!relative) relative = 'index.html';
  const path = resolve(root, relative);
  if (!path.startsWith(resolve(root) + sep) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  try {
    if (!(await stat(path)).isFile()) throw new Error('Not a file');
    const content = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Portfolio preview: http://127.0.0.1:${port}/myportfolio/`));

