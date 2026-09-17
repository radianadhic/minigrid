/* ============================================================================
 * export.js — pengekspor XLSX & PDF asli tanpa dependency (~4 KB)
 *  · XLSX: paket OOXML minimal dibungkus ZIP (metode store, CRC32 sendiri)
 *  · PDF : PDF 1.4 minimal, Helvetica, multi-halaman
 * ============================================================================ */
(function (global) {
  'use strict';
  var P = global.MiniGrid.prototype;

  var XESC = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* ------------------------------------------------------------ CRC32 + ZIP */
  var CT = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) {
    var c = 0xFFFFFFFF, i;
    for (i = 0; i < b.length; i++) c = CT[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    var enc = new TextEncoder(), body = [], cent = [], off = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      body.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      cent.push([new Uint8Array(ch.buffer), name]);
      off += 30 + name.length + data.length;
    });
    var cd = 0;
    cent.forEach(function (c) { cd += c[0].length + c[1].length; });
    var eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true);
    eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
    eo.setUint32(12, cd, true); eo.setUint32(16, off, true);
    var all = body.concat.apply(body, cent);
    all.push(new Uint8Array(eo.buffer));
    var total = 0; all.forEach(function (a) { total += a.length; });
    var out = new Uint8Array(total), p = 0;
    all.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }

  function colRef(i) {
    var s = ''; i++;
    while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - 1 - m) / 26; }
    return s;
  }
  function dl(bytes, name, type) {
    var b = new Blob([bytes], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ------------------------------------------------------------------ XLSX */
  P.toXLSX = function () {
    var cols = this.vis(), rows = this.view.slice(0, 20000);
    var x = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'];
    x.push('<row r="1">' + cols.map(function (c, i) {
      return '<c r="' + colRef(i) + '1" t="inlineStr"><is><t>' + XESC(c.label) + '</t></is></c>';
    }).join('') + '</row>');
    rows.forEach(function (r, ri) {
      x.push('<row r="' + (ri + 2) + '">' + cols.map(function (c, i) {
        var v = r[c.name], ref = colRef(i) + (ri + 2);
        if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"><v>' + v + '</v></c>';
        if (c.type === 'num' && v !== null && v !== '' && isFinite(Number(v))) return '<c r="' + ref + '"><v>' + Number(v) + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"><is><t>' + XESC(v == null ? '' : v) + '</t></is></c>';
      }).join('') + '</row>');
    });
    x.push('</sheetData></worksheet>');
    var zip = zipStore([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: 'xl/worksheets/sheet1.xml', data: x.join('') }
    ]);
    dl(zip, 'data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  /* ------------------------------------------------------------------- PDF */
  P.toPDF = function () {
    var cols = this.vis(), rows = this.view.slice(0, 1000);
    var A = function (s) { return String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, '?'); };  /* PDF ascii */
    var E = function (s) { return A(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); };
    var chars = cols.map(function (c) { return Math.max(6, Math.min(26, Math.round(c.width / 7))); });
    var xs = [30];
    chars.forEach(function (ch, i) { xs.push(xs[i] + ch * 4.3); });
    var right = xs[xs.length - 1] + 10;
    var perPage = 60, pages = [];
    for (var i = 0; i < Math.max(1, rows.length); i += perPage) pages.push(rows.slice(i, i + perPage));

    var objs = [], kids = [], n = 5;   /* 1 catalog, 2 pages, 3 F1, 4 F2 */
    pages.forEach(function (pg) {
      var s = 'BT /F1 11 Tf 30 812 Td (' + E('MiniGrid - ' + this.view.length + ' baris (hasil terfilter/terurut)') + ') Tj ET\n';
      var y = 788;
      s += '0.7 w 30 ' + y + ' m ' + right.toFixed(1) + ' ' + y + ' l S\n';
      y -= 12;
      s += 'BT /F2 7.5 Tf';
      cols.forEach(function (c, ci) { s += ' 1 0 0 1 ' + xs[ci].toFixed(1) + ' ' + y + ' Tm (' + E(c.label) + ') Tj'; });
      s += ' ET\n';
      y -= 5;
      s += '0.4 w 30 ' + y + ' m ' + right.toFixed(1) + ' ' + y + ' l S\n';
      y -= 11;
      pg.forEach(function (r) {
        s += 'BT /F1 7.5 Tf';
        cols.forEach(function (c, ci) {
          var t = A(r[c.name]);
          if (t.length > chars[ci]) t = t.slice(0, chars[ci] - 1) + '.';
          s += ' 1 0 0 1 ' + xs[ci].toFixed(1) + ' ' + y + ' Tm (' + E(t) + ') Tj';
        });
        s += ' ET\n';
        y -= 11;
      });
      var cid = n + 1;
      kids.push(n + ' 0 R');
      objs.push([n, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents ' + cid + ' 0 R>>']);
      objs.push([cid, '<</Length ' + s.length + '>>\nstream\n' + s + 'endstream']);
      n += 2;
    }, this);

    /* rakit: semua objek ascii → panjang string == offset byte */
    var list = [
      [1, '<</Type/Catalog/Pages 2 0 R>>'],
      [2, '<</Type/Pages/Kids[' + kids.join(' ') + ']/Count ' + kids.length + '>>'],
      [3, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'],
      [4, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>']
    ].concat(objs.map(function (o) { return Array.isArray(o) ? o : o; }));
    /* objs diisi sebagai string 'N 0 obj ... endobj'; ubah jadi [id, isi] dulu */
    var out = '%PDF-1.4\n', offsets = {};
    list.forEach(function (it) {
      offsets[it[0]] = out.length;
      out += it[0] + ' 0 obj\n' + it[1] + '\nendobj\n';
    });
    var count = list.length;
    var xref = 'xref\n0 ' + (count + 1) + '\n0000000000 65535 f \n';
    for (var k = 1; k <= count; k++) xref += String(offsets[k]).padStart(10, '0') + ' 00000 n \n';
    out += xref + 'trailer\n<</Size ' + (count + 1) + '/Root 1 0 R>>\nstartxref\n' + out.length + '\n%%EOF';
    dl(new TextEncoder().encode(out), 'data.pdf', 'application/pdf');
  };
})(typeof window !== 'undefined' ? window : globalThis);
