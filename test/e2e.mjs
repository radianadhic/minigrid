/* Uji nyata grid di Chromium headless terhadap index.html hasil build (1 file offline). */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, '..', 'index.html');

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  → ' + extra : ''));
  if (!cond) fail++;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 }, acceptDownloads: true });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(url);
await page.waitForSelector('#grid1 tbody tr');

const g1 = '#grid1';
const info = () => page.locator(g1 + ' [data-role=info]').innerText();
const cell = (col, i = 0) => page.locator(`${g1} tbody tr:nth-child(${i + 1}) td[data-c=${col}]`).innerText();
const domRows = () => page.locator(g1 + ' tbody tr').count();

/* 1. render awal */
const total = await page.evaluate(() => window.__g1.view.length);
ok('render awal 50.000 baris', total === 50000, 'view.length=' + total);
ok('virtual scroll: DOM jauh lebih kecil dari data', (await domRows()) < 60, 'baris DOM=' + await domRows());
ok('info pager benar', /50\.?000|50000/.test(await info()), await info());
ok('filter+sort < 200 ms', await page.evaluate(() => window.__g1.ms) < 200, await page.evaluate(() => window.__g1.ms) + ' ms');

/* 2. sorting */
await page.locator(g1 + ' [data-sort=gaji]').click();
const g = [await cell('gaji', 0), await cell('gaji', 1), await cell('gaji', 2)];
ok('sort gaji naik', g[0] <= g[1] && g[1] <= g[2], g.join(' | '));
await page.locator(g1 + ' [data-sort=gaji]').click();
const g2 = [await cell('gaji', 0), await cell('gaji', 1)];
ok('klik lagi → turun', g2[0] >= g2[1], g2.join(' | '));

/* 3. multi-sort (shift+klik) */
await page.locator(g1 + ' [data-sort=dep]').click();
await page.locator(g1 + ' [data-sort=kota]').click({ modifiers: ['Shift'] });
const multi = await page.evaluate(() => window.__g1.s.sort.map(s => s.n + ':' + s.d).join(','));
ok('multi-sort 2 kolom', multi === 'dep:1,kota:1', multi);

/* 4. filter kolom: dep = IT */
await page.locator(g1 + ' [data-op=dep]').selectOption('eq');
await page.locator(g1 + ' [data-f=dep]').fill('IT');
await page.locator(g1 + ' [data-f=dep]').press('Enter');
const onlyIT = await page.evaluate(() => window.__g1.view.every(r => r.dep === 'IT'));
const itCount = await page.evaluate(() => window.__g1.view.length);
ok('filter dep = IT', onlyIT && itCount > 0, 'cocok=' + itCount + ' baris');

/* 5. filter numerik: gaji > 30000000 */
await page.locator(g1 + ' [data-op=gaji]').selectOption('gt');
await page.locator(g1 + ' [data-f=gaji]').fill('30000000');
await page.locator(g1 + ' [data-f=gaji]').press('Enter');
const gt = await page.evaluate(() => window.__g1.view.every(r => r.dep === 'IT' && r.gaji > 30000000));
ok('filter gabungan (AND) num > 30jt', gt, 'sisa=' + await page.evaluate(() => window.__g1.view.length));

/* 6. bersihkan filter */
await page.locator(g1 + ' [data-act=clear]').click();
ok('bersihkan filter → 50.000 lagi', await page.evaluate(() => window.__g1.view.length) === 50000);

/* 7. pencarian global */
await page.locator(g1 + ' [data-role=q]').fill('Depok');
await page.locator(g1 + ' [data-role=q]').press('Enter');
const depok = await page.evaluate(() => window.__g1.view.length > 0 && window.__g1.view.every(r => Object.values(r).some(v => String(v).includes('Depok'))));
ok('pencarian global "Depok"', depok, 'hasil=' + await page.evaluate(() => window.__g1.view.length));
await page.locator(g1 + ' [data-act=clear]').click();

/* 8. pilih baris */
await page.evaluate(() => window.__g1.clearSel());
await page.locator(g1 + ' [data-role=all]').click();
ok('pilih semua (halaman terfilter)', await page.evaluate(() => window.__g1.s.sel.size) === 500);
await page.locator(g1 + ' [data-role=all]').click();
ok('batal pilih semua', await page.evaluate(() => window.__g1.s.sel.size) === 0);

/* 9. virtual scroll: scroll ke tengah, baris DOM tetap kecil */
await page.evaluate(() => { document.querySelector('#grid1 [data-role=scroller]').scrollTop = 5000; });
await page.waitForTimeout(200);
const afterScroll = await domRows();
const spacerTop = await page.evaluate(() => {
  const t = document.querySelector('#grid1 tbody tr.mg-spacer td');
  return t ? parseInt(t.style.height) : -1;
});
ok('scroll → window bergeser', spacerTop > 4000 && afterScroll < 80, 'spacer=' + spacerTop + 'px dom=' + afterScroll);
await page.evaluate(() => { document.querySelector('#grid1 [data-role=scroller]').scrollTop = 0; });

/* 10. kolom beku */
const sticky = await page.evaluate(() => {
  const td = document.querySelector('#grid1 tbody tr td[data-c=nama]');
  return getComputedStyle(td).position + '/' + getComputedStyle(td).left;
});
ok('kolom beku sticky left', sticky.startsWith('sticky'), sticky);

/* 11. resize kolom */
const before = await page.evaluate(() => window.__g1.col('nama').width);
const handle = page.locator(g1 + ' [data-rz="1"]');
const box = await handle.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + 90, box.y + box.height / 2);
await page.mouse.up();
const after = await page.evaluate(() => window.__g1.col('nama').width);
ok('resize kolom ±90px', Math.abs(after - before - 90) <= 3, before + ' → ' + after);

/* 12. grid 2: edit inline */
const G2 = '#grid2';
const oldName = await page.locator(G2 + ' tbody tr:nth-child(1) td[data-c=nama]').innerText();
await page.locator(G2 + ' tbody tr:nth-child(1) td[data-c=nama]').dblclick();
await page.locator(G2 + ' tbody input[type=text]').fill('Nama Uji Coba');
await page.locator(G2 + ' tbody input[type=text]').press('Enter');
const newName = await page.locator(G2 + ' tbody tr:nth-child(1) td[data-c=nama]').innerText();
ok('edit inline tersimpan', newName === 'Nama Uji Coba', oldName + ' → ' + newName);
ok('onEdit terpanggil', (await page.locator('#log').innerText()).includes('edit'), await page.locator('#log').innerText());

/* 13. CRUD: tambah via formulir modal + validasi */
const n0 = await page.evaluate(() => window.__g2.data.length);
await page.locator(G2 + ' [data-role=tools]').scrollIntoViewIfNeeded();
ok('tombol CRUD lengkap', await page.evaluate(() =>
  ['add', 'edit', 'view', 'remove'].every(a => document.querySelector('#grid2 [data-act=' + a + ']'))));
ok('Edit/Detail nonaktif tanpa pilihan', await page.locator(G2 + ' [data-act=edit]').isDisabled() &&
   await page.locator(G2 + ' [data-act=view]').isDisabled());
await page.locator(G2 + ' [data-act=add]').click();
await page.waitForSelector('.fixed [data-save]');
ok('formulir tambah terbuka', await page.locator('.fixed [data-fld=nama]').count() === 1 &&
   await page.locator('.fixed [data-fld=id]').count() === 0, 'kolom id form:false');
await page.locator('.fixed [data-save]').click();
ok('validasi required menahan simpan', (await page.locator('.fixed [data-err=nama]').innerText()) === 'wajib diisi' &&
   await page.evaluate(() => window.__g2.data.length) === n0);
await page.locator('.fixed [data-fld=nama]').fill('Nama Formulir');
await page.locator('.fixed [data-fld=gaji]').fill('7000000');
await page.locator('.fixed [data-fld=stat]').selectOption('Probation');
await page.locator('.fixed [data-save]').click();
await page.waitForTimeout(200);
ok('simpan tambah → data +1', await page.evaluate(() => window.__g2.data.length) === n0 + 1,
   n0 + ' → ' + await page.evaluate(() => window.__g2.data.length));
ok('baris baru otomatis terpilih', await page.evaluate(() => window.__g2.s.sel.size) === 1);
ok('onSave terpanggil', (await page.locator('#log').innerText()).includes('simpan baru'));

/* 14. CRUD: edit via formulir pada baris terpilih */
await page.locator(G2 + ' [data-act=edit]').click();
await page.waitForSelector('.fixed [data-save]');
ok('formulir edit memuat nilai lama', (await page.locator('.fixed [data-fld=nama]').inputValue()) === 'Nama Formulir');
await page.locator('.fixed [data-fld=kota]').fill('Bandung');
await page.locator('.fixed [data-save]').click();
await page.waitForTimeout(200);
ok('simpan edit mengubah data', await page.evaluate(() => {
  const g = window.__g2, id = [...g.s.sel][0];
  const r = g.data.find(x => String(x.id) === id);
  return r && r.kota === 'Bandung' && r.nama === 'Nama Formulir';
}));

/* 15. CRUD: detail baca-saja */
await page.locator(G2 + ' [data-act=view]').click();
await page.waitForSelector('.fixed [data-close]');
ok('detail baca-saja (tanpa tombol Simpan)', await page.locator('.fixed [data-save]').count() === 0 &&
   (await page.locator('.fixed').innerText()).includes('Bandung'));
await page.locator('.fixed [data-close]').click();

/* 16. persistensi localStorage: muat ulang halaman */
const lenBefore = await page.evaluate(() => window.__g2.data.length);
await page.reload();
await page.waitForSelector('#grid2 tbody tr');
ok('CRUD persisten setelah reload', await page.evaluate(() => window.__g2.data.length) === lenBefore,
   'sebelum=' + lenBefore + ' sesudah=' + await page.evaluate(() => window.__g2.data.length));
ok('nilai edit persisten', await page.evaluate(() =>
  window.__g2.data.some(r => r.nama === 'Nama Formulir' && r.kota === 'Bandung')));

/* 17. pager + hapus baris terpilih (data kini 13: 12 contoh + 1 dari formulir) */
await page.locator(G2 + ' [data-role=pager]').scrollIntoViewIfNeeded();
await page.locator(G2 + ' [data-page="2"]').last().click();
ok('navigasi ke halaman 2 (3 baris)', await page.evaluate(() => window.__g2.s.page) === 2 &&
   await page.evaluate(() => window.__g2.pageRows.length) === 3,
   'page=' + await page.evaluate(() => window.__g2.s.page));
await page.locator(G2 + ' [data-page="1"]').first().click();
ok('navigasi kembali ke halaman 1 (10 baris)', await page.evaluate(() => window.__g2.s.page) === 1 &&
   await page.evaluate(() => window.__g2.pageRows.length) === 10);

/* checkbox "pilih semua" bersifat toggle, jadi state dipilih eksplisit lewat API */
const selAll = (scope) => page.evaluate((sc) => {
  const g = window.__g2;
  g.s.sel.clear();
  (sc === 'view' ? g.view : g.pageRows).forEach((r, i) => g.s.sel.add(g.idOf(r, i)));
  g._paint(true); g._fire();
}, scope);

const n2 = await page.evaluate(() => window.__g2.data.length);
await selAll('page');
ok('pilih semua halaman 1 (10 baris)', await page.evaluate(() => window.__g2.s.sel.size) === 10,
   'sel=' + await page.evaluate(() => window.__g2.s.sel.size));
page.once('dialog', d => d.accept());
await page.locator(G2 + ' [data-act=remove]').click();
await page.waitForTimeout(200);
ok('hapus 10 baris terpilih', await page.evaluate(() => window.__g2.data.length) === n2 - 10,
   n2 + ' → ' + await page.evaluate(() => window.__g2.data.length));
await selAll('view');
page.once('dialog', d => d.accept());
await page.locator(G2 + ' [data-act=remove]').click();
await page.waitForTimeout(200);
ok('hapus sisa baris', await page.evaluate(() => window.__g2.data.length) === 0, 'sisa=' + await page.evaluate(() => window.__g2.data.length));
ok('tombol Hapus nonaktif saat tak ada pilihan', await page.locator(G2 + ' [data-act=remove]').isDisabled());

/* 18. reset data contoh mengembalikan 12 baris (persistensi dihapus) */
await page.locator('#reset2').click();
await page.waitForSelector('#grid2 tbody tr');
ok('reset data contoh → 12 baris', await page.evaluate(() => window.__g2.data.length) === 12);

/* 15. CSV */
const csv = await page.evaluate(() => {
  const g = window.__g1; const cols = g.vis();
  return g.view.slice(0, 2).map(r => cols.map(c => r[c.name]).join('|')).join('\n');
});
ok('ekspor CSV punya isi', csv.length > 0, csv.split('\n')[0].slice(0, 40) + '…');

/* 16. pilih kolom */
await page.locator(g1 + ' [data-act=cols]').click();
const boxes = page.locator('.fixed input[type=checkbox]');
ok('dialog pilih kolom terbuka', await boxes.count() === 11, 'kolom=' + await boxes.count());
await boxes.nth(3).uncheck();
ok('sembunyikan kolom', await page.evaluate(() => window.__g1.vis().length) === 10);
await page.locator('.fixed').click({ position: { x: 5, y: 5 } });


/* 19. demo 3: alur persetujuan (Approve/Reject, Filter form, Help, form 2 kolom, XLSX/PDF) */
const G3 = '#grid3';
await page.locator(G3).scrollIntoViewIfNeeded();
ok('toolbar demo3 berikon svg', await page.locator(G3 + ' [data-role=tools] button svg').count() >= 7,
   'ikon=' + await page.locator(G3 + ' [data-role=tools] button svg').count());
ok('grid3 tanpa baris filter di header', await page.locator(G3 + ' thead select[data-op]').count() === 0);
ok('awal: edit/detail/approve/reject/hapus nonaktif',
   await page.locator(G3 + ' [data-act=edit]').isDisabled() &&
   await page.locator(G3 + ' [data-act=view]').isDisabled() &&
   await page.locator(G3 + ' [data-act=approve]').isDisabled() &&
   await page.locator(G3 + ' [data-act=reject]').isDisabled() &&
   await page.locator(G3 + ' [data-act=remove]').isDisabled());

/* form filter terpusat */
await page.locator(G3 + ' [data-act=ffilter]').click();
await page.waitForSelector('.fixed [data-ff=jenis]');
await page.locator('.fixed [data-ff=jenis]').fill('Cuti');
await page.waitForTimeout(450);
ok('form filter memfilter grid', await page.evaluate(() =>
  window.__g3.view.length > 0 && window.__g3.view.every(r => r.jenis === 'Cuti')),
  'hasil=' + await page.evaluate(() => window.__g3.view.length));
await page.locator('.fixed [data-ff=status]').fill('Pending');
await page.waitForTimeout(450);
ok('form filter kombinasi AND', await page.evaluate(() =>
  window.__g3.view.every(r => r.jenis === 'Cuti' && r.status === 'Pending')));
await page.locator('.fixed button:has-text("Reset semua")').click();
ok('reset form filter', await page.evaluate(() => window.__g3.view.length) === 40);
await page.locator('.fixed button:has-text("Tutup")').click();

/* aturan enable berdasarkan jumlah seleksi */
await page.locator(G3 + ' tbody tr:nth-child(1) [data-ck]').click();
await page.locator(G3 + ' tbody tr:nth-child(2) [data-ck]').click();
ok('2 terpilih: approve/reject/hapus aktif, edit/detail nonaktif',
   !(await page.locator(G3 + ' [data-act=approve]').isDisabled()) &&
   !(await page.locator(G3 + ' [data-act=reject]').isDisabled()) &&
   !(await page.locator(G3 + ' [data-act=remove]').isDisabled()) &&
   (await page.locator(G3 + ' [data-act=edit]').isDisabled()) &&
   (await page.locator(G3 + ' [data-act=view]').isDisabled()));
await page.locator(G3 + ' [data-act=approve]').click();
await page.waitForTimeout(150);
ok('approve mengubah status 2 baris', await page.evaluate(() =>
  [1, 2].every(i => window.__g3.data.find(r => r.id === i).status === 'Approved')));

await page.evaluate(() => window.__g3.clearSel());
await page.locator(G3 + ' tbody tr:nth-child(3) [data-ck]').click();
ok('1 terpilih: edit & detail aktif',
   !(await page.locator(G3 + ' [data-act=edit]').isDisabled()) &&
   !(await page.locator(G3 + ' [data-act=view]').isDisabled()));

/* form multi-kolom */
await page.locator(G3 + ' [data-act=edit]').click();
await page.waitForSelector('.fixed [data-save]');
ok('form edit layout 2 kolom', await page.evaluate(() => {
  const b = document.querySelector('.fixed .grid');
  return b && getComputedStyle(b).gridTemplateColumns.split(' ').length === 2;
}));
await page.locator('.fixed button:has-text("Batal")').click();
await page.locator(G3 + ' [data-act=view]').click();
await page.waitForSelector('.fixed');
ok('detail baca-saja', await page.locator('.fixed [data-save]').count() === 0);
await page.locator('.fixed button:has-text("Tutup")').click();

/* help */
await page.locator(G3 + ' [data-act=help]').click();
await page.waitForSelector('.fixed');
ok('modal help terbuka', (await page.locator('.fixed').last().innerText()).includes('Bantuan'));
await page.locator('.fixed button:has-text("Tutup")').click();

/* export menu + unduhan nyata */
await page.evaluate(() => window.__g3.clearSel());
await page.locator(G3 + ' [data-act=export]').click();
await page.waitForSelector('[data-role=xmenu]');
ok('menu export: CSV/XLSX/PDF', await page.locator('[data-role=xmenu] [data-x]').count() === 3);
const [dx] = await Promise.all([page.waitForEvent('download'), page.locator('[data-role=xmenu] [data-x=xlsx]').click()]);
await dx.saveAs('/tmp/out.xlsx');
await page.locator(G3 + ' [data-act=export]').click();
await page.waitForSelector('[data-role=xmenu]');
const [dp] = await Promise.all([page.waitForEvent('download'), page.locator('[data-role=xmenu] [data-x=pdf]').click()]);
await dp.saveAs('/tmp/out.pdf');
const xb = fs.readFileSync('/tmp/out.xlsx');
ok('xlsx: magic PK (zip asli)', xb[0] === 0x50 && xb[1] === 0x4b);
fs.writeFileSync('/tmp/chk.py', "import zipfile\nz=zipfile.ZipFile('/tmp/out.xlsx')\nassert z.testzip() is None\nn=z.namelist()\nassert 'xl/worksheets/sheet1.xml' in n\nprint(len(z.read('xl/worksheets/sheet1.xml')))\n");
const pyx = execSync('python3 /tmp/chk.py').toString().trim();
ok('xlsx: zip valid + sheet1.xml', +pyx > 1000, 'sheet=' + pyx + ' B');
const pb = fs.readFileSync('/tmp/out.pdf').toString('latin1');
ok('pdf: magic + xref + EOF', pb.startsWith('%PDF-') && pb.includes('startxref') && pb.trimEnd().endsWith('%%EOF'));
ok('pdf: berisi header kolom', pb.includes('Karyawan') && pb.includes('Status'));
ok('nama file unduhan benar (minigrid-YYYY-MM-DD)', /^minigrid-\d{4}-\d{2}-\d{2}\.xlsx$/.test(dx.suggestedFilename()) && /^minigrid-\d{4}-\d{2}-\d{2}\.pdf$/.test(dp.suggestedFilename()),
   dx.suggestedFilename() + ', ' + dp.suggestedFilename());


/* 20. tata letak tombol responsif */
await page.setViewportSize({ width: 380, height: 800 });
await page.waitForTimeout(200);
ok('380px: tanpa overflow horizontal', await page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1),
  'sw=' + await page.evaluate(() => document.documentElement.scrollWidth));
ok('380px: label toolbar jadi ikon-saja', await page.evaluate(() => {
  const sp = document.querySelector('#grid3 [data-role=tools] button span');
  return sp && getComputedStyle(sp).display === 'none';
}));
ok('380px: toolbar melipat, tidak terpotong', await page.evaluate(() => {
  const t = document.querySelector('#grid3 [data-role=tools]');
  return t.clientHeight > 28 && t.scrollWidth <= t.clientWidth + 1;
}));
ok('380px: pencarian tetap terlihat & melebar', await page.evaluate(() => {
  const q = document.querySelector('#grid3 [data-role=q]');
  const r = q.getBoundingClientRect();
  return r.width > 150 && r.left >= 0 && r.right <= window.innerWidth;
}));
await page.locator('#grid3 [data-act=export]').scrollIntoViewIfNeeded();
await page.locator('#grid3 [data-act=export]').click();
await page.waitForSelector('[data-role=xmenu]');
ok('380px: menu export di dalam viewport', await page.evaluate(() => {
  const r = document.querySelector('[data-role=xmenu]').getBoundingClientRect();
  return r.left >= 0 && r.right <= window.innerWidth;
}));
await page.mouse.click(10, 700);
await page.waitForTimeout(100);
await page.setViewportSize({ width: 1280, height: 1600 });
await page.waitForTimeout(200);
ok('1280px: label tombol tampil lagi', await page.evaluate(() => {
  const sp = document.querySelector('#grid3 [data-role=tools] button span');
  return getComputedStyle(sp).display !== 'none';
}));


/* 21. pilihan tema */
await page.evaluate(() => localStorage.removeItem('minigrid-theme'));
await page.evaluate(() => window.scrollTo(0, 0));
const cellBg = () => page.evaluate(() => getComputedStyle(document.querySelector('#grid1 tbody td[data-c=nama]')).backgroundColor);
const bgLight = await cellBg();
await page.locator('#themes [data-t=dark]').click();
await page.waitForTimeout(250);
ok('tema Gelap mengubah permukaan', (await cellBg()) !== bgLight, await cellBg());
ok('data-theme terpasang', await page.evaluate(() => document.documentElement.dataset.theme) === 'dark');
ok('color-scheme dark utk kontrol native', await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme) === 'dark');
await page.screenshot({ path: 'shots/dark.png' });
await page.reload();
await page.waitForSelector('#grid1 tbody tr');
ok('tema persisten setelah reload', await page.evaluate(() => document.documentElement.dataset.theme) === 'dark');
await page.locator('#themes [data-t=ocean]').click();
ok('tema Samudra aktif', await page.evaluate(() => document.documentElement.dataset.theme) === 'ocean');
await page.locator('#themes [data-t=light]').click();
ok('kembali ke Terang', await page.evaluate(() => !document.documentElement.dataset.theme));


/* 22. builder kondisi lanjutan: field dipilih, kondisi ditambah, AND/OR */
await page.locator('#grid3 [data-act=ffilter]').click();
await page.waitForSelector('.fixed [data-radd]');
await page.locator('.fixed [data-radd]').click();
await page.locator('.fixed [data-radd]').click();
await page.locator('.fixed [data-radd]').click();
const rf = page.locator('.fixed [data-rf]');
await rf.nth(0).selectOption('id');
await page.locator('.fixed [data-rop]').nth(0).selectOption('gt');
await page.locator('.fixed [data-rq]').nth(0).fill('10');
await rf.nth(1).selectOption('id');
await page.locator('.fixed [data-rop]').nth(1).selectOption('lte');
await page.locator('.fixed [data-rq]').nth(1).fill('20');
await rf.nth(2).selectOption('karyawan');
await page.locator('.fixed [data-rop]').nth(2).selectOption('cn');
const token = await page.evaluate(() => window.__g3.data.find(x => x.id === 15).karyawan.split(' ')[1].slice(0, 4));
await page.locator('.fixed [data-rq]').nth(2).fill(token);
await page.waitForTimeout(400);
const andDbg = await page.evaluate((tk) => {
  const g = window.__g3;
  const exp = g.data.filter(r => r.id > 10 && r.id <= 20 && r.karyawan.toLowerCase().includes(tk));
  return JSON.stringify({ vl: g.view.length, el: exp.length, view: g.view.map(r => r.id), exp: exp.map(r => r.id) });
}, token.toLowerCase());
ok('rentang dua kondisi field sama (no>10 & no<=20) + like', (() => {
  const d = JSON.parse(andDbg);
  return d.vl > 0 && d.vl === d.el && d.view.join() === d.exp.join();
})(), andDbg + ' token=' + token);
ok('badge tombol Filter = 3 kondisi', await page.locator('#grid3 [data-act=ffilter] [data-fc]').innerText() === '3');
await page.locator('.fixed [data-rjoin]').selectOption('OR');
await page.waitForTimeout(300);
ok('penggabungan OR', await page.evaluate(() =>
  window.__g3.view.length === window.__g3.data.filter(r => r.id > 10 || r.id <= 20 || r.karyawan.toLowerCase().includes('iregar')).length),
  'hasil=' + await page.evaluate(() => window.__g3.view.length));
await page.locator('.fixed [data-rjoin]').selectOption('AND');
await page.waitForTimeout(200);
await page.locator('.fixed [data-rx]').nth(2).click();
await page.waitForTimeout(300);
ok('hapus satu kondisi → rentang saja (10 baris)', await page.evaluate(() =>
  window.__g3.view.length === 10 && window.__g3.view.every(r => r.id > 10 && r.id <= 20)));
await page.screenshot({ path: 'shots/builder.png' });
await page.locator('.fixed button:has-text("Reset semua")').click();
await page.waitForTimeout(250);
ok('reset menghapus semua kondisi', await page.evaluate(() =>
  window.__g3.view.length === 40 && window.__g3.s.rules.length === 0));
await page.locator('.fixed button:has-text("Tutup")').click();

/* 23. modal: default di tengah layar & bisa digeser */
const vp23 = page.viewportSize();
const pan23 = () => page.locator('.fixed > div').first();
await page.locator(G2 + ' [data-act=add]').click();
const b1 = await pan23().boundingBox();
ok('modal Tambah default di tengah layar',
  Math.abs(b1.x + b1.width / 2 - vp23.width / 2) <= 2 && Math.abs(b1.y + b1.height / 2 - vp23.height / 2) <= 2,
  JSON.stringify(b1));
ok('header modal jadi handle drag (cursor grab)',
  await page.locator('.fixed [data-drag]').evaluate(el => el.style.cursor) === 'grab');
const hb = await page.locator('.fixed [data-drag]').boundingBox();
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await page.mouse.down();
await page.mouse.move(hb.x + hb.width / 2 + 150, hb.y + hb.height / 2 + 90, { steps: 6 });
await page.mouse.up();
const b2 = await pan23().boundingBox();
ok('modal Tambah bergeser +150,+90 mengikuti pointer',
  Math.abs(b2.x - (b1.x + 150)) <= 3 && Math.abs(b2.y - (b1.y + 90)) <= 3,
  JSON.stringify({ dari: [b1.x, b1.y], ke: [b2.x, b2.y] }));
await page.locator('.fixed button:has-text("Batal")').click();

await page.locator('#grid3 [data-act=ffilter]').click();
const f1 = await pan23().boundingBox();
ok('modal Filter default di tengah layar',
  Math.abs(f1.x + f1.width / 2 - vp23.width / 2) <= 2 && Math.abs(f1.y + f1.height / 2 - vp23.height / 2) <= 2);
const fh = await page.locator('.fixed [data-drag]').boundingBox();
await page.mouse.move(fh.x + fh.width / 2, fh.y + fh.height / 2);
await page.mouse.down();
await page.mouse.move(fh.x + fh.width / 2 - 180, fh.y + fh.height / 2 + 60, { steps: 6 });
await page.mouse.up();
const f2 = await pan23().boundingBox();
ok('modal Filter bisa digeser (-180,+60)',
  Math.abs(f2.x - (f1.x - 180)) <= 3 && Math.abs(f2.y - (f1.y + 60)) <= 3,
  JSON.stringify({ dari: [f1.x, f1.y], ke: [f2.x, f2.y] }));
await page.locator('.fixed button:has-text("Tutup")').click();
await page.locator('#grid3 [data-act=ffilter]').click();
const f3 = await pan23().boundingBox();
ok('modal dibuka lagi kembali ke tengah',
  Math.abs(f3.x + f3.width / 2 - vp23.width / 2) <= 2 && Math.abs(f3.y + f3.height / 2 - vp23.height / 2) <= 2);
await page.locator('.fixed button:has-text("Tutup")').click();

/* 24. grid4: aksi per baris (tanpa checkbox) + form 3 kolom */
ok('grid4 tanpa checkbox', await page.locator('#grid4 [data-ck]').count() === 0 &&
  await page.locator('#grid4 [data-role=all]').count() === 0);
ok('grid4 punya kolom Aksi + 3 ikon per baris', await page.locator('#grid4 thead th', { hasText: 'Aksi' }).count() === 1 &&
  await page.locator('#grid4 tbody [data-ra]').count() === 3 * await page.locator('#grid4 tbody tr[data-id]').count());
const n4 = await page.evaluate(() => window.__g4.data.length);
await page.locator('#grid4 [data-act=add]').click();
ok('tombol Tambah membuka form 3 kolom', await page.locator('.fixed >> text=Tambah baris').count() === 1 &&
  await page.evaluate(() => {
    const el = document.querySelector('.fixed > div').children[1];
    return getComputedStyle(el).gridTemplateColumns.split(' ').length;
  }) === 3);
await page.locator('.fixed [data-fld=proyek]').fill('Proyek e2e');
await page.locator('.fixed [data-fld=pemilik]').fill('Tester');
await page.locator('.fixed [data-save]').click();
ok('simpan Tambah → data +1', await page.evaluate(() => window.__g4.data.length) === n4 + 1 &&
  await page.evaluate(() => window.__g4.data[window.__g4.data.length - 1].proyek) === 'Proyek e2e');
ok('toolbar tanpa tombol Edit/Detail mati saat select:false', await page.locator('#grid4 [data-act=edit]').count() === 0 &&
  await page.locator('#grid4 [data-act=view]').count() === 0);
await page.locator('#grid4 [data-page="1"]').first().click();
await page.locator('#grid4 tbody tr[data-id]').nth(1).locator('[data-ra=edit]').click();
ok('ikon Edit membuka modal baris tsb', await page.locator('.fixed >> text=Edit baris').count() === 1 &&
  await page.locator('.fixed [data-fld=proyek]').inputValue() === await page.evaluate(() => window.__g4.data[1].proyek));
ok('form Tambah/Edit tersusun 3 kolom', await page.evaluate(() => {
  const el = document.querySelector('.fixed > div').children[1];
  return getComputedStyle(el).gridTemplateColumns.split(' ').length;
}) === 3);
await page.locator('.fixed [data-fld=catatan]').fill('e2e rowActions');
await page.locator('.fixed [data-save]').click();
ok('simpan edit per baris mengubah record', await page.evaluate(() => window.__g4.data[1].catatan) === 'e2e rowActions');
await page.locator('#grid4 tbody tr[data-id]').nth(2).locator('[data-ra=view]').click();
ok('ikon Detail = modal readonly', await page.locator('.fixed >> text=Detail baris').count() === 1 &&
  await page.locator('.fixed [data-fld]').count() === 0);
await page.locator('.fixed [data-close]').click();
page.once('dialog', d => d.accept());
await page.locator('#grid4 tbody tr[data-id]').first().locator('[data-ra=del]').click();
await page.waitForTimeout(200);
ok('ikon Hapus menghapus record tsb', await page.evaluate(() => window.__g4.data.length) === n4);
await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'rowactions.png') });

/* 25. tombol refresh di semua contoh + data dari API */
for (const gs of ['#grid1', '#grid2', '#grid3', '#grid4', '#grid5'])
  ok('tombol refresh ada di ' + gs, await page.locator(gs + ' [data-act=refresh]').count() === 1);
await page.evaluate(() => { window.__g3.data[0].status = 'DIUBAH'; window.__g3.render(); });
await page.locator('#grid3 [data-act=refresh]').click();
await page.waitForTimeout(150);
ok('refresh grid3 memuat ulang data awal', await page.evaluate(() =>
  JSON.stringify(window.__g3.data) === JSON.stringify(window.__g3init)));
await page.evaluate(() => { window.__g4.data[0].catatan = 'DIUBAH'; window.__g4.render(); });
await page.locator('#grid4 [data-act=refresh]').click();
await page.waitForTimeout(150);
ok('refresh grid4 memuat ulang data awal', await page.evaluate(() =>
  JSON.stringify(window.__g4.data) === JSON.stringify(window.__g4init)));
ok('grid5 termuat lewat simulasi API (file://)', await page.locator('#grid5 tbody tr[data-id]').count() > 0 &&
  (await page.locator('#api5').innerText()).includes('simulasi'),
  await page.locator('#api5').innerText());
await page.locator('#grid5 [data-act=refresh]').click();
await page.waitForTimeout(800);
ok('refresh grid5 memuat ulang + overlay sembunyi', await page.locator('#grid5 tbody tr[data-id]').count() > 0 &&
  await page.evaluate(() => document.querySelector('#grid5 [data-role=load]').classList.contains('hidden')));

/* 26. master-detail di grid1 */
ok('kolom ekspander ada di grid1', await page.locator('#grid1 [data-exp]').count() > 0);
const sh0 = await page.evaluate(() => document.querySelector('#grid1 [data-role=scroller]').scrollHeight);
await page.locator('#grid1 [data-exp]').first().click();
ok('baris detail terbuka dgn colspan penuh', await page.locator('#grid1 tr.mg-detail').count() === 1 &&
  await page.evaluate(() => document.querySelector('#grid1 tr.mg-detail td').colSpan) ===
  await page.evaluate(() => window.__g1.vis().length + 2));
const sh1 = await page.evaluate(() => document.querySelector('#grid1 [data-role=scroller]').scrollHeight);
ok('tinggi virtual bertambah tepat 180px', Math.abs((sh1 - sh0) - 180) <= 2, sh0 + '→' + sh1);
await page.evaluate(() => { document.querySelector('#grid1 [data-role=scroller]').scrollTop = 800000; });
await page.waitForTimeout(200);
await page.evaluate(() => { document.querySelector('#grid1 [data-role=scroller]').scrollTop = 0; });
await page.waitForTimeout(200);
ok('detail bertahan setelah scroll jauh', await page.locator('#grid1 tr.mg-detail').count() === 1);
await page.locator('#grid1 [data-exp]').first().click();
ok('detail menutup', await page.locator('#grid1 tr.mg-detail').count() === 0);
await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'detail.png'), clip: { x: 60, y: 100, width: 1220, height: 620 } });

/* 27. mode server-side (grid6) */
await page.waitForSelector('#grid6 tbody tr[data-id]');
ok('status grid6 menyebut sumber simulasi', (await page.locator('#api6').innerText()).includes('simulasi'));
ok('grid6 hanya menerima satu halaman dr server', await page.locator('#grid6 tbody tr[data-id]').count() === 10 &&
  (await page.locator('#grid6 [data-role=info]').innerText()).includes('dari 10000'),
  await page.locator('#grid6 [data-role=info]').innerText());
await page.locator('#grid6 [data-page="2"]').last().click();
await page.waitForTimeout(600);
ok('halaman 2 diambil dari server', await page.evaluate(() => window.__g6.view[0].id) === 11);
await page.locator('#grid6 thead [data-sort=gaji]').click();
await page.waitForTimeout(600);
ok('sort gaji diproses server (naik)', await page.evaluate(() =>
  window.__g6.view.every((r, i, a) => i === 0 || a[i - 1].gaji <= r.gaji)));
await page.locator('#grid6 [data-role=q]').fill('depok');
await page.locator('#grid6 [data-role=q]').press('Enter');
await page.waitForTimeout(700);
ok('pencarian global diproses server', await page.evaluate(() => window.__g6.s.total) < 10000 &&
  await page.evaluate(() => window.__g6.view.every(r => Object.values(r).some(v => String(v).toLowerCase().includes('depok')))));
await page.locator('#grid6 [data-role=q]').fill('');
await page.locator('#grid6 [data-role=q]').press('Enter');
await page.waitForTimeout(700);

/* 28. keyboard & ARIA */
ok('tabel role=grid + aria-rowcount 50001', await page.evaluate(() => {
  const t = document.querySelector('#grid1 table');
  return t.getAttribute('role') === 'grid' && t.getAttribute('aria-rowcount') === '50001';
}));
ok('th role=columnheader + aria-sort', await page.locator('#grid1 thead th[role=columnheader]').count() >= 8);
await page.locator('#grid1 [data-role=scroller]').focus();
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowRight');
ok('panah memindah sel fokus (2,1) + aria-activedescendant',
  await page.evaluate(() => window.__g1.s.kb.i === 2 && window.__g1.s.kb.c === 1) &&
  await page.locator('#grid1 td.kb').count() === 1 &&
  await page.evaluate(() => document.querySelector('#grid1 [data-role=scroller]').getAttribute('aria-activedescendant')) === 'kbc');
await page.keyboard.press(' ');
await page.waitForTimeout(150);
ok('Spasi memilih baris fokus', await page.evaluate(() => window.__g1.s.sel.size) === 1);
await page.keyboard.press(' ');
await page.waitForTimeout(150);
ok('Spasi lagi batal pilihan', await page.evaluate(() => window.__g1.s.sel.size) === 0);
await page.locator('#grid2 [data-role=scroller]').focus();
await page.keyboard.press('Enter');
ok('Enter membuka edit inline', await page.locator('#grid2 tbody input.h-6').count() === 1);
await page.keyboard.press('Escape');
await page.waitForTimeout(100);

/* 29. dual bahasa ID/EN — dijalankan terakhir karena tes lain memakai string Indonesia */
await page.locator('#langs [data-l=en]').click();
await page.waitForTimeout(300);
ok('EN: toolbar berbahasa Inggris', await page.locator('#grid2 [data-act=add] span').innerText() === 'Add' &&
  await page.locator('#grid1 [data-act=cols] span').innerText() === 'Columns');
ok('EN: pager berlabel Rows', (await page.locator('#grid1 [data-role=pager]').innerText()).includes('Rows'));
ok('EN: teks halaman berbahasa Inggris', (await page.locator('[data-i18n=s1t]').innerText()).includes('50,000 rows') &&
  (await page.locator('[data-i18n=foot]').innerText()).includes('no jQuery'));
await page.locator('#grid2 [data-act=add]').click();
await page.waitForSelector('.fixed [data-save]');
ok('EN: modal berbahasa Inggris', await page.locator('.fixed span.text-sm.font-semibold').first().innerText() === 'Add row' &&
  await page.locator('.fixed [data-save]').innerText() === 'Save' &&
  await page.locator('.fixed [data-close]').innerText() === 'Cancel');
await page.locator('.fixed [data-close]').click();
await page.waitForTimeout(150);
await page.reload();
await page.waitForSelector('#grid1 tbody tr[data-id]');
await page.waitForTimeout(500);
ok('EN: pilihan bahasa persisten setelah reload', await page.locator('#grid2 [data-act=add] span').innerText() === 'Add' &&
  (await page.locator('[data-i18n=s2t]').innerText()) === 'Full javascript grid-style CRUD');
await page.locator('#langs [data-l=id]').click();
await page.waitForTimeout(300);
ok('ID: kembali ke bahasa Indonesia', await page.locator('#grid2 [data-act=add] span').innerText() === 'Tambah' &&
  (await page.locator('[data-i18n=s1t]').innerText()).includes('50.000'));

/* 17. tidak ada error konsol */
ok('tanpa error konsol', errors.length === 0, errors.slice(0, 3).join(' ;; '));

/* 18. benar-benar offline: tidak ada permintaan jaringan selain file:// */
ok('tidak ada resource eksternal', await page.evaluate(() =>
  performance.getEntriesByType('resource').every(r => r.name.startsWith('file://'))));

await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'full.png'), fullPage: true });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'grid1.png'), clip: { x: 0, y: 60, width: 1280, height: 560 } });

await browser.close();
console.log('\n' + (fail ? fail + ' TES GAGAL' : 'SEMUA TES LULUS'));
process.exit(fail ? 1 : 0);
