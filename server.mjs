/* Server statis kecil untuk live preview (bukan syarat: file juga jalan lewat file://) */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/markdown' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/karyawan') {          /* contoh API utk demo 5 */
    let sd = 777;
    const rnd = () => { sd |= 0; sd = sd + 0x6D2B79F5 | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ sd >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const D = ['Adi','Budi','Citra','Dewi','Eko','Fitri','Gilang','Hana','Indra','Joko','Kirana','Lukman','Maya','Nadia','Omar','Putri','Qori','Rina','Sari','Teguh'];
    const B = ['Saputra','Wijaya','Pratama','Nugroho','Setiawan','Hidayat','Kusuma','Ramadhan','Anggraini','Lestari','Susanto','Maulana','Permana','Halim','Siregar'];
    const DEP = ['Produksi','Keuangan','IT','Pemasaran','SDM','Logistik','QC','Riset','Legal','Umum'];
    const J = ['Staf','Senior Staf','Supervisor','Analis','Manajer','Koordinator'];
    const K = ['Depok','Jakarta','Bogor','Bekasi','Bandung','Semarang','Surabaya','Medan','Makassar'];
    const S = ['Aktif','Cuti','Probation','Resign'];
    const list = Array.from({ length: 300 }, (_, i) => ({
      id: i + 1, nama: pick(D) + ' ' + pick(B), dep: pick(DEP), jabatan: pick(J), kota: pick(K),
      gaji: (45 + Math.floor(rnd() * 275)) * 100000,
      masuk: new Date(2015 + Math.floor(rnd() * 10), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)).toISOString().slice(0, 10),
      stat: pick(S)
    }));
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(list));
    }, 250);
    return;
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try {
    const buf = await readFile(join(process.cwd(), path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(8080, '0.0.0.0', () => console.log('http://0.0.0.0:8080'));
