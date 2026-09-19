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
    detail: function (r) {   /* master-detail: riwayat per baris */
      var EV = ['Penyesuaian gaji berkala', 'Perpanjangan kontrak', 'Mutasi antardepartemen', 'Sertifikasi internal', 'Cuti tahunan diambil', 'Review kinerja semester'];
      var BY = ['HRIS', 'Manajer', 'SDM'];
      var p2 = function (x) { return String(x).padStart(2, '0'); };
      var out = '<table class="w-full text-[11px] text-slate-600"><thead><tr>' +
        ['Tanggal', 'Peristiwa', 'Oleh'].map(function (t) {
          return '<th class="px-2 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">' + t + '</th>';
        }).join('') + '</tr></thead><tbody>';
      for (var k = 0; k < 4; k++) {
        out += '<tr class="border-t border-slate-200"><td class="px-2 py-1">' + (2016 + ((r.id + k * 3) % 9)) + '-' + p2(1 + (r.id + k) % 12) + '-' + p2(1 + (r.id * 7 + k) % 27) +
          '</td><td class="px-2 py-1">' + EV[(r.id + k) % EV.length] + '</td><td class="px-2 py-1">' + BY[(r.id + k) % 3] + '</td></tr>';
      }
      return out + '</tbody></table>';
    },
    onSelect: function (ids) { log('pilih ' + ids.length + ' baris'); },
    onRefresh: function (g) {
      return new Promise(function (res) {
        setTimeout(function () {
          g.data = g.o.data = rows(50000);
          g.s.page = 1; g.s.sel.clear(); g._skey = ''; g.render(); res();
        }, 150);
      });
    }
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
    },
    onRefresh: function (g) {
      var sv = null;
      try { sv = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
      g.data = g.o.data = Array.isArray(sv) && sv.length ? sv : rows(12);
      g.s.page = 1; g.s.sel.clear(); g._skey = ''; g.render();
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
  var rows3init = JSON.parse(JSON.stringify(rows3));
  window.__g3init = rows3init;
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
    onRemove: function (rws) { log('hapus ' + rws.length + ' baris'); return confirm('Hapus ' + rws.length + ' baris terpilih?'); },
    onRefresh: function (g) {
      g.data = g.o.data = JSON.parse(JSON.stringify(rows3init));
      g.s.page = 1; g.s.sel.clear(); g._skey = ''; g.render();
    }
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
  var rows4init = JSON.parse(JSON.stringify(rows4));
  window.__g4init = rows4init;
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
    },
    onRefresh: function (g) {
      g.data = g.o.data = JSON.parse(JSON.stringify(rows4init));
      g.s.page = 1; g.s.sel.clear(); g._skey = ''; g.render();
    }
  });

  /* ---- Demo 5: data dari API · refresh · status muat ---- */
  var cols5 = [
    { name: 'id', label: 'ID', width: 64, type: 'num', align: 'right' },
    { name: 'nama', label: 'Nama', width: 170 },
    { name: 'dep', label: 'Departemen', width: 110 },
    { name: 'jabatan', label: 'Jabatan', width: 120 },
    { name: 'kota', label: 'Kota', width: 100 },
    { name: 'gaji', label: 'Gaji / Bulan', width: 120, type: 'num', format: 'money', align: 'right' },
    { name: 'masuk', label: 'Tgl Masuk', width: 104, type: 'date' },
    { name: 'stat', label: 'Status', width: 100, render: function (v) { return '<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium ' + (badge[v] || 'bg-slate-100 text-slate-600') + '">' + v + '</span>'; } }
  ];
  function muatAPI(g) {
    g.setLoading(true);
    var selesai = function (list, src) {
      g.data = g.o.data = list;
      g.s.page = 1; g.s.sel.clear(); g._skey = ''; g.render();
      g.setLoading(false);
      var el = document.getElementById('api5');
      if (el) el.textContent = src + ' · ' + list.length + ' baris · ' + new Date().toLocaleTimeString('id-ID');
    };
    if (location.protocol === 'file:') {   /* tanpa server: simulasi API berlatensi */
      return new Promise(function (res) {
        setTimeout(function () { selesai(rows(500), 'sumber: simulasi API (latensi 450 ms — jalankan server.mjs untuk API asli)'); res(); }, 450);
      });
    }
    var ctl = 'AbortController' in window ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 1500);   /* server mati/proxy menggantung */
    return fetch('api/karyawan', ctl ? { signal: ctl.signal } : undefined).then(function (r) {
      clearTimeout(to);
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (j) { selesai(j, 'sumber: API server — GET api/karyawan'); })
      .catch(function () {
        clearTimeout(to);
        return new Promise(function (res) {
          setTimeout(function () { selesai(rows(500), 'sumber: simulasi API (server tidak terjangkau)'); res(); }, 450);
        });
      });
  }
  window.__g5 = MiniGrid({
    el: '#grid5', columns: cols5, data: [],
    height: 320, rowHeight: 30, pageSize: 10, frozen: 1,
    filter: false, filterForm: true, formCols: 2,
    onRefresh: muatAPI
  });
  muatAPI(window.__g5);

  /* ---- Demo 6: mode server-side — pagination/sort/filter diproses server ---- */
  var SIM10 = rows(10000);
  function prosesHalaman(list, p) {   /* cermin logika /api/halaman (fallback file://) */
    var lv = function (r, k) { return String(r[k] == null ? '' : r[k]).toLowerCase(); };
    var m1 = function (r, f) {
      var v = lv(r, f.f), t = String(f.q == null ? '' : f.q).toLowerCase();
      switch (f.op) {
        case 'eq': return v === t; case 'ne': return v !== t;
        case 'bw': return v.indexOf(t) === 0; case 'ew': return v.slice(-t.length) === t;
        case 'nn': return v !== ''; case 'nl': return v === '';
        case 'gt': return Number(r[f.f]) > Number(f.q); case 'ge': return Number(r[f.f]) >= Number(f.q);
        case 'lt': return Number(r[f.f]) < Number(f.q); case 'le': return Number(r[f.f]) <= Number(f.q);
        default: return v.indexOf(t) > -1;
      }
    };
    var out = list;
    if (p.q) out = out.filter(function (r) { return Object.keys(r).some(function (k) { return lv(r, k).indexOf(p.q.toLowerCase()) > -1; }); });
    Object.keys(p.filters).forEach(function (k) { var f = p.filters[k]; out = out.filter(function (r) { return m1(r, { f: k, op: f.op, q: f.q }); }); });
    if (p.rules.length) out = out.filter(function (r) { var rs = p.rules.map(function (f) { return m1(r, f); }); return p.join === 'OR' ? rs.some(Boolean) : rs.every(Boolean); });
    if (p.sort.length) {
      out = out.slice().sort(function (a, b) {
        for (var q2 = 0; q2 < p.sort.length; q2++) { var k = p.sort[q2][0], d = p.sort[q2][1]; if (a[k] < b[k]) return -d; if (a[k] > b[k]) return d; }
        return 0;
      });
    }
    return { total: out.length, rows: out.slice((p.page - 1) * p.size, p.page * p.size) };
  }
  window.__g6 = MiniGrid({
    el: '#grid6', columns: cols5, data: [],
    height: 320, rowHeight: 30, pageSize: 10,
    filter: false, filterForm: true, formCols: 2,
    server: function (p) {
      var src6 = function (t) {
        var el = document.getElementById('api6');
        if (el) el.textContent = 'sumber: ' + t + ' · ' + new Date().toLocaleTimeString('id-ID');
      };
      var sim = function () {   /* tanpa server / tak terjangkau: simulasi server-side lokal */
        return new Promise(function (res) {
          setTimeout(function () { src6('simulasi server-side lokal (latensi 300 ms)'); res(prosesHalaman(SIM10, p)); }, 300);
        });
      };
      if (location.protocol === 'file:') return sim();
      var qs = new URLSearchParams();
      ['page', 'size', 'q', 'join'].forEach(function (k) { qs.set(k, p[k]); });
      qs.set('sort', JSON.stringify(p.sort)); qs.set('filters', JSON.stringify(p.filters)); qs.set('rules', JSON.stringify(p.rules));
      var ctl = 'AbortController' in window ? new AbortController() : null;
      var to = setTimeout(function () { if (ctl) ctl.abort(); }, 1500);
      return fetch('api/halaman?' + qs, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
        clearTimeout(to);
        if (!r.ok) throw 0;
        return r.json();
      }).then(function (j) { src6('server — GET api/halaman (' + j.total + ' baris)'); return j; })
        .catch(function () { clearTimeout(to); return sim(); });
    },
    onRefresh: function (g) { g.render(); }
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


  /* ---- dua bahasa: ID / EN (tersimpan di localStorage) ---- */
  var PAGE = {
    sub: { id: `Data grid ala javascript grid — Tailwind CSS v4 + vanilla JS, satu file HTML, jalan tanpa internet.`, en: `A javascript grid-style data grid — Tailwind CSS v4 + vanilla JS, single HTML file, runs offline.` },
    theme: { id: `Tema`, en: `Theme` },
    s1t: { id: `50.000 baris · kolom beku · multi-sort · filter per kolom`, en: `50,000 rows · frozen columns · multi-sort · per-column filters` },
    s1d: { id: `klik header = urutkan · <kbd class="rounded border border-slate-300 px-1">Shift</kbd>+klik = multi-sort · geser tepi header = ubah lebar`, en: `click a header = sort · <kbd class="rounded border border-slate-300 px-1">Shift</kbd>+click = multi-sort · drag the header edge = resize` },
    s2t: { id: `CRUD lengkap ala javascript grid`, en: `Full javascript grid-style CRUD` },
    s2d: { id: `<b>+ Tambah / Edit / Detail / Hapus</b> lewat formulir modal (dengan validasi, terbuka di tengah layar & bisa digeser dari bilah judul) · klik ganda sel = edit inline · data tersimpan di <code>localStorage</code>`, en: `<b>+ Add / Edit / View / Delete</b> via modal forms (validated, centered, draggable by the title bar) · double-click a cell = inline edit · data persisted in <code>localStorage</code>` },
    reset2: { id: `reset data contoh`, en: `reset sample data` },
    s3t: { id: `Alur persetujuan: Approve/Reject · Export XLSX/PDF · form Filter · Help · form 2 kolom`, en: `Approval flow: Approve/Reject · XLSX/PDF export · Filter form · Help · 2-column form` },
    s3d: { id: `Edit & Detail aktif hanya saat <b>tepat 1</b> baris terpilih · Approve/Reject/Hapus aktif saat <b>≥1</b> terpilih · tanpa baris filter di bawah header (semua filter dituangkan ke tombol <b>Filter</b>)`, en: `Edit & View enable only with <b>exactly 1</b> row selected · Approve/Reject/Delete with <b>≥1</b> · no filter row under the header (all filters live behind the <b>Filter</b> button)` },
    s4t: { id: `Aksi per baris · tanpa checkbox · form 3 kolom`, en: `Per-row actions · no checkbox · 3-column form` },
    s4d: { id: `<b>Detail/Edit/Hapus</b> lewat ikon pada kolom <b>Aksi</b> — berbasis record, bukan baris terpilih · formulir Tambah/Edit tersusun <b>3 kolom</b>`, en: `<b>View/Edit/Delete</b> via icons in the <b>Actions</b> column — record-based, not selection-based · Add/Edit form laid out in <b>3 columns</b>` },
    s5t: { id: `Data dari API · refresh · status muat`, en: `Data from an API · refresh · load status` },
    s5d: { id: `Baris dimuat lewat <code>fetch('api/karyawan')</code> ke <code>server.mjs</code> · lewat <code>file://</code> otomatis fallback ke simulasi API berlatensi · overlay <b>Memuat…</b> tampil selama permintaan · tombol <b>Refresh</b> memuat ulang`, en: `Rows load via <code>fetch('api/karyawan')</code> against <code>server.mjs</code> · on <code>file://</code> it falls back to a latency-simulated API · a <b>Loading…</b> overlay shows during requests · <b>Refresh</b> reloads` },
    s6t: { id: `Mode server-side · 10.000 baris di server`, en: `Server-side mode · 10,000 rows on the server` },
    s6d: { id: `Pagination, sort, filter, dan pencarian diproses di <code>GET api/halaman</code> (server.mjs) — grid hanya menerima satu halaman · lewat <code>file://</code> fallback ke simulasi server-side lokal · navigasi keyboard: <kbd class="rounded border border-slate-300 px-1">Tab</kbd> ke tabel, panah pindah sel, <kbd class="rounded border border-slate-300 px-1">Spasi</kbd> pilih, <kbd class="rounded border border-slate-300 px-1">Enter</kbd> edit`, en: `Paging, sorting, filtering and search run in <code>GET api/halaman</code> (server.mjs) — the grid only receives one page · on <code>file://</code> it falls back to a local server-side simulation · keyboard: <kbd class="rounded border border-slate-300 px-1">Tab</kbd> into the table, arrows to move, <kbd class="rounded border border-slate-300 px-1">Space</kbd> to select, <kbd class="rounded border border-slate-300 px-1">Enter</kbd> to edit` },
    dPakai: { id: `Pakai`, en: `Usage` },
    dOpsi: { id: `Opsi`, en: `Options` },
    o_cols: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">columns[]</dt><dd class="text-slate-600"><code>name, label, width, type (str|num|date), format, align, render(), sortable, filter, editable, hidden, search</code></dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">columns[]</dt><dd class="text-slate-600"><code>name, label, width, type (str|num|date), format, align, render(), sortable, filter, editable, hidden, search</code></dd>` },
    o_data: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">data</dt><dd class="text-slate-600">array objek polos — mode klien. Ganti <code>grid.data</code> lalu <code>grid.render()</code>.</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">data</dt><dd class="text-slate-600">plain array of objects — client mode. Replace <code>grid.data</code> then <code>grid.render()</code>.</dd>` },
    o_select: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">select</dt><dd class="text-slate-600"><code>'multi'</code> (kotak centang) | <code>'single'</code> | <code>false</code> · <code>selectAll</code>: <code>'page'</code> (bawaan, ala javascript grid) | <code>'view'</code> · saat <code>false</code> tombol berbasis pilihan (Edit/Detail/Hapus) disembunyikan</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">select</dt><dd class="text-slate-600"><code>'multi'</code> (checkboxes) | <code>'single'</code> | <code>false</code> · <code>selectAll</code>: <code>'page'</code> (default, javascript grid-style) | <code>'view'</code> · when <code>false</code>, selection-based buttons (Edit/View/Delete) are hidden</dd>` },
    o_filter: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">filter/search</dt><dd class="text-slate-600">baris filter per kolom ber-operator (= ≠ ∋ ^ $ &gt; ≥ &lt; ≤ ada kosong) + pencarian global · tombol <b>Filter</b> = saring cepat + <b>penyusun kondisi lanjutan</b>: pilih bidang, tambah kondisi (satu bidang boleh lebih dari satu, mis. <code>no &gt; 10</code> dan <code>no ≤ 20</code>), digabung AND/OR · badge = jumlah kondisi aktif</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">filter/search</dt><dd class="text-slate-600">operator filter row per column (= ≠ ∋ ^ $ &gt; ≥ &lt; ≤ present empty) + global search · <b>Filter</b> button = quick filters + <b>advanced condition builder</b>: pick a field, add conditions (a field may appear twice, e.g. <code>no &gt; 10</code> and <code>no ≤ 20</code>), joined with AND/OR · badge = active condition count</dd>` },
    o_frozen: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">frozen</dt><dd class="text-slate-600">jumlah kolom kiri yang dibekukan (sticky)</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">frozen</dt><dd class="text-slate-600">number of frozen (sticky) columns on the left</dd>` },
    o_crud: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">crud</dt><dd class="text-slate-600">jalan pintas tombol <b>+ Tambah · Edit · Detail · Hapus</b> via form modal (ala javascript grid navGrid); atau satu-satu: <code>add / editForm / view / remove</code>, <code>edit</code> = edit inline lewat klik ganda</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">crud</dt><dd class="text-slate-600">shortcut for <b>+ Add · Edit · View · Delete</b> buttons via modal forms (javascript grid navGrid-style); or individually: <code>add / editForm / view / remove</code>, <code>edit</code> = inline edit via double-click</dd>` },
    o_actions: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">actions</dt><dd class="text-slate-600">tombol ikon tambahan: <code>{id, label, icon, need: 'one'|'some', fn(rows, grid)}</code> — mis. Approve/Reject</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">actions</dt><dd class="text-slate-600">extra icon buttons: <code>{id, label, icon, need: 'one'|'some', fn(rows, grid)}</code> — e.g. Approve/Reject</dd>` },
    o_ff: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">filterForm/help</dt><dd class="text-slate-600">tombol <b>Filter</b> = semua filter kolom dalam satu form · tombol <b>Help</b> = modal panduan (teks bisa diganti lewat <code>helpText</code>)</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">filterForm/help</dt><dd class="text-slate-600"><b>Filter</b> button = every column filter in one form · <b>Help</b> button = guide modal (replace the text via <code>helpText</code>)</dd>` },
    o_refresh: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">refresh</dt><dd class="text-slate-600">true (bawaan) = tombol Refresh di toolbar; isi <code>onRefresh(grid)</code> untuk memuat ulang data — bila mengembalikan Promise, overlay "Memuat…" tampil otomatis</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">refresh</dt><dd class="text-slate-600">true (default) = toolbar Refresh button; provide <code>onRefresh(grid)</code> to reload — return a Promise and the "Loading…" overlay shows automatically</dd>` },
    o_ra: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">rowActions</dt><dd class="text-slate-600">true = ikon Detail/Edit/Hapus per baris (tanpa perlu centang/pilih)</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">rowActions</dt><dd class="text-slate-600">true = per-row View/Edit/Delete icons (no checkbox/selection needed)</dd>` },
    o_detail: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">detail</dt><dd class="text-slate-600">fn(row) mengembalikan HTML → master-detail: chevron kiri membuka baris detail (scroll virtual tetap akurat)</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">detail</dt><dd class="text-slate-600">fn(row) returning HTML → master-detail: the left chevron expands a detail row (virtual scroll stays exact)</dd>` },
    o_server: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">server</dt><dd class="text-slate-600">fn(params)→Promise{rows, total} = mode server-side: sort/filter/paging di server, grid hanya render satu halaman</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">server</dt><dd class="text-slate-600">fn(params)→Promise{rows, total} = server-side mode: sort/filter/paging on the server, the grid renders one page</dd>` },
    o_fc: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">formCols</dt><dd class="text-slate-600">jumlah kolom tata letak form Tambah/Edit (1, 2, atau 3)</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">formCols</dt><dd class="text-slate-600">columns in the Add/Edit form layout (1, 2, or 3)</dd>` },
    o_tema: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">tema</dt><dd class="text-slate-600">enam tema halaman (Terang, Gelap, Samudra, Hutan, Senja, Monokrom), tersimpan di localStorage; implementasi: remap variabel <code>--color-*</code> Tailwind v4 [data-theme]</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">theme</dt><dd class="text-slate-600">six page themes (Light, Dark, Ocean, Forest, Sunset, Mono), persisted in localStorage; implemented by remapping Tailwind v4 <code>--color-*</code> vars via [data-theme]</dd>` },
    o_export: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">Export</dt><dd class="text-slate-600">menu CSV / XLSX / PDF — penulis tanpa dependensi, mengikuti hasil filter & urut</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">Export</dt><dd class="text-slate-600">CSV / XLSX / PDF menu — dependency-free writers, follow the filtered & sorted result</dd>` },
    o_kf: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">kolom: form</dt><dd class="text-slate-600"><code>options: [...]</code> jadi select · <code>required</code> validasi wajib · <code>bool</code> jadi checkbox · <code>form: false</code> sembunyikan dari formulir · <code>editable: false</code> blokir edit</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">column: form</dt><dd class="text-slate-600"><code>options: [...]</code> renders a select · <code>required</code> = mandatory validation · <code>bool</code> renders a checkbox · <code>form: false</code> hides from the form · <code>editable: false</code> blocks editing</dd>` },
    o_tinggi: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">tinggi</dt><dd class="text-slate-600"><code>height, rowHeight, pageSize, pageSizes, zebra, resize, chooser, worldO()</code></dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">misc</dt><dd class="text-slate-600"><code>height, rowHeight, pageSize, pageSizes, zebra, resize, chooser, worldO()</code></dd>` },
    o_metode: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">metode</dt><dd class="text-slate-600"><code>render() · refresh() · sortBy(n, tambah) · selected() · clearSel() · toCSV()</code></dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">methods</dt><dd class="text-slate-600"><code>render() · refresh() · sortBy(n, add) · selected() · clearSel() · toCSV()</code></dd>` },
    o_cb: { id: `<dt class="w-24 shrink-0 font-mono text-indigo-600">callback</dt><dd class="text-slate-600"><code>onSave(row, isNew) · onEdit(row, col, val, old) · onAdd(blank) · onRemove(rows) · onSelect(ids)</code> — tempat menyimpan ke localStorage/API</dd>`, en: `<dt class="w-24 shrink-0 font-mono text-indigo-600">callbacks</dt><dd class="text-slate-600"><code>onSave(row, isNew) · onEdit(row, col, val, old) · onAdd(blank) · onRemove(rows) · onSelect(ids)</code> — where you persist to localStorage/API</dd>` },
    dOp: { id: `Operator filter per tipe kolom`, en: `Filter operators by column type` },
    dOpD: { id: `Teks: = ≠ ∋(mengandung) ^(awalan) $(akhiran). Angka &amp; tanggal: = ≠ &gt; ≥ &lt; ≤. Semua kolom: <i>ada</i> / <i>kosong</i>. Nilai tanggal ditulis <code>2024-01-31</code> atau <code>2024</code>.`, en: `Text: = ≠ ∋(contains) ^(starts with) $(ends with). Numbers &amp; dates: = ≠ &gt; ≥ &lt; ≤. All columns: <i>present</i> / <i>empty</i>. Write dates as <code>2024-01-31</code> or <code>2024</code>.` },
    cmpT: { id: `Perbandingan stack (semuanya offline, Tailwind v4 di-inline)`, en: `Stack comparison (all offline, Tailwind v4 inlined)` },
    cmpH1: { id: `Stack`, en: `Stack` },
    cmpH2: { id: `Runtime tambahan`, en: `Extra runtime` },
    cmpH3: { id: `Ukuran total halaman`, en: `Total page size` },
    cmpH4: { id: `Catatan`, en: `Notes` },
    cmpA1: { id: `Tailwind v4 + vanilla JS (halaman ini)`, en: `Tailwind v4 + vanilla JS (this page)` },
    cmpA2: { id: `Tailwind v4 + <a class="text-indigo-600 underline" href="./alpine.html">Alpine.js 3</a>`, en: `Tailwind v4 + <a class="text-indigo-600 underline" href="./alpine.html">Alpine.js 3</a>` },
    cmpA3: { id: `Svelte (compiled)`, en: `Svelte (compiled)` },
    cmpR: { id: `Rekomendasi: <b>vanilla JS + Tailwind v4</b> untuk satu file offline ala javascript grid — tidak ada runtime, tidak ada langkah build di sisi pengguna, dan seluruh logika grid ±31 KB. Alpine hanya unggul pada kenyamanan penulisan markup.`, en: `Recommendation: <b>vanilla JS + Tailwind v4</b> for a javascript grid-style offline single file — no runtime, no user-side build step, and the entire grid logic is ±31 KB. Alpine only wins on markup-writing comfort.` },
    bT: { id: `Build ulang CSS (butuh internet sekali)`, en: `Rebuilding the CSS (needs internet once)` },
    bD: { id: `Hasil <code>index.html</code> bisa dibuka dengan <code>file://</code> atau ditaruh di USB/intranet tanpa server dan tanpa koneksi.`, en: `The resulting <code>index.html</code> opens via <code>file://</code> or can live on a USB stick/intranet with no server and no connection.` },
    foot: { id: `MiniGrid · ~9 KB JS + ~15 KB CSS · tanpa jQuery, tanpa framework`, en: `MiniGrid · ~9 KB JS + ~15 KB CSS · no jQuery, no framework` }
  };

  function applyLang(l) {
    try { localStorage.setItem('minigrid-lang', l); } catch (e) {}
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var d = PAGE[el.dataset.i18n];
      if (d) el.innerHTML = d[l] || d.id;
    });
    [window.__g1, window.__g2, window.__g3, window.__g4, window.__g5, window.__g6].forEach(function (g) { if (g) g.setLang(l); });
    var box = document.getElementById('langs');
    if (box) box.querySelectorAll('button').forEach(function (b) {
      var on = b.dataset.l === l;
      b.classList.toggle('bg-indigo-600', on);
      b.classList.toggle('text-white', on);
      b.classList.toggle('bg-white', !on);
    });
  }

  (function initLangs() {
    var box = document.getElementById('langs');
    if (!box) return;
    box.onclick = function (e) {
      var b = e.target.closest('[data-l]');
      if (b) applyLang(b.dataset.l === 'en' ? 'en' : 'id');
    };
    var cur = 'id';
    try { cur = localStorage.getItem('minigrid-lang') || 'id'; } catch (e) {}
    applyLang(cur === 'en' ? 'en' : 'id');
  })();

  function log(t) {
    var el = document.getElementById('log');
    if (el) el.textContent = t + '  (' + new Date().toLocaleTimeString('id-ID') + ')';
  }
})();
