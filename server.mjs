/* Server statis kecil untuk live preview (bukan syarat: file juga jalan lewat file://) */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/markdown' };

/* dataset 10k utk mode server-side (demo 6) */
let sd6 = 4242;
const rnd6 = () => { sd6 |= 0; sd6 = sd6 + 0x6D2B79F5 | 0; let t = Math.imul(sd6 ^ sd6 >>> 15, 1 | sd6); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ sd6 >>> 14) >>> 0) / 4294967296; };
const pick6 = a => a[Math.floor(rnd6() * a.length)];
const D6 = ['Adi','Budi','Citra','Dewi','Eko','Fitri','Gilang','Hana','Indra','Joko','Kirana','Lukman','Maya','Nadia','Omar','Putri','Qori','Rina','Sari','Teguh'];
const B6 = ['Saputra','Wijaya','Pratama','Nugroho','Setiawan','Hidayat','Kusuma','Ramadhan','Anggraini','Lestari','Susanto','Maulana','Permana','Halim','Siregar'];
const DEP6 = ['Produksi','Keuangan','IT','Pemasaran','SDM','Logistik','QC','Riset','Legal','Umum'];
const J6 = ['Staf','Senior Staf','Supervisor','Analis','Manajer','Koordinator'];
const K6 = ['Depok','Jakarta','Bogor','Bekasi','Bandung','Semarang','Surabaya','Medan','Makassar'];
const S6 = ['Aktif','Cuti','Probation','Resign'];
const BIG10 = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1, nama: pick6(D6) + ' ' + pick6(B6), dep: pick6(DEP6), jabatan: pick6(J6), kota: pick6(K6),
  gaji: (45 + Math.floor(rnd6() * 275)) * 100000,
  masuk: new Date(2015 + Math.floor(rnd6() * 10), Math.floor(rnd6() * 12), 1 + Math.floor(rnd6() * 28)).toISOString().slice(0, 10),
  stat: pick6(S6)
}));
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/halaman') {
    const P = url.searchParams;
    const page = Math.max(1, +P.get('page') || 1), size = +P.get('size') || 10;
    const sort = JSON.parse(P.get('sort') || '[]');
    const q = (P.get('q') || '').toLowerCase();
    const filters = JSON.parse(P.get('filters') || '{}');
    const rules = JSON.parse(P.get('rules') || '[]');
    const join = P.get('join') || 'AND';
    const lv = (r, k) => String(r[k] == null ? '' : r[k]).toLowerCase();
    const m1 = (r, f) => {
      const v = lv(r, f.f), t = String(f.q == null ? '' : f.q).toLowerCase();
      switch (f.op) {
        case 'eq': return v === t; case 'ne': return v !== t;
        case 'bw': return v.indexOf(t) === 0; case 'ew': return v.slice(-t.length) === t;
        case 'nn': return v !== ''; case 'nl': return v === '';
        case 'gt': return Number(r[f.f]) > Number(f.q); case 'ge': return Number(r[f.f]) >= Number(f.q);
        case 'lt': return Number(r[f.f]) < Number(f.q); case 'le': return Number(r[f.f]) <= Number(f.q);
        default: return v.indexOf(t) > -1;
      }
    };
    let list = BIG10;
    if (q) list = list.filter(r => Object.keys(r).some(k => lv(r, k).includes(q)));
    Object.keys(filters).forEach(k => { const f = filters[k]; list = list.filter(r => m1(r, { f: k, op: f.op, q: f.q })); });
    if (rules.length) list = list.filter(r => { const rs = rules.map(f => m1(r, f)); return join === 'OR' ? rs.some(Boolean) : rs.every(Boolean); });
    if (sort.length) {
      list = list.slice().sort((a, b) => {
        for (const [k2, d] of sort) { const x = a[k2], y = b[k2]; if (x < y) return -d; if (x > y) return d; }
        return 0;
      });
    }
    const total = list.length;
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ total, rows: list.slice((page - 1) * size, page * size) }));
    }, 200);
    return;
  }
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
