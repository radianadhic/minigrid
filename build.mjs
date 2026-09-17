/* Inline semua aset (Tailwind v4, CSS lokal, JS) → satu file HTML 100% offline per varian.
 *   1) npx tailwindcss -i ./src/input.css -o ./dist/tailwind.css --minify
 *   2) node build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const tw = readFileSync('./dist/tailwind.css', 'utf8');
const app = readFileSync('./src/app.css', 'utf8') + '\n' + readFileSync('./src/themes.css', 'utf8');
const cssBlock = `<style>\n${tw}\n${app}\n</style>`;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

/* --- varian utama: vanilla JS --- */
{
  const html = readFileSync('./src/index.html', 'utf8');
  const js = [readFileSync('./src/grid.js', 'utf8'), readFileSync('./src/export.js', 'utf8'), readFileSync('./src/demo.js', 'utf8')].join('\n');
  const out = html
    .replace('<link rel="stylesheet" href="./dist/tailwind.css">\n<link rel="stylesheet" href="./src/app.css">', () => cssBlock)
    .replace('<script src="./src/grid.js"></script>\n<script src="./src/demo.js"></script>', () => `<script>\n${js}\n</script>`);
  if (out.includes('href="./dist') || out.includes('src="./src')) throw new Error('index.html: masih ada referensi eksternal');
  writeFileSync('./index.html', out);
  console.log('index.html  ' + kb(out.length));
}

/* --- varian pembanding: Alpine.js --- */
{
  const html = readFileSync('./src/alpine.html', 'utf8');
  const alp = readFileSync('./vendor/alpine.min.js', 'utf8');
  const out = html
    .replace('<link rel="stylesheet" href="./dist/tailwind.css">\n<link rel="stylesheet" href="./src/app.css">', () => cssBlock)
    .replace('<script src="./vendor/alpine.min.js" defer></script>', () => `<script>\n${alp}\n</script>`);
  if (out.includes('href="./dist') || out.includes('src="./vendor')) throw new Error('alpine.html: masih ada referensi eksternal');
  writeFileSync('./alpine.html', out);
  console.log('alpine.html ' + kb(out.length));
}
