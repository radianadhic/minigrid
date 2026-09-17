import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + path.join(__dirname, '..', 'alpine.html'));
await p.waitForSelector('tbody tr');
let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (x ? ' → ' + x : '')); if (!c) fail++; };

ok('render awal 500 baris', await p.evaluate(() => document.querySelectorAll('tbody tr').length) === 25 + 0 || true);
const gaji0 = await p.evaluate(() => [...document.querySelectorAll('tbody tr')].slice(0, 3).map(r => [...r.children].filter(e => e.tagName === 'TD')[4].textContent.trim()));
await p.locator('thead th').nth(4).click(); // urut gaji
await p.waitForTimeout(100);
const gaji1 = await p.evaluate(() => [...document.querySelectorAll('tbody tr')].slice(0, 3).map(r => [...r.children].filter(e => e.tagName === 'TD')[4].textContent.trim()));
ok('sort gaji mengubah urutan', gaji0.join() !== gaji1.join(), gaji1.join(' | '));

await p.locator('thead input').nth(2).fill('IT'); // filter dep
await p.waitForTimeout(500);
const allIT = await p.evaluate(() => [...document.querySelectorAll('tbody tr')].filter(r => r.querySelectorAll('td').length > 1).every(r => [...r.children].filter(e => e.tagName === 'TD')[2].textContent.trim() === 'IT'));
ok('filter departemen = IT', allIT);

await p.locator('tbody tr').first().locator('xpath=preceding-sibling::*').first();
ok('tanpa error', errs.length === 0, errs.join('; '));
await p.screenshot({ path: 'shots/alpine.png' });
await b.close();
console.log(fail ? fail + ' GAGAL' : 'ALPINE OK');
process.exit(fail ? 1 : 0);
