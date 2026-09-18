/* ============================================================================
 * minigrid.js — data grid ala jqGrid · vanilla JS · 0 dependency
 * sort multi-kolom · filter per kolom beroperator · pencarian global · pager
 * virtual scroll · kolom beku · pilih baris · resize kolom · edit inline
 * tambah/hapus · pilih kolom · ekspor CSV
 * ============================================================================ */
(function (global) {
  'use strict';

  var OPS = { eq: '=', ne: '≠', cn: '∋', bw: '^', ew: '$', gt: '>', gte: '≥', lt: '<', lte: '≤', nn: 'ada', nl: 'kosong' };
  var NUMOPS = { eq: 1, ne: 1, gt: 1, gte: 1, lt: 1, lte: 1, nn: 1, nl: 1 };

  /* ikon SVG inline (stroke, 14px) — tanpa dependency */
  var IC = function (p) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 shrink-0">' + p + '</svg>';
  };
  var ICONS = {
    add: IC('<path d="M12 5v14M5 12h14"/>'),
    edit: IC('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
    view: IC('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    del: IC('<path d="M3 6h18M8 6V4h8v2m1 0-1 14H8L7 6"/>'),
    cols: IC('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16M15 4v16"/>'),
    export: IC('<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>'),
    filter: IC('<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>'),
    help: IC('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7"/><path d="M12 17h.01"/>'),
    ok: IC('<path d="M20 6 9 17l-5-5"/>'),
    no: IC('<path d="M18 6 6 18M6 6l12 12"/>')
  };
  var RAB = 'flex h-6 w-6 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-indigo-50 hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500';
  var RAD = 'flex h-6 w-6 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500';
  var BTN = 'flex h-6 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-xs outline-none hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 active:translate-y-px disabled:opacity-40 disabled:hover:border-slate-300';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var fmt = function (v, c) {
    if (v == null || v === '') return '';
    if (c.format === 'num') return Number(v).toLocaleString('id-ID');
    if (c.format === 'money') return Number(v).toLocaleString('id-ID');
    return v;
  };
  function coerce(v, type) {
    if (v == null || v === '') return '';
    if (type === 'num') { var n = Number(v); return isFinite(n) ? n : ''; }
    if (type === 'date') { var d = new Date(v); return isNaN(d) ? '' : d.getTime(); }
    return String(v).toLowerCase();
  }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function hit(op, v, q, type) {
    if (op === 'nn') return v !== '';
    if (op === 'nl') return v === '';
    if (q === '') return true;
    if (type === 'num' || type === 'date') {
      var n = Number(q); if (!isFinite(n)) return true;
      switch (op) {
        case 'eq': return v === n; case 'ne': return v !== n;
        case 'gt': return v > n; case 'gte': return v >= n;
        case 'lt': return v < n; case 'lte': return v <= n;
      }
      return true;
    }
    var s = String(q).toLowerCase();
    switch (op) {
      case 'eq': return v === s; case 'ne': return v !== s;
      case 'bw': return v.indexOf(s) === 0;
      case 'ew': return v.slice(-s.length) === s;
      default: return v.indexOf(s) > -1;
    }
  }

  var SHELL =
    '<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">' +
      '<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">' +
        '<div class="relative flex flex-wrap items-center gap-1" data-role="tools"></div>' +
        '<div class="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">' +
          '<input data-role="q" type="search" placeholder="Cari semua kolom… (Enter)" class="w-full min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-44 sm:flex-none">' +
          '<span data-role="info" class="ml-auto whitespace-nowrap text-xs tabular-nums text-slate-500 sm:ml-0"></span>' +
        '</div>' +
      '</div>' +
      '<div data-role="scroller" class="overflow-auto bg-white">' +
        '<table class="border-collapse text-xs" style="table-layout:fixed;width:100%">' +
          '<colgroup data-role="cg"></colgroup>' +
          '<thead data-role="head" class="mg-head sticky top-0 z-10"></thead>' +
          '<tbody data-role="body" class="mg-body relative"></tbody>' +
        '</table>' +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-2 py-1.5" data-role="pager"></div>' +
    '</div>';

  function Grid(opts) {
    if (!(this instanceof Grid)) return new Grid(opts);
    var o = this.o = Object.assign({
      columns: [], data: [], page: 1, pageSize: 25,
      pageSizes: [10, 25, 50, 100, 500], height: 420, rowHeight: 32,
      frozen: 0, select: 'multi', selectAll: 'page', filter: true, search: true, edit: false,
      resize: true, add: false, remove: false, editForm: false, view: false, crud: false,
      chooser: true, zebra: true, filterForm: false, help: false, formCols: 1, rowActions: false, actions: [],
      rowId: function (r, i) { return r.id != null ? r.id : i; },
      onEdit: null, onAdd: null, onRemove: null, onSelect: null
    }, opts);
    if (o.crud) o.add = o.editForm = o.view = o.remove = true;   /* pintasan CRUD lengkap */

    this.data = o.data;
    this.s = { page: o.page, size: o.pageSize, sort: [], filter: {}, rules: [], join: 'AND', q: '', sel: new Set() };
    this._in = {}; this._rev = 0; this.ms = 0;
    this.view = []; this.pageRows = [];
    this._f = -1; this._l = -1; this._pv = '';
    this._sk = new WeakMap();            // cache nilai terurut per baris
    this._skey = '';

    this.el = typeof o.el === 'string' ? document.querySelector(o.el) : o.el;
    this.el.innerHTML = SHELL;
    var $ = function (n) { return this.el.querySelector('[data-role=' + n + ']'); }.bind(this);
    this.r = { tools: $('tools'), q: $('q'), info: $('info'), sc: $('scroller'), cg: $('cg'), head: $('head'), body: $('body'), pager: $('pager') };
    if (!o.search) this.r.q.remove();

    this.cols = o.columns.map(function (c) {
      return Object.assign({ width: 120, type: 'str', sortable: true, hidden: false }, c);
    });
    this.r.sc.style.height = o.height + 'px';
    this._offsets();
    this._wire();
    this.render();
  }
  var P = Grid.prototype;

  P.col = function (n) { for (var i = 0; i < this.cols.length; i++) if (this.cols[i].name === n) return this.cols[i]; return null; };
  P.vis = function () { return this.cols.filter(function (c) { return !c.hidden; }); };
  P._offsets = function () {
    var left = this.o.select === 'multi' ? 36 : 0;
    this.cols.forEach(function (c) { c._left = left; if (!c.hidden) left += c.width; });
  };
  P.idOf = function (r, i) { return String(this.o.rowId(r, i)); };

  /* ------------------------------------------------------- pipeline data */
  P._recompute = function () {
    var s = this.s, self = this, t0 = performance.now();
    var fs = [];
    Object.keys(s.filter).forEach(function (k) {
      var f = s.filter[k], c = self.col(k);
      if (c && f && String(f.q).trim() !== '') fs.push([c, f]);
    });
    var rp = [];
    (s.rules || []).forEach(function (r) {
      var c = self.col(r.f);
      if (c && (String(r.q).trim() !== '' || r.op === 'nn' || r.op === 'nl')) rp.push([c, r]);
    });
    var joinOr = s.join === 'OR';
    var q = s.q.toLowerCase();
    var gcols = q ? this.vis().filter(function (c) { return c.search !== false; }) : [];

    var out = [];
    for (var i = 0; i < this.data.length; i++) {
      var r = this.data[i], ok = true;
      for (var j = 0; j < fs.length; j++) {
        if (!hit(fs[j][1].op, coerce(r[fs[j][0].name], fs[j][0].type), fs[j][1].q, fs[j][0].type)) { ok = false; break; }
      }
      if (ok && rp.length) {
        var m = !joinOr;
        for (var b = 0; b < rp.length; b++) {
          var hh = hit(rp[b][1].op, coerce(r[rp[b][0].name], rp[b][0].type), rp[b][1].q, rp[b][0].type);
          if (joinOr) { if (hh) { m = true; break; } }
          else if (!hh) { m = false; break; }
        }
        ok = m;
      }
      if (ok && q) {
        ok = false;
        for (var g = 0; g < gcols.length; g++) {
          if (String(r[gcols[g].name] == null ? '' : r[gcols[g].name]).toLowerCase().indexOf(q) > -1) { ok = true; break; }
        }
      }
      if (ok) out.push(r);
    }

    var key = JSON.stringify(s.sort);
    if (s.sort.length) {
      if (key !== this._skey) { this._prepSort(s.sort); this._skey = key; }
      var self2 = this;
      out.sort(function (a, b) { return self2._sortCmp(a, b); });
    }

    this.view = out;
    this.ms = Math.round((performance.now() - t0) * 10) / 10;
    var pages = Math.max(1, Math.ceil(out.length / s.size));
    if (s.page > pages) s.page = pages;
    if (s.page < 1) s.page = 1;
    this.pageRows = out.slice((s.page - 1) * s.size, s.page * s.size);
  };

  /* nilai ter- coerce dihitung sekali per (baris × kolom urut) lalu di-cache */
  P._prepSort = function (sort) {
    var cache = this._sk;
    this._sf = sort.map(function (sd) {
      var c = this.col(sd.n) || { type: 'str' }, name = sd.n, dir = sd.d;
      return {
        d: dir, get: function (r) {
          var m = cache.get(r);
          if (!m) { m = {}; cache.set(r, m); }
          if (!(name in m)) m[name] = coerce(r[name], c.type);
          return m[name];
        }
      };
    }, this);
  };
  P._sortCmp = function (a, b) {
    var f = this._sf;
    for (var i = 0; i < f.length; i++) {
      var r = cmp(f[i].get(a), f[i].get(b));
      if (r) return r * f[i].d;
    }
    return 0;
  };

  P.render = function () {
    this._recompute(); this._head(); this._cols(); this._paint(true); this._pager(); this._info();
  };

  /* ------------------------------------------------------------ struktur */
  P._cols = function () {
    var w = this.o.select === 'multi' ? '<col style="width:36px">' : '';
    this.vis().forEach(function (c) { w += '<col style="width:' + c.width + 'px">'; });
    if (this.o.rowActions) w += '<col style="width:92px">';
    this.r.cg.innerHTML = w;
  };

  P._head = function () {
    var self = this, s = this.s, multi = this.o.select === 'multi';
    var h = '<tr>';
    if (multi) {
      h += '<th class="frz0 border-b border-r border-slate-300 bg-slate-100 p-0 text-center align-middle" style="position:sticky;left:0;z-index:3">' +
           '<input type="checkbox" data-role="all" class="size-3.5 accent-indigo-600"></th>';
    }
    this.vis().forEach(function (c, i) {
      var sd = null;
      for (var k = 0; k < s.sort.length; k++) if (s.sort[k].n === c.name) sd = s.sort[k];
      var frz = i < self.o.frozen;
      h += '<th class="bg-slate-100 p-0 align-top' + (frz ? ' frz' : '') + '"' +
           (frz ? ' style="position:sticky;left:' + c._left + 'px;z-index:2"' : '') + '>' +
           '<div class="flex items-center gap-1 border-b border-slate-300 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600' +
             (c.sortable ? ' cursor-pointer select-none hover:bg-slate-200' : '') + '"' +
             (c.sortable ? ' data-sort="' + c.name + '"' : '') + '>' +
             '<span class="truncate">' + esc(c.label) + '</span>' +
             '<span class="ml-auto shrink-0 text-[9px]">' +
               (sd ? (sd.d > 0 ? '▲' : '▼') : '<span class="text-slate-300">↕</span>') +
               (s.sort.length > 1 && sd ? '<sup class="text-indigo-600">' + (s.sort.indexOf(sd) + 1) + '</sup>' : '') +
             '</span>' +
             (self.o.resize ? '<span data-rz="' + i + '" class="-mr-2 ml-1 h-4 w-2 shrink-0 cursor-col-resize hover:bg-indigo-400"></span>' : '') +
           '</div>' +
           (self.o.filter && c.filter !== false
             ? '<div class="flex items-center gap-1 bg-white px-1 py-1">' +
                 '<select data-op="' + c.name + '" class="h-5 shrink-0 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-500 outline-none">' +
                   Object.keys(OPS)
                     .filter(function (k) { return c.type === 'num' || c.type === 'date' ? NUMOPS[k] : true; })
                     .map(function (k) {
                       return '<option value="' + k + '"' + ((s.filter[c.name] || {}).op === k ? ' selected' : '') + '>' + OPS[k] + '</option>';
                     }).join('') +
                 '</select>' +
                 '<input data-f="' + c.name + '" class="h-5 w-full min-w-0 rounded border border-slate-200 px-1 text-[11px] outline-none focus:border-indigo-500" placeholder="…">' +
               '</div>'
             : '') +
           '</th>';
    });
    if (this.o.rowActions) h += '<th class="bg-slate-100 p-0 align-top"><div class="border-b border-slate-300 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">Aksi</div></th>';
    h += '</tr>';
    if (this.r.head.innerHTML !== h) this.r.head.innerHTML = h;
    this._inputs();
    this._headEvents();
  };

  /* input filter disimpan di cache agar fokus/kursor tidak hilang saat header
   * dibangun ulang; atribut data-f ikut dipindah agar selector tetap jalan. */
  P._inputs = function () {
    var self = this, s = this.s;
    this.vis().forEach(function (c) {
      var slot = self.r.head.querySelector('[data-f="' + c.name + '"]');
      if (!slot) return;
      var inp = self._in[c.name] || (self._in[c.name] = document.createElement('input'));
      inp.setAttribute('data-f', c.name);
      inp.className = slot.className;
      inp.placeholder = slot.placeholder;
      inp.value = (s.filter[c.name] || {}).q || '';
      slot.replaceWith(inp);
      if (inp._w) return;
      inp._w = 1;
      var timer;
      var apply = function () {
        var f = s.filter[c.name] || (s.filter[c.name] = { op: 'cn', q: '' });
        var v = inp.value.trim();
        if (f.q === v) return;
        f.q = v; s.page = 1; self.render();
      };
      inp.oninput = function () { clearTimeout(timer); timer = setTimeout(apply, 260); };
      inp.onkeydown = function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { clearTimeout(timer); apply(); }
        if (e.key === 'Escape') { clearTimeout(timer); inp.value = ''; apply(); }
      };
    });
  };

  /* handler header dipasang ulang setiap kali thead dibangun (node-nya baru) */
  P._headEvents = function () {
    var self = this, s = this.s;
    var all = this.r.head.querySelector('[data-role=all]');
    if (all) all.onchange = function () {
      /* 'page' = baris di halaman aktif saja (ala jqGrid), 'view' = semua hasil filter */
      var list = self.o.selectAll === 'view' ? self.view : self.pageRows;
      if (all.checked) list.forEach(function (r, i) { s.sel.add(self.idOf(r, i)); });
      else list.forEach(function (r, i) { s.sel.delete(self.idOf(r, i)); });
      self._paint(true);
      self._fire();
    };
  };

  P._paint = function (force) {
    var s = this.s, o = this.o, cols = this.vis(), self = this;
    var rh = o.rowHeight, top = this.r.sc.scrollTop, n = this.pageRows.length;
    var first = Math.max(0, Math.floor(top / rh) - 5);
    var last = Math.min(n, Math.ceil((top + o.height) / rh) + 5);
    var pv = [s.page, s.size, n, this._rev, s.sort.length, cols.length].join('|');
    if (!force && first === this._f && last === this._l && pv === this._pv) return;
    this._f = first; this._l = last; this._pv = pv;

    /* virtual scroll dengan baris spacer (bukan position:absolute) agar lebar
     * kolom dari <colgroup> tetap berlaku untuk semua baris. */
    var frag = document.createDocumentFragment();
    var span = cols.length + (o.select === 'multi' ? 1 : 0) + (o.rowActions ? 1 : 0);
    if (first > 0) frag.appendChild(spacer(first * rh, span));
    for (var i = first; i < last; i++) {
      var row = this.pageRows[i], id = this.idOf(row, i);
      var tr = document.createElement('tr');
      tr.dataset.id = id; tr.dataset.i = i;
      tr.style.height = rh + 'px';
      tr.className = (o.zebra && i % 2 ? 'alt ' : '') + (s.sel.has(id) ? 'sel ' : '');
      var h = o.select === 'multi'
        ? '<td class="frz0 border-b border-r border-slate-200 p-0 text-center align-middle" style="position:sticky;left:0;z-index:1">' +
          '<input type="checkbox" data-ck="' + esc(id) + '"' + (s.sel.has(id) ? ' checked' : '') + ' class="size-3.5 accent-indigo-600"></td>'
        : '';
      for (var c = 0; c < cols.length; c++) {
        var col = cols[c], frz = c < o.frozen;
        h += '<td data-c="' + col.name + '" class="truncate border-b border-r border-slate-200 px-2 align-middle' +
             (col.align === 'right' ? ' text-right tabular-nums' : col.align === 'center' ? ' text-center' : '') +
             (frz ? ' frz' : '') + '"' +
             (frz ? ' style="position:sticky;left:' + col._left + 'px;z-index:1"' : '') + '>' +
             (col.render ? col.render(row[col.name], row) : esc(fmt(row[col.name], col))) + '</td>';
      }
      if (o.rowActions) h += '<td class="border-b border-r border-slate-200 px-1 align-middle"><div class="flex items-center justify-center gap-0.5">' +
        '<button data-ra="view" title="Detail" class="' + RAB + '">' + ICONS.view + '</button>' +
        '<button data-ra="edit" title="Edit" class="' + RAB + '">' + ICONS.edit + '</button>' +
        '<button data-ra="del" title="Hapus" class="' + RAD + '">' + ICONS.del + '</button></div></td>';
      tr.innerHTML = h;
      frag.appendChild(tr);
    }
    if (last < n) frag.appendChild(spacer((n - last) * rh, span));
    this.r.body.replaceChildren(frag);
    this._syncHead();

    function spacer(px, colsSpan) {
      var t = document.createElement('tr');
      t.className = 'mg-spacer';
      t.innerHTML = '<td colspan="' + colsSpan + '" style="height:' + px + 'px"></td>';
      return t;
    }
  };

  P._syncHead = function () {
    var self = this, s = this.s;
    var all = this.r.head.querySelector('[data-role=all]');
    if (all) {
      var list = this.o.selectAll === 'view' ? this.view : this.pageRows;
      var ids = list.map(function (r, i) { return self.idOf(r, i); });
      var on = ids.filter(function (id) { return s.sel.has(id); }).length;
      all.checked = ids.length > 0 && on === ids.length;
      all.indeterminate = on > 0 && on < ids.length;
    }
    var del = this.r.tools.querySelector('[data-act=remove]');
    if (del) del.disabled = s.sel.size === 0;
    var one = s.sel.size === 1;
    ['edit', 'view'].forEach(function (a) {
      var b = self.r.tools.querySelector('[data-act=' + a + ']');
      if (b) b.disabled = !one;
    });
    (this.o.actions || []).forEach(function (a) {   /* approve/reject/dll */
      var b = self.r.tools.querySelector('[data-act=' + a.id + ']');
      if (b) b.disabled = a.need === 'one' ? s.sel.size !== 1 : s.sel.size === 0;
    });
  };

  P._pager = function () {
    var s = this.s, o = this.o, self = this, pages = Math.max(1, Math.ceil(this.view.length / s.size));
    var b = function (l, p, dis) {
      return '<button data-page="' + p + '"' + (dis ? ' disabled' : '') +
        ' class="h-6 min-w-6 rounded-md border border-slate-300 bg-white px-1.5 text-xs text-slate-600 shadow-xs outline-none enabled:hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40">' + l + '</button>';
    };
    this.r.pager.innerHTML =
      '<div class="flex items-center gap-0.5">' +
        b('«', 1, s.page === 1) + b('‹', s.page - 1, s.page === 1) +
        '<span class="px-1 text-xs tabular-nums text-slate-600">' + s.page + ' / ' + pages + '</span>' +
        b('›', s.page + 1, s.page === pages) + b('»', pages, s.page === pages) +
      '</div>' +
      '<label class="flex items-center gap-1 text-xs text-slate-600">Baris' +
        '<select data-role="size" class="h-6 rounded border border-slate-300 bg-white px-1 text-xs outline-none">' +
          o.pageSizes.map(function (n) { return '<option' + (n === s.size ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
        '</select></label>' +
      '<span class="ml-auto text-xs text-slate-500">filter+sort <b class="tabular-nums text-slate-700">' + this.ms + '</b> ms · ' +
        (this._l - this._f) + ' baris di DOM</span>';
  };

  P._info = function () {
    var s = this.s;
    var fbtn = this.r.tools.querySelector('[data-act=ffilter] [data-fc]');
    if (fbtn) {
      var n = 0;
      Object.keys(s.filter).forEach(function (k) { if ((s.filter[k].q || '').trim()) n++; });
      (s.rules || []).forEach(function (r) { if (String(r.q).trim() !== '' || r.op === 'nn' || r.op === 'nl') n++; });
      fbtn.textContent = n || '';
      fbtn.classList.toggle('hidden', !n);
    }
    var from = this.view.length ? (s.page - 1) * s.size + 1 : 0;
    this.r.info.textContent = from + '–' + Math.min(s.page * s.size, this.view.length) + ' dari ' + this.view.length +
      (this.view.length !== this.data.length ? ' / ' + this.data.length : '') + (s.sel.size ? ' · pilih ' + s.sel.size : '');
  };

  /* ----------------------------------------------------------- interaksi */
  P.sortBy = function (name, add) {
    var s = this.s, i = -1;
    for (var k = 0; k < s.sort.length; k++) if (s.sort[k].n === name) i = k;
    if (!add) s.sort = i < 0 ? [{ n: name, d: 1 }] : [{ n: name, d: -s.sort[i].d }];
    else if (i < 0) s.sort.push({ n: name, d: 1 });
    else if (s.sort[i].d === 1) s.sort[i].d = -1;
    else s.sort.splice(i, 1);
    this._skey = '';
    this.render();
  };

  P._resizeStart = function (e, i) {
    var self = this, c = this.vis()[i], x0 = e.clientX, w0 = c.width;
    e.preventDefault(); e.stopPropagation();
    var move = function (ev) {
      /* +1 = border-r 1px (box-sizing: border-box dari preflight) */
      c.width = Math.max(40, Math.round(w0 + ev.clientX - x0) + 1);
      self._offsets(); self._cols(); self._head(); self._paint(true);
    };
    var up = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      self.render();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  P.selected = function () {
    var s = this.s, self = this;
    return this.data.filter(function (r, i) { return s.sel.has(self.idOf(r, i)); });
  };
  P.clearSel = function () { this.s.sel.clear(); this._paint(true); this._fire(); };
  P._fire = function () { this._syncHead(); this._info(); if (this.o.onSelect) this.o.onSelect(Array.from(this.s.sel)); };

  P._wire = function () {
    var self = this, o = this.o, s = this.s;

    /* ---- toolbar (berikon + aksi kustom) ---- */
    var T = [];
    if (o.add) T.push(['add', 'Tambah', 'add']);
    if (o.editForm) T.push(['edit', 'Edit', 'edit']);
    if (o.view) T.push(['view', 'Detail', 'view']);
    (o.actions || []).forEach(function (a) { T.push([a.id, a.label, a.icon || 'ok', a]); });
    if (o.remove) T.push(['remove', 'Hapus', 'del']);
    if (o.filterForm) T.push(['ffilter', 'Filter', 'filter', true]);
    T.push(['export', 'Export', 'export']);
    if (o.chooser) T.push(['cols', 'Kolom', 'cols']);
    if (o.help) T.push(['help', '', 'help']);
    this.r.tools.innerHTML = T.map(function (t) {
      return '<button data-act="' + t[0] + '" title="' + (t[1] || t[0]) + '" class="' + BTN + (t[1] ? '' : ' px-1.5') + '">' +
        (ICONS[t[2]] || '') + (t[1] ? '<span class="hidden sm:inline">' + esc(t[1]) + '</span>' : '') +
        (t[3] ? '<span data-fc class="hidden rounded-full bg-indigo-600 px-1.5 text-[9px] font-semibold leading-4 text-white"></span>' : '') + '</button>';
    }).join('') + (o.filter ? '<button data-act="clear" class="h-6 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-indigo-600">bersihkan filter</button>' : '');

    this.r.tools.onclick = function (e) {
      var a = e.target.closest('[data-act]');
      if (!a || a.disabled) return;
      var act = a.dataset.act;

      if (act === 'export') { self._exportMenu(a); return; }
      if (act === 'ffilter') { self._filterForm(); return; }
      if (act === 'help') { self._help(); return; }
      var ca = null;
      (o.actions || []).forEach(function (x) { if (x.id === act) ca = x; });
      if (ca) {
        var rs = self.selected();
        if (ca.need === 'one' ? rs.length !== 1 : !rs.length) return;
        ca.fn(rs, self);
        return;
      }

      if (act === 'add') {
        if (o.editForm) { self._form('add'); return; }
        var blank = {};
        self.cols.forEach(function (c) { blank[c.name] = c.type === 'num' ? 0 : ''; });
        var row = o.onAdd ? o.onAdd(blank) : Object.assign({ id: Date.now() }, blank);
        if (!row) return;
        self.data.push(row);
        s.filter = {}; s.q = ''; if (self.r.q) self.r.q.value = '';
        Object.keys(self._in).forEach(function (k) { self._in[k].value = ''; });
        s.page = 1e9; self._skey = '';
        self.render();
        var id = self.idOf(row, self.data.length - 1);
        var tr = self.r.body.querySelector('tr[data-id="' + id + '"]');
        if (tr && o.edit) {
          var td = tr.querySelector('td[data-c]');
          if (td) self._editCell(td);
        }
      }
      if (act === 'edit' && s.sel.size === 1) self._form('edit');
      if (act === 'view' && s.sel.size === 1) self._form('view');
      if (act === 'remove') self._doRemove(Array.from(s.sel));
      if (act === 'cols') self._chooser();
      if (act === 'clear') {
        s.filter = {}; s.rules = []; s.join = 'AND'; s.q = ''; s.page = 1;
        if (self.r.q) self.r.q.value = '';
        Object.keys(self._in).forEach(function (k) { self._in[k].value = ''; });
        self.render();
      }
    };

    /* ---- header: sort, resize, operator ---- */
    this.r.head.onclick = function (e) {
      if (e.target.closest('[data-rz]')) return;
      var th = e.target.closest('[data-sort]');
      if (th) self.sortBy(th.dataset.sort, e.shiftKey);
    };
    this.r.head.onpointerdown = function (e) {
      var rz = e.target.closest('[data-rz]');
      if (rz) self._resizeStart(e, +rz.dataset.rz);
    };
    this.r.head.onchange = function (e) {
      var op = e.target.dataset && e.target.dataset.op;
      if (!op) return;
      var f = s.filter[op] || (s.filter[op] = { op: 'cn', q: '' });
      f.op = e.target.value;
      s.page = 1; self.render();
    };

    /* ---- pencarian global ---- */
    if (this.r.q) this.r.q.onkeydown = function (e) {
      if (e.key === 'Enter') { s.q = e.target.value.trim(); s.page = 1; self.render(); }
      if (e.key === 'Escape') { e.target.value = ''; s.q = ''; s.page = 1; self.render(); }
    };

    /* ---- body: pilih & edit ---- */
    this.r.body.onclick = function (e) {
      var ck = e.target.closest('[data-ck]');
      if (ck) {
        if (ck.checked) s.sel.add(ck.dataset.ck); else s.sel.delete(ck.dataset.ck);
        ck.closest('tr').classList.toggle('sel', ck.checked);
        self._fire();
        return;
      }
      var ra = e.target.closest('[data-ra]');
      if (ra) {
        var rid = ra.closest('tr').dataset.id;
        if (ra.dataset.ra === 'view') self._form('view', rid);
        if (ra.dataset.ra === 'edit') self._form('edit', rid);
        if (ra.dataset.ra === 'del') self._doRemove([rid]);
        return;
      }
      var tr = e.target.closest('tr');
      if (!tr) return;
      if (o.select === 'single') {
        s.sel = new Set([tr.dataset.id]);
        self._paint(true); self._fire();
      }
    };
    this.r.body.ondblclick = function (e) {
      if (!o.edit) return;
      var td = e.target.closest('td[data-c]');
      if (td) self._editCell(td);
    };

    /* ---- pager ---- */
    this.r.pager.onclick = function (e) {
      var b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      var pages = Math.max(1, Math.ceil(self.view.length / s.size));
      s.page = Math.max(1, Math.min(+b.dataset.page, pages));
      self._recompute(); self._paint(true); self._pager(); self._info();
      self.r.sc.scrollTop = 0;
    };
    this.r.pager.onchange = function (e) {
      if (e.target.dataset.role !== 'size') return;
      s.size = +e.target.value; s.page = 1; self.render(); self.r.sc.scrollTop = 0;
    };

    /* ---- virtual scroll ---- */
    var raf = 0;
    this.r.sc.onscroll = function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; self._paint(false); });
    };
  };

  P._editCell = function (td) {
    var self = this, col = this.col(td.dataset.c);
    if (!col || col.editable === false) return;
    var tr = td.closest('tr'), row = this.pageRows[+tr.dataset.i];
    if (!row) return;
    var old = row[col.name];
    var inp = document.createElement('input');
    inp.type = col.type === 'num' ? 'number' : col.type === 'date' ? 'date' : 'text';
    inp.value = old == null ? '' : old;
    inp.className = 'h-6 w-full rounded border border-indigo-500 px-1 text-xs outline-none';
    td.textContent = ''; td.appendChild(inp); inp.focus(); inp.select();
    var closed = false;
    var done = function (save) {
      if (closed) return; closed = true;
      var changed = save && String(inp.value) !== String(old == null ? '' : old);
      if (!changed) { self._cell(td, row, col); return; }  /* tutup tanpa merender ulang grid */
      var v = col.type === 'num' ? (inp.value === '' ? null : Number(inp.value)) : inp.value;
      row[col.name] = v;
      if (self.o.onEdit) self.o.onEdit(row, col.name, v, old);
      self._rev++;
      self.render();
    };
    inp.onkeydown = function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') done(true);
      else if (e.key === 'Escape') done(false);
      else if (e.key === 'Tab') { e.preventDefault(); done(true); }
    };
    inp.onblur = function () { done(true); };
  };

  /* tulis ulang isi satu sel (dipakai saat editor ditutup tanpa perubahan) */
  P._cell = function (td, row, col) {
    td.innerHTML = col.render ? col.render(row[col.name], row) : esc(fmt(row[col.name], col));
  };

  P._chooser = function () {
    var self = this;
    var d = document.createElement('div');
    d.className = 'fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 p-10 backdrop-blur-[2px]';
    d.innerHTML = '<div class="max-h-[70vh] w-56 overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-slate-900/10">' +
      '<div class="mb-2 text-xs font-semibold text-slate-700">Tampilkan kolom</div>' +
      this.cols.map(function (c, i) {
        return '<label class="flex items-center gap-2 py-0.5 text-xs text-slate-600">' +
          '<input type="checkbox" data-i="' + i + '"' + (c.hidden ? '' : ' checked') + ' class="size-3.5 accent-indigo-600">' + esc(c.label) + '</label>';
      }).join('') + '</div>';
    d.onclick = function (e) {
      if (e.target === d) { d.remove(); return; }
      if (e.target.dataset.i != null) {
        self.cols[+e.target.dataset.i].hidden = !e.target.checked;
        self._offsets(); self.render();
      }
    };
    document.body.appendChild(d);
  };

  P._doRemove = function (ids) {
    var o = this.o, s = this.s, rows = [], i;
    for (i = 0; i < this.data.length; i++) if (ids.indexOf(this.idOf(this.data[i], i)) > -1) rows.push(this.data[i]);
    if (!rows.length) return;
    var go = o.onRemove ? o.onRemove(rows) !== false : confirm('Hapus ' + rows.length + ' baris?');
    if (!go) return;
    var del = new Set(rows);
    this.data = o.data = this.data.filter(function (r) { return !del.has(r); });
    ids.forEach(function (x) { s.sel.delete(x); });
    this._skey = ''; this.render();
  };

  /* ---------------------------------------- modal dapat digeser (drag) */
  P._drag = function (d) {
    var h = d.querySelector('[data-drag]'), p = h && h.parentElement;
    if (!h || !p) return;
    h.style.cursor = 'grab'; h.style.touchAction = 'none'; h.style.userSelect = 'none';
    h.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      var r = p.getBoundingClientRect();
      p.style.position = 'fixed'; p.style.left = r.left + 'px'; p.style.top = r.top + 'px'; p.style.margin = '0';
      var dx = e.clientX - r.left, dy = e.clientY - r.top;
      h.style.cursor = 'grabbing';
      h.setPointerCapture(e.pointerId);
      var move = function (ev) {
        var x = Math.max(60 - r.width, Math.min(ev.clientX - dx, window.innerWidth - 60));
        var y = Math.max(0, Math.min(ev.clientY - dy, window.innerHeight - 44));
        p.style.left = x + 'px'; p.style.top = y + 'px';
      };
      var up = function () {
        h.style.cursor = 'grab';
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
        h.removeEventListener('pointercancel', up);
      };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });
  };

  /* ------------------------------------------------- formulir CRUD (modal) */
  P._form = function (mode, id) {
    var self = this, o = this.o, s = this.s;
    var isNew = mode === 'add', readonly = mode === 'view';
    var row = null;
    if (isNew) {
      row = {};
      this.cols.forEach(function (c) { row[c.name] = c.bool ? false : ''; });
    } else {
      var want = id != null ? id : (s.sel.size === 1 ? Array.from(s.sel)[0] : null);
      if (want == null) return;
      for (var i = 0; i < this.data.length; i++) if (this.idOf(this.data[i], i) === want) { row = this.data[i]; break; }
      if (!row) return;
    }
    var fields = this.vis().filter(function (c) { return c.form !== false && c.editable !== false; });
    var old = {};
    fields.forEach(function (c) { old[c.name] = row[c.name]; });

    var INP = 'mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500';
    var body = fields.map(function (c) {
      var v = row[c.name], ctl;
      if (readonly) {
        ctl = '<div class="mt-0.5 rounded bg-slate-50 px-2 py-1 text-xs">' + ((c.render ? c.render(v, row) : esc(fmt(v, c))) || '—') + '</div>';
      } else if (c.bool) {
        ctl = '<input data-fld="' + c.name + '" type="checkbox"' + (v ? ' checked' : '') + ' class="mt-1 size-3.5 accent-indigo-600">';
      } else if (c.options) {
        ctl = '<select data-fld="' + c.name + '" class="' + INP + '">' +
          c.options.map(function (op) { return '<option' + (String(op) === String(v == null ? '' : v) ? ' selected' : '') + '>' + op + '</option>'; }).join('') +
          '</select>';
      } else {
        ctl = '<input data-fld="' + c.name + '" type="' + (c.type === 'num' ? 'number' : c.type === 'date' ? 'date' : 'text') + '" value="' + esc(v == null ? '' : v) + '" class="' + INP + '">';
      }
      return '<div><span class="text-[11px] font-medium text-slate-600">' + esc(c.label) +
        (c.required && !readonly ? ' <b class="text-rose-600">*</b>' : '') + '</span>' + ctl +
        '<p data-err="' + c.name + '" class="hidden pt-0.5 text-[10px] text-rose-600"></p></div>';
    }).join('');

    var wide = o.formCols > 1;
    var wcls = o.formCols >= 3 ? 'w-[54rem]' : wide ? 'w-[36rem]' : 'w-96';
    var bcls = o.formCols >= 3 ? 'grid grid-cols-1 items-start gap-3 min-[520px]:grid-cols-2 min-[900px]:grid-cols-3'
             : wide ? 'grid grid-cols-1 items-start gap-3 min-[520px]:grid-cols-2' : 'space-y-2';
    var d = document.createElement('div');
    d.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-[2px]';
    d.innerHTML =
      '<div class="' + wcls + ' max-w-full rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10">' +
        '<div data-drag class="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2" title="Seret untuk memindahkan">' +
          '<span class="text-sm font-semibold text-slate-700">' + (isNew ? 'Tambah baris' : readonly ? 'Detail baris' : 'Edit baris') + '</span>' +
          '<button data-x class="text-slate-400 hover:text-slate-600">✕</button>' +
        '</div>' +
        '<div class="max-h-[65vh] overflow-auto px-4 py-3 ' + bcls + '">' + body + '</div>' +
        '<div class="flex justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50 px-4 py-2">' +
          (readonly
            ? '<button data-close class="h-7 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100">Tutup</button>'
            : '<button data-close class="h-7 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100">Batal</button>' +
              '<button data-save class="h-7 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:translate-y-px">Simpan</button>') +
        '</div>' +
      '</div>';

    var close = function () { d.remove(); };
    function save() {
      var okAll = true;
      fields.forEach(function (c) {
        var el = d.querySelector('[data-fld="' + c.name + '"]');
        var errEl = d.querySelector('[data-err="' + c.name + '"]');
        if (!el) return;
        var val = c.bool ? (el.checked ? 1 : 0) : (c.type === 'num' && !c.bool) ? (el.value === '' ? null : el.value) : el.value.trim();
        var msg = '';
        if (!c.bool && c.type === 'num' && val !== null && !isFinite(Number(val))) msg = 'harus angka';
        if (c.required && (val === null || val === '')) msg = 'wajib diisi';
        if (msg) { okAll = false; errEl.textContent = msg; errEl.classList.remove('hidden'); return; }
        errEl.classList.add('hidden');
        row[c.name] = (!c.bool && c.type === 'num' && val !== null) ? Number(val) : val;
      });
      if (!okAll) return;

      if (isNew) {
        var fin = o.onAdd ? o.onAdd(row) : Object.assign({ id: Date.now() }, row);
        if (!fin) { close(); return; }
        self.data.push(fin);
        if (o.onSave) o.onSave(fin, true);
        s.filter = {}; s.q = ''; if (self.r.q) self.r.q.value = '';
        Object.keys(self._in).forEach(function (k) { self._in[k].value = ''; });
        s.page = 1e9; self._skey = '';
        s.sel = new Set([self.idOf(fin, self.data.length - 1)]);
      } else {
        fields.forEach(function (c) {
          if (o.onEdit && String(row[c.name]) !== String(old[c.name] == null ? '' : old[c.name])) o.onEdit(row, c.name, row[c.name], old[c.name]);
        });
        if (o.onSave) o.onSave(row, false);
        self._rev++;
      }
      close();
      self.render();
    }
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-x]') || e.target.closest('[data-close]')) { close(); return; }
      if (e.target.closest('[data-save]')) save();
    });

    self._drag(d);
    document.body.appendChild(d);
    var first = d.querySelector('input[type=text], input[type=number], select');
    if (first) first.focus();
  };

  /* ------------------------------------------------- menu export CSV/XLSX/PDF */
  P._exportMenu = function (btn) {
    var self = this;
    var old = this.r.tools.querySelector('[data-role=xmenu]');
    if (old) { old.remove(); return; }
    var m = document.createElement('div');
    m.setAttribute('data-role', 'xmenu');
    m.className = 'absolute top-7 z-30 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-slate-900/10';
    m.innerHTML = [['csv', 'CSV'], ['xlsx', 'Excel (.xlsx)'], ['pdf', 'PDF (.pdf)']].map(function (x) {
      return '<button data-x="' + x[0] + '" class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">' +
        ICONS.export + '<span>' + x[1] + '</span></button>';
    }).join('');
    m.onclick = function (e) {
      var b = e.target.closest('[data-x]');
      if (!b) return;
      m.remove();
      if (b.dataset.x === 'csv') self.toCSV();
      if (b.dataset.x === 'xlsx') self.toXLSX();
      if (b.dataset.x === 'pdf') self.toPDF();
    };
    this.r.tools.appendChild(m);
    /* posisikan di bawah tombol, tetapi jangan sampai keluar tepi toolbar */
    var mw = 144;
    m.style.left = Math.max(0, Math.min(btn.offsetLeft, this.r.tools.clientWidth - mw)) + 'px';
    setTimeout(function () {
      document.addEventListener('click', function h (e) {
        if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', h, true); }
      }, true);
    }, 0);
  };

  /* ------------------------------------------------- modal bantuan */
  P._help = function () {
    var o = this.o;
    var txt = o.helpText ||
      '<ul class="list-disc space-y-1 pl-4">' +
      '<li><b>Klik header</b> = urutkan · <b>Shift+klik</b> = urut multi-kolom · klik lagi = balik arah.</li>' +
      '<li><b>Filter</b> per kolom lewat tombol Filter (pilih operator lalu isi nilai) atau pencarian global (Enter).</li>' +
      '<li><b>Pilih baris</b> lewat checkbox; checkbox header memilih seluruh halaman.</li>' +
      '<li><b>Edit/Detail</b> aktif bila tepat 1 baris terpilih · <b>Hapus/Approve/Reject</b> aktif bila ≥1 terpilih.</li>' +
      '<li><b>Klik ganda</b> sel = edit inline · Enter/Tab simpan · Esc batal.</li>' +
      '<li><b>Geser tepi kanan header</b> = ubah lebar kolom · tombol Kolom = tampil/sembunyikan kolom.</li>' +
      '<li><b>Export</b> = unduh hasil ter-filter & ter-urut sebagai CSV, XLSX, atau PDF.</li>' +
      '<li><b>Geser bilah judul modal</b> = pindahkan posisi modal; setiap dibuka, modal kembali ke tengah layar.</li>' +
      '</ul>';
    var d = document.createElement('div');
    d.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-[2px]';
    d.innerHTML =
      '<div class="w-[30rem] max-w-full rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10">' +
        '<div data-drag class="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2" title="Seret untuk memindahkan">' +
          '<span class="flex items-center gap-2 text-sm font-semibold text-slate-700">' + ICONS.help + ' Bantuan</span>' +
          '<button data-x class="text-slate-400 hover:text-slate-600">✕</button>' +
        '</div>' +
        '<div class="px-4 py-3 text-xs leading-relaxed text-slate-600">' + txt + '</div>' +
        '<div class="flex justify-end rounded-b-xl border-t border-slate-200 bg-slate-50 px-4 py-2">' +
          '<button data-x class="h-7 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100">Tutup</button>' +
        '</div>' +
      '</div>';
    d.onclick = function (e) { if (e.target === d || e.target.closest('[data-x]')) d.remove(); };
    this._drag(d);
    document.body.appendChild(d);
  };

  /* ------------------------------------- form filter: cepat + builder kondisi */
  P._filterForm = function () {
    var self = this, s = this.s;
    var qcols = this.vis().filter(function (c) { return c.filter !== false; });
    var d = document.createElement('div');
    d.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-[2px]';

    var quick = qcols.map(function (c) {
      var f = s.filter[c.name] || {};
      return '<div class="grid grid-cols-1 gap-1 min-[480px]:grid-cols-[8rem_4.5rem_1fr] min-[480px]:items-center min-[480px]:gap-2">' +
        '<span class="truncate text-[11px] font-medium text-slate-600">' + esc(c.label) + '</span>' +
        '<select data-fop="' + c.name + '" class="h-6 rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-600 outline-none">' +
          Object.keys(OPS).filter(function (k) { return c.type === 'num' || c.type === 'date' ? NUMOPS[k] : true; })
            .map(function (k) { return '<option value="' + k + '"' + (f.op === k ? ' selected' : '') + '>' + OPS[k] + '</option>'; }).join('') +
        '</select>' +
        '<input data-ff="' + c.name + '" value="' + esc(f.q || '') + '" placeholder="nilai…" class="h-6 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-indigo-500">' +
        '</div>';
    }).join('');

    d.innerHTML =
      '<div class="w-[30rem] max-w-full rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10">' +
        '<div data-drag class="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2" title="Seret untuk memindahkan">' +
          '<span class="flex items-center gap-2 text-sm font-semibold text-slate-700">' + ICONS.filter + ' Filter</span>' +
          '<button data-x class="text-slate-400 hover:text-slate-600">✕</button>' +
        '</div>' +
        '<div class="max-h-[62vh] space-y-4 overflow-auto px-4 py-3">' +
          '<div><div class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Filter cepat per kolom</div>' +
            '<div class="space-y-2">' + quick + '</div></div>' +
          '<div><div class="mb-1 flex items-center justify-between gap-2">' +
              '<span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kondisi lanjutan</span>' +
              '<label class="flex items-center gap-1 text-[11px] text-slate-500">Gabung' +
                '<select data-rjoin class="h-5 rounded border border-slate-300 bg-white px-1 text-[11px] outline-none">' +
                  '<option value="AND"' + (s.join === 'OR' ? '' : ' selected') + '>AND</option>' +
                  '<option value="OR"' + (s.join === 'OR' ? ' selected' : '') + '>OR</option>' +
                '</select></label>' +
            '</div>' +
            '<div data-rules class="space-y-2"></div>' +
            '<button data-radd class="mt-2 flex h-6 items-center gap-1 rounded-md border border-dashed border-slate-400 px-2 text-xs text-slate-600 hover:bg-slate-100">' +
              ICONS.add + '<span>Tambah kondisi</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="flex justify-between rounded-b-xl border-t border-slate-200 bg-slate-50 px-4 py-2">' +
          '<button data-reset class="h-7 rounded px-2 text-xs text-slate-500 hover:text-rose-600">Reset semua</button>' +
          '<button data-x class="h-7 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100">Tutup</button>' +
        '</div>' +
      '</div>';

    var box = d.querySelector('[data-rules]');
    var timer;
    var apply = function (now) {
      clearTimeout(timer);
      if (now) { s.page = 1; self.render(); return; }
      timer = setTimeout(function () { s.page = 1; self.render(); }, 260);
    };
    function opOptions(c, cur) {
      return Object.keys(OPS).filter(function (k) { return c.type === 'num' || c.type === 'date' ? NUMOPS[k] : true; })
        .map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + OPS[k] + '</option>'; }).join('');
    }
    function paintRules() {
      if (!s.rules.length) {
        box.innerHTML = '<p class="text-[11px] text-slate-400">Belum ada kondisi — field dapat dipilih &amp; kondisi dapat ditambah (satu field boleh lebih dari satu, mis. rentang).</p>';
        return;
      }
      box.innerHTML = s.rules.map(function (r, i) {
        var c = self.col(r.f) || self.vis()[0];
        return '<div class="grid grid-cols-1 gap-1 min-[480px]:grid-cols-[7rem_4.5rem_1fr_1.75rem] min-[480px]:items-center min-[480px]:gap-2">' +
          '<select data-rf data-i="' + i + '" class="h-6 rounded border border-slate-300 bg-white px-1 text-[11px] outline-none">' +
            self.vis().map(function (cc) { return '<option value="' + cc.name + '"' + (cc.name === r.f ? ' selected' : '') + '>' + esc(cc.label) + '</option>'; }).join('') +
          '</select>' +
          '<select data-rop data-i="' + i + '" class="h-6 rounded border border-slate-300 bg-white px-1 text-[11px] outline-none">' + opOptions(c, r.op) + '</select>' +
          '<input data-rq data-i="' + i + '" value="' + esc(r.q) + '" placeholder="nilai…" class="h-6 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-indigo-500">' +
          '<button data-rx data-i="' + i + '" title="Hapus kondisi" class="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600">' + ICONS.no + '</button>' +
        '</div>';
      }).join('');
    }
    paintRules();

    d.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.ff) {
        var f = s.filter[t.dataset.ff] || (s.filter[t.dataset.ff] = { op: 'cn', q: '' });
        f.q = t.value.trim(); apply(false);
      }
      if (t.dataset.rq != null) { s.rules[+t.dataset.i].q = t.value; apply(false); }
    });
    d.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.fop) { (s.filter[t.dataset.fop] || (s.filter[t.dataset.fop] = { op: 'cn', q: '' })).op = t.value; apply(true); }
      if (t.dataset.rjoin != null) { s.join = t.value; apply(true); }
      if (t.dataset.rop != null) { s.rules[+t.dataset.i].op = t.value; apply(true); }
      if (t.dataset.rf != null) {
        var r = s.rules[+t.dataset.i];
        r.f = t.value;
        var c = self.col(r.f);
        var valid = c.type === 'num' || c.type === 'date' ? NUMOPS[r.op] : true;
        if (!valid) r.op = 'eq';
        paintRules(); apply(true);
      }
    });
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-x]')) { d.remove(); return; }
      if (e.target.closest('[data-radd]')) {
        s.rules.push({ f: self.vis()[0].name, op: 'cn', q: '' });
        paintRules(); apply(true);
        var ins = box.querySelectorAll('[data-rq]');
        if (ins.length) ins[ins.length - 1].focus();
        return;
      }
      if (e.target.closest('[data-rx]')) {
        s.rules.splice(+e.target.closest('[data-rx]').dataset.i, 1);
        paintRules(); apply(true);
        return;
      }
      if (e.target.closest('[data-reset]')) {
        s.filter = {}; s.rules = []; s.join = 'AND'; s.page = 1;
        d.querySelectorAll('[data-ff]').forEach(function (i) { i.value = ''; });
        d.querySelector('[data-rjoin]').value = 'AND';
        paintRules(); apply(true);
      }
    });
    self._drag(d);
    document.body.appendChild(d);
  };

  P.toCSV = function () {
    var cols = this.vis();
    var lines = [cols.map(function (c) { return '"' + c.label + '"'; }).join(',')];
    this.view.forEach(function (r) {
      lines.push(cols.map(function (c) { return '"' + String(r[c.name] == null ? '' : r[c.name]).replace(/"/g, '""') + '"'; }).join(','));
    });
    var url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'data.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  Grid.OPS = OPS;
  global.MiniGrid = Grid;
})(typeof window !== 'undefined' ? window : globalThis);
