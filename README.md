# MiniGrid — data grid offline ala jqGrid

Grid data lengkap dalam **satu file HTML** yang berjalan 100% offline (bisa dibuka lewat
`file://`, USB, atau intranet tanpa server). Styling **Tailwind CSS v4** (hasil build
di-inline), logika **vanilla JS tanpa runtime** — lebih ringan daripada jqGrid (tanpa
jQuery) maupun Svelte/Alpine untuk kasus "satu file".

## Varian

| File | Isi | Ukuran |
|---|---|---|
| `index.html` | **varian utama** — vanilla JS, fitur lengkap | ±57 KB |
| `alpine.html` | pembanding — Alpine.js 3 (runtime 45 KB) | ±69 KB |
| `src/` | sumber + `build.mjs` untuk membangun ulang | — |

## Tema (6 pilihan)

Terang (default) · Gelap · Samudra · Hutan · Senja · Monokrom — pemilih di kepala halaman,
persisten di `localStorage`. Implementasi: setiap tema me-remap variabel warna Tailwind v4
(`--color-*`) lewat `[data-theme=…]`, sehingga seluruh komponen (grid, modal, badge, kontrol
native via `color-scheme`) berganti konsisten tanpa duplikasi CSS.

## Fitur (varian utama)

- **Sort multi-kolom** — klik header; `Shift`+klik menambah kunci urut (badge angka).
- **Filter per kolom beroperator** — `= ≠ ∋ ^ $ > ≥ < ≤ ada kosong` (jqGrid-style search row).
- **Builder kondisi lanjutan** (tombol Filter) — field dipilih dari dropdown, kondisi dapat
  **ditambah** bebas (satu field boleh beberapa, mis. `no > 10` DAN `no <= 20`),
  digabung **AND/OR**, dilengkapi badge jumlah kondisi aktif.
- **Pencarian global** lintas semua kolom (Enter).
- **Pager** — « ‹ › », pilih jumlah baris, info rentang.
- **Virtual scroll** — 50.000 baris tetap ±20 baris di DOM; filter+sort 50k ≈ 1–3 ms.
- **Kolom beku (frozen)** — `sticky` di kiri, tetap saat scroll horizontal/vertikal.
- **Pilih baris** — checkbox per baris, pilih semua (halaman atau seluruh hasil, `selectAll`).
- **Resize kolom** — geser tepi kanan header.
- **Modal dapat digeser** — Tambah/Detail/Edit/Filter/Bantuan terbuka di tengah layar; seret bilah judulnya untuk memindahkan (mouse & sentuh).
- **Edit inline** — klik ganda sel; Enter/Tab simpan, Esc batal.
- **CRUD lengkap ala jqGrid (navGrid)** — tombol `+ Tambah · Edit · Detail · Hapus`
  dengan **formulir modal**: validasi (`required`, angka), select untuk `options`,
  checkbox untuk `bool`, mode baca-saja untuk Detail; callback `onSave(row,isNew)`
  untuk persistensi (demo memakai `localStorage`). Aktifkan lewat `crud: true`.
- **Pilih kolom** (show/hide).
- **Aksi kustom berikon** (`actions`) — demo Approve/Reject pada grid alur persetujuan.
- **Menu Export**: CSV, **XLSX** (OOXML+ZIP ditulis sendiri: header tebal berwarna, pane beku,
  AutoFilter, lebar kolom, format `#,##0`), dan **PDF** (lanskap otomatis bila lebar, angka rata
  kanan, strip zebra, nomor halaman) — nama berkas ber-tanggal, tanpa library.
- **Tombol Filter** — semua filter kolom dituangkan ke satu form modal (operator + nilai,
  kombinasi AND, Reset) yang memperbarui grid langsung; **tombol Help** dengan panduan.
- **Form multi-kolom** (`formCols: 2` atau `3`) untuk Tambah/Edit/Detail.
- **Master-detail** (`detail: fn(row)`) — chevron kiri membentang baris detail tanpa merusak virtual scroll.
- **Tombol Refresh** di semua grid (`refresh` default true) dengan `onRefresh(grid)` — bila mengembalikan Promise, overlay "Memuat…" tampil otomatis; contoh akses API (`fetch`) ada di demo 5.
- **Aksi per baris** (`rowActions: true`) — ikon Detail/Edit/Hapus pada tiap record; berguna bila checkbox/seleksi dimatikan (`select: false`).
- **Aturan enable tombol**: Edit/Detail = tepat 1 baris terpilih; Hapus/aksi kustom = ≥1.
- **Tata letak responsif**: toolbar melipat (wrap) di layar sempit, label tombol menjadi
  ikon-saja di bawah 640px (judul tetap via `title`), pencarian melebar penuh di ponsel,
  menu Export tidak keluar tepi, form modal & form Filter menyusutkan jumlah kolomnya,
  tabel scroll horizontal — teruji e2e pada 380px tanpa overflow halaman.
- Format angka/Rupiah, tanggal, badge status via `render()` per kolom.

## Pakai

```html
<script>/* isi <script> dari index.html, atau ambil src/grid.js */</script>
<script>
MiniGrid({
  el: '#grid',
  columns: [
    { name:'id',   label:'ID',   width:70, type:'num' },
    { name:'nama', label:'Nama', width:180 },
    { name:'gaji', label:'Gaji', type:'num', format:'money', align:'right' },
    { name:'tgl',  label:'Masuk', type:'date' },
  ],
  data: rows,               // array objek biasa (client-side)
  frozen: 2, pageSize: 25, height: 420,
  crud: true,              // + Tambah/Edit/Detail/Hapus (form modal)
  edit: true,              // edit inline via klik ganda
  onSave: (row, isNew) => simpan(row),   // persistensi localStorage/API
});
</script>
```

Opsi lengkap & dokumentasi API ada di bagian bawah `index.html` (terlihat langsung saat dibuka).

## Build ulang (butuh internet sekali)

```bash
npm ci || npm i -D @tailwindcss/cli playwright-core
npm run build        # tailwind v4 → dist/tailwind.css → inline ke index.html & alpine.html
npm test             # uji e2e Chromium headless terhadap file hasil build (offline, file://)
```

Hasil build (`index.html`, `alpine.html`) tidak menyentuh jaringan sama sekali —
diverifikasi oleh tes (`performance.getEntriesByType('resource')` semua `file://`).

## Rekomendasi stack

- **Vanilla JS + Tailwind v4** (rekomendasi): 0 KB runtime, fitur grid paling lengkap,
  satu file, tanpa langkah build bagi pengguna akhir.
- **Alpine.js + Tailwind v4**: markup deklaratif lebih ringkas, tetapi +45 KB runtime dan
  fitur harus ditulis ulang (tanpa virtual scroll/kolom beku pada varian contoh).
- **Svelte**: bagus bila aplikasi sudah memakai Svelte; untuk "satu file offline" langkah
  compile menambah rantai alat tanpa keuntungan berarti.

## Struktur

```
grid/
├─ index.html          hasil build (offline, utama)
├─ alpine.html         hasil build (pembanding)
├─ build.mjs           inline CSS+JS → satu file
├─ src/
│  ├─ grid.js          inti grid (~31 KB, 0 dependency)
│  ├─ demo.js          data contoh 50.000 baris (seeded) + demo
│  ├─ index.html       kerangka halaman dev
│  ├─ alpine.html      varian Alpine dev
│  ├─ input.css        @import "tailwindcss"
│  └─ app.css          warna kolom beku/zebra/hover
└─ test/               e2e Chromium (30+ asersi)
```
