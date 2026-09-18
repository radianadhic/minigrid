/* Data contoh deterministik (seeded) + dua demo grid */
(function () {
  'use strict';

  /* ---- PRNG mulberry32: hasil sama setiap kali dibuka ---- */
  var seed = 20260917;
  function rnd() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
  var int = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };

  var DEPAN = ['Adi','Budi','Citra','Dewi','Eko','Fitri','Gilang','Hana','Indra','Joko','Kirana','Lukman','Maya','Nadia','Omar','Putri','Qori','Rina','Sari','Teguh','Umi','Vina','Wahyu','Yuni','Zaki','Agus','Bella','Candra','Dimas','Elsa','Farhan','Gita','Hadi','Intan','Jaya','Kelik','Laras','Marno','Nita','Okta','Panji','Rani','Sigit','Tari','Ucup','Vera','Wawan','Yanto','Zulfan','Ayu'];
  var BELAKANG = ['Saputra','Wijaya','Pratama','Nugroho','Setiawan','Hidayat','Kusuma','Ramadhan','Anggraini','Lestari','Susanto','Maulana','Permana','Halim','Siregar','Nasution','Pangestu','Utami','Firmansyah','Handoko'];
  var DEP = ['Produksi','Keuangan','IT','Pemasaran','SDM','Logistik','QC','Riset','Legal','Umum'];
  var JAB = ['Staf','Senior Staf','Supervisor','Analis','Manajer','Kepala Seksi','Direktur','Koordinator'];
  var KOTA = ['Depok','Jakarta','Bogor','Bekasi','Tangerang','Bandung','Semarang','Surabaya','Medan','Makassar','Yogyakarta','Denpasar'];
  var STAT = ['Aktif', 'Cuti', 'Probation', 'Resign'];

  function iso(d) { return d.toISOString().slice(0, 10); }
  function rows(n) {
    var out = [], d;
    for (var i = 1; i <= n; i++) {
      d = new Date(2015 + int(0, 10), int(0, 11), int(1, 28));
      out.push({
        id: i,
        nama: pick(DEPAN) + ' ' + pick(BELAKANG),
        nik: 'ID-' + String(100000 + i),
        dep: pick(DEP),
        jabatan: pick(JAB),
        kota: pick(KOTA),
        masuk: iso(d),
        gaji: int(45, 320) * 100000,
        skor: Math.round(rnd() * 1000) / 10,
        stat: pick(STAT),
        aktif: rnd() > 0.18
      });
    }
    return out;
  }

  var badge = {
    'Aktif': 'bg-emerald-100 text-emerald-700',
    'Cuti': 'bg-amber-100 text-amber-700',
    'Probation': 'bg-sky-100 text-sky-700',
    'Resign': 'bg-rose-100 text-rose-700'
  };
  var cols = [
    { name: 'id', label: 'ID', width: 64, type: 'num', align: 'right', form: false },
    { name: 'nama', label: 'Nama Karyawan', width: 170, required: true },
    { name: 'nik', label: 'NIK', width: 96 },
    { name: 'dep', label: 'Departemen', width: 110 },
    { name: 'jabatan', label: 'Jabatan', width: 120 },
    { name: 'kota', label: 'Kota', width: 100 },
    { name: 'masuk', label: 'Tgl Masuk', width: 104, type: 'date' },
    { name: 'gaji', label: 'Gaji / Bulan', width: 128, type: 'num', format: 'money', align: 'right' },
    { name: 'skor', label: 'Skor', width: 70, type: 'num', align: 'right' },
    {
      name: 'stat', label: 'Status', width: 100, options: STAT,
      render: function (v) {
        return '<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium ' + (badge[v] || 'bg-slate-100 text-slate-600') + '">' + v + '</span>';
      }
    },
    {
      name: 'aktif', label: 'Aktif', width: 60, type: 'num', align: 'center', bool: true,
      render: function (v) { return v ? '<span class="text-emerald-600">●</span>' : '<span class="text-slate-300">○</span>'; }
    }
  ];

  /* ---- Demo 1: skala besar ---- */
  var big = rows(50000);
  window.__g1 = MiniGrid({
    el: '#grid1', columns: cols, data: big,
    frozen: 2, height: 400, rowHeight: 30, pageSize: 500,
    pageSizes: [100, 500, 1000, 5000, 50000],
    onSelect: function (ids) { log('pilih ' + ids.length + ' baris'); }
  });

  /* ---- Demo 2: CRUD lengkap (form modal) + edit inline + persistensi ---- */
  var KEY = 'minigrid-demo2-v1';
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
  var small = Array.isArray(saved) && saved.length ? saved : rows(12);
  var save2 = function () {
    try { localStorage.setItem(KEY, JSON.stringify(window.__g2.data)); } catch (e) { }
  };

  window.__g2 = MiniGrid({
    el: '#grid2', columns: cols, data: small,
    height: 260, rowHeight: 30, pageSize: 10, frozen: 0,
    crud: true,            /* + Tambah · Edit · Detail · Hapus via formulir */
    edit: true,            /* plus edit inline: klik ganda sel */
    onAdd: function (r) {
      r.id = (window.__g2.data.length ? Math.max.apply(null, window.__g2.data.map(function (x) { return x.id; })) : 0) + 1;
      if (!r.nama) r.nama = 'Karyawan Baru';
      if (!r.nik) r.nik = 'ID-' + (100000 + r.id);
      if (!r.dep) r.dep = 'Umum';
      if (!r.jabatan) r.jabatan = 'Staf';
      if (!r.kota) r.kota = 'Depok';
      if (!r.masuk) r.masuk = new Date().toISOString().slice(0, 10);
      if (r.gaji == null || r.gaji === '') r.gaji = 6000000;
      if (r.skor == null || r.skor === '') r.skor = 70;
      if (!r.stat) r.stat = 'Probation';
      if (r.aktif == null) r.aktif = 1;
      log('tambah baris #' + r.id);
      return r;
    },
    onEdit: function (row, col, val, old) { log('edit ' + row.nama + ' → ' + col + ': ' + old + ' ⇒ ' + val); save2(); },
    onSave: function (row, isNew) { log((isNew ? 'simpan baru' : 'simpan edit') + ' #' + row.id); save2(); },
    onRemove: function (rws) {
      log('hapus ' + rws.length + ' baris');
      setTimeout(save2, 0);
      return confirm('Hapus ' + rws.length + ' baris terpilih?');
    }
  });

  var rs = document.getElementById('reset2');
  if (rs) rs.onclick = function () { localStorage.removeItem(KEY); location.reload(); };

  /* ---- Demo 3: alur persetujuan — Approve/Reject, Export XLSX/PDF,
 *        form Filter terpusat, Help, formulir 2 kolom ---- */
  var JENIS = ['Cuti', 'Sakit', 'Izin'];
  var CAT = ['Acara keluarga', 'Istirahat', 'Urusan pribadi', 'Demam', 'Menjaga keluarga sakit', 'Kerabat berkunjung'];
  var rows3 = [];
  for (var i3 = 1; i3 <= 40; i3++) {
    rows3.push({
      id: i3,
      karyawan: pick(DEPAN) + ' ' + pick(BELAKANG),
      dep: pick(DEP),
      jenis: pick(JENIS),
      mulai: iso(new Date(2026, int(0, 11), int(1, 28))),
      hari: int(1, 10),
      status: pick(['Pending', 'Pending', 'Approved', 'Rejected']),
      catatan: pick(CAT)
    });
  }
  var B3 = {
    'Pending': 'bg-amber-100 text-amber-700',
    'Approved': 'bg-emerald-100 text-emerald-700',
    'Rejected': 'bg-rose-100 text-rose-700'
  };
  var cols3 = [
    { name: 'id', label: 'No', width: 56, type: 'num', align: 'right', form: false },
    { name: 'karyawan', label: 'Karyawan', width: 170, required: true },
    { name: 'dep', label: 'Departemen', width: 110 },
    { name: 'jenis', label: 'Jenis', width: 90, options: JENIS },
    { name: 'mulai', label: 'Tgl Mulai', width: 110, type: 'date' },
    { name: 'hari', label: 'Hari', width: 70, type: 'num', align: 'right' },
    {
      name: 'status', label: 'Status', width: 100, options: ['Pending', 'Approved', 'Rejected'],
      render: function (v) {
        return '<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium ' + (B3[v] || 'bg-slate-100 text-slate-600') + '">' + v + '</span>';
      }
    },
    { name: 'catatan', label: 'Catatan', width: 200 }
  ];

  window.__g3 = MiniGrid({
    el: '#grid3', columns: cols3, data: rows3,
    height: 320, rowHeight: 30, pageSize: 10,
    crud: true, edit: true,
    filter: false,        /* tanpa baris filter di bawah header… */
    filterForm: true,     /* …dituangkan jadi satu form lewat tombol Filter */
    help: true, formCols: 2,
    actions: [
      {
        id: 'approve', label: 'Approve', icon: 'ok', need: 'some',
        fn: function (rows, g) {
          rows.forEach(function (r) { r.status = 'Approved'; });
          g.render(); log('approve ' + rows.length + ' pengajuan');
        }
      },
      {
        id: 'reject', label: 'Reject', icon: 'no', need: 'some',
        fn: function (rows, g) {
          rows.forEach(function (r) { r.status = 'Rejected'; });
          g.render(); log('reject ' + rows.length + ' pengajuan');
        }
      }
    ],
    onAdd: function (r) {
      r.id = (window.__g3.data.length ? Math.max.apply(null, window.__g3.data.map(function (x) { return x.id; })) : 0) + 1;
      if (!r.status) r.status = 'Pending';
      log('pengajuan baru #' + r.id);
      return r;
    },
    onSave: function (row, isNew) { log((isNew ? 'simpan baru' : 'simpan edit') + ' #' + row.id); },
    onEdit: function (row, col, val, old) { log('edit #' + row.id + ' ' + col + ': ' + old + ' ⇒ ' + val); },
    onRemove: function (rws) { log('hapus ' + rws.length + ' baris'); return confirm('Hapus ' + rws.length + ' baris terpilih?'); }
  });

  /* ---- grid 4: aksi per baris (tanpa checkbox) · form 3 kolom ---- */
  var B4 = {
    'Tinggi': 'bg-rose-100 text-rose-700', 'Sedang': 'bg-amber-100 text-amber-700', 'Rendah': 'bg-slate-100 text-slate-600',
    'Berjalan': 'bg-sky-100 text-sky-700', 'Selesai': 'bg-emerald-100 text-emerald-700', 'Tertunda': 'bg-amber-100 text-amber-700'
  };
  var pill4 = function (v) { return '<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium ' + (B4[v] || 'bg-slate-100 text-slate-600') + '">' + v + '</span>'; };
  var rows4 = [
    { id: 1,  proyek: 'Portal HR',        pemilik: 'Andini P.',   dep: 'SDM',        pri: 'Tinggi', tenggat: '2026-10-12', bobot: 40, status: 'Berjalan', catatan: 'Fase integrasi payroll' },
    { id: 2,  proyek: 'Datamart Sales',   pemilik: 'Bimo A.',     dep: 'Pemasaran',  pri: 'Sedang', tenggat: '2026-11-03', bobot: 25, status: 'Berjalan', catatan: 'Menunggu sumber data' },
    { id: 3,  proyek: 'Audit Akses',      pemilik: 'Citra M.',    dep: 'IT',         pri: 'Tinggi', tenggat: '2026-09-28', bobot: 70, status: 'Berjalan', catatan: 'Review izin trimestral' },
    { id: 4,  proyek: 'Renovasi Gudang',  pemilik: 'Dedi K.',     dep: 'Logistik',   pri: 'Rendah', tenggat: '2027-01-15', bobot: 10, status: 'Tertunda', catatan: 'Menunggu anggaran cair' },
    { id: 5,  proyek: 'Kampanye Q4',      pemilik: 'Eka S.',      dep: 'Pemasaran',  pri: 'Sedang', tenggat: '2026-12-01', bobot: 55, status: 'Berjalan', catatan: 'Materi kreatif direview' },
    { id: 6,  proyek: 'Migrasi ERP',      pemilik: 'Fajar N.',    dep: 'Keuangan',   pri: 'Tinggi', tenggat: '2027-02-20', bobot: 30, status: 'Berjalan', catatan: 'Modul GL selesai' },
    { id: 7,  proyek: 'SOP Keselamatan',  pemilik: 'Gita R.',     dep: 'Umum',       pri: 'Sedang', tenggat: '2026-10-30', bobot: 90, status: 'Berjalan', catatan: 'Finalisasi tanda tangan' },
    { id: 8,  proyek: 'Rekrutmen Massal', pemilik: 'Andini P.',   dep: 'SDM',        pri: 'Tinggi', tenggat: '2026-09-25', bobot: 60, status: 'Berjalan', catatan: '87 pelamar masuk' },
    { id: 9,  proyek: 'Optimasi Rute',    pemilik: 'Dedi K.',     dep: 'Logistik',   pri: 'Sedang', tenggat: '2026-12-18', bobot: 15, status: 'Tertunda', catatan: 'Perlu data GPS armada' },
    { id: 10, proyek: 'Dashboard KPI',    pemilik: 'Bimo A.',     dep: 'IT',         pri: 'Rendah', tenggat: '2027-03-05', bobot: 45, status: 'Berjalan', catatan: 'Prototipe disetujui' },
    { id: 11, proyek: 'Pelatihan Safety', pemilik: 'Gita R.',     dep: 'SDM',        pri: 'Sedang', tenggat: '2026-11-20', bobot: 100, status: 'Selesai',  catatan: '3 angkatan lulus' },
    { id: 12, proyek: 'Renegosiasi Vendor', pemilik: 'Fajar N.',  dep: 'Keuangan',   pri: 'Sedang', tenggat: '2026-10-08', bobot: 80, status: 'Berjalan', catatan: 'Hemat 12% terproyeksi' },
    { id: 13, proyek: 'Rebranding',       pemilik: 'Eka S.',     dep: 'Pemasaran',  pri: 'Rendah', tenggat: '2027-01-30', bobot: 20, status: 'Tertunda', catatan: 'Brief ulang dari direksi' },
    { id: 14, proyek: 'Stock Opname',     pemilik: 'Dedi K.',    dep: 'Logistik',   pri: 'Tinggi', tenggat: '2026-09-30', bobot: 100, status: 'Selesai',  catatan: 'Selisih 0,4%' }
  ];
  var cols4 = [
    { name: 'id', label: 'No', width: 56, type: 'num', align: 'right', form: false },
    { name: 'proyek', label: 'Proyek', width: 150, required: true },
    { name: 'pemilik', label: 'Pemilik', width: 120, required: true },
    { name: 'dep', label: 'Departemen', width: 110 },
    { name: 'pri', label: 'Prioritas', width: 95, options: ['Rendah', 'Sedang', 'Tinggi'], render: pill4 },
    { name: 'tenggat', label: 'Tenggat', width: 105, type: 'date' },
    { name: 'bobot', label: 'Bobot %', width: 80, type: 'num', align: 'right' },
    { name: 'status', label: 'Status', width: 100, options: ['Berjalan', 'Selesai', 'Tertunda'], render: pill4 },
    { name: 'catatan', label: 'Catatan', width: 190 }
  ];
  window.__g4 = MiniGrid({
    el: '#grid4', columns: cols4, data: rows4,
    height: 340, rowHeight: 30, pageSize: 8,
    select: false,          /* tanpa checkbox — aksi berbasis record, bukan seleksi */
    rowActions: true,       /* ikon Detail/Edit/Hapus pada tiap baris */
    add: true, editForm: true, formCols: 3,
    filter: false, filterForm: true, help: true,
    onAdd: function (r) {
      r.id = (window.__g4.data.length ? Math.max.apply(null, window.__g4.data.map(function (x) { return x.id; })) : 0) + 1;
      if (!r.status) r.status = 'Berjalan';
      return r;
    }
  });

  /* ---- pemilih tema (remap variabel warna Tailwind v4) ---- */
  var THEMES = [
    ['light', 'Terang', '#f8fafc', '#4f46e5'],
    ['dark', 'Gelap', '#0b1220', '#818cf8'],
    ['ocean', 'Samudra', '#f2f8fc', '#0e7490'],
    ['forest', 'Hutan', '#f3f8f4', '#047857'],
    ['sunset', 'Senja', '#fdf6f3', '#be123c'],
    ['mono', 'Monokrom', '#fafafa', '#18181b']
  ];
  (function initThemes() {
    var box = document.getElementById('themes');
    if (!box) return;
    var cur = null;
    try { cur = localStorage.getItem('minigrid-theme'); } catch (e) { }
    var set = function (id) {
      if (id === 'light') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = id;
      try { localStorage.setItem('minigrid-theme', id); } catch (e) { }
      box.querySelectorAll('button').forEach(function (b) {
        var on = b.dataset.t === id;
        b.classList.toggle('ring-2', on);
        b.classList.toggle('ring-indigo-500', on);
      });
    };
    box.innerHTML = THEMES.map(function (t) {
      return '<button data-t="' + t[0] + '" title="Tema ' + t[1] + '" class="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100">' +
        '<span class="flex overflow-hidden rounded-full border border-slate-300">' +
          '<i style="background:' + t[2] + '" class="h-3 w-3"></i><i style="background:' + t[3] + '" class="h-3 w-3"></i>' +
        '</span><span class="hidden md:inline">' + t[1] + '</span></button>';
    }).join('');
    box.onclick = function (e) { var b = e.target.closest('[data-t]'); if (b) set(b.dataset.t); };
    set(THEMES.some(function (t) { return t[0] === cur; }) ? cur : 'light');
  })();

  function log(t) {
    var el = document.getElementById('log');
    if (el) el.textContent = t + '  (' + new Date().toLocaleTimeString('id-ID') + ')';
  }
})();
