/* Server statis kecil untuk live preview (bukan syarat: file juga jalan lewat file://) */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/markdown' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try {
    const buf = await readFile(join(process.cwd(), path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(8080, '0.0.0.0', () => console.log('http://0.0.0.0:8080'));
