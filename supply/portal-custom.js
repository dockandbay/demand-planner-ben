// v28.504 (Ben 27-Oct-26): supplier portal tab ORDERS ▸ Custom orders. The Customiser's weekly Tuesday custom towel batches for this
// supplier: list, then one batch with its steps (1 accept or flag a problem, 2 line progress cut / stitched / packed, 3 first unit
// photo, 4 mark made, 5 cartons + DHL AWB), downloads (PO PDF, artwork per line, production files) and the timeline.
// v28.517 (Ben 27-Oct-26: "a batch download should be controlled via a download modal ... the supplier will be the ones downloading"):
// the production zip is replaced by a file list (full quality TIFFs make one zip GBs): every file with downloaded / not downloaded
// (recorded by the Customiser), Download remaining / ticked / one, made and downloaded ONE AT A TIME through ?link=1 (the browser
// fetches each file straight from storage, nothing large passes through HORIZON). Lines cancelled by the customer show as such.
// v28.518 (Ben 27-Oct-26: suppliers "can also create a batch"; "supplier can choose, or choose all"): Ready to batch, the lines waiting
// for this supplier, with Create batch from ticked / with all. The new batch starts accepted and in production (one batch per node).
// Data comes through HORIZON's proxy to the Customiser (server.mjs custProxy): /api/portal/custom/* for suppliers,
// /api/supply/custom-portal/<supplier>/* for the staff preview. Used by supply/portal.html and the CONFIG ▸ Portal preview in inject.html.
(function () {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fd(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[3] + '-' + MON[+m[2] - 1] + '-' + m[1].slice(2) : ''; }
  function fdt(v) { var d = new Date(v); if (!v || isNaN(d.getTime())) return fd(v); function p(n) { return (n < 10 ? '0' : '') + n; } return p(d.getDate()) + '-' + MON[d.getMonth()] + '-' + String(d.getFullYear()).slice(2) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  var STATUS = { sent: ['To accept', 'amber'], confirmed: ['In production', 'blue'], made: ['Made: enter cartons', 'violet'], shipped: ['Shipped', 'pos'], closed: ['Closed', 'mut'] };
  var CSS = '.hzc{display:grid;gap:12px}.hzc table{border-collapse:collapse;width:100%;font-size:13px}.hzc th,.hzc td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line,#e5e9f0);vertical-align:top}'
    + '.hzc th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#5b6b83);font-weight:600}.hzc tr.hzc-row{cursor:pointer}.hzc tr.hzc-row:hover td{background:var(--hover,#f7f9fc)}'
    + '.hzc-card{background:var(--card,#fff);border:1px solid var(--line,#e5e9f0);border-radius:10px;padding:12px 14px;display:grid;gap:8px}.hzc-card h3{margin:0;font-size:14px}'
    + '.hzc-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap}.hzc-amber{background:var(--amber-bg,#fdf3d7);color:var(--amber,#b45309)}'
    + '.hzc-blue{background:var(--blue-soft,#eaf1fd);color:var(--blue-ink,#1a4fb5)}.hzc-violet{background:var(--violet-bg,#f1ebfc);color:var(--violet,#7048c9)}.hzc-pos{background:var(--pos-bg,#e8f6ee);color:var(--pos,#118a4e)}'
    + '.hzc-mut{background:var(--line2,#eef1f6);color:var(--muted,#5b6b83)}.hzc-neg{background:var(--neg-bg,#fdeeec);color:var(--neg,#d23227)}.hzc-row2{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
    + '.hzc-btn{border:1px solid var(--line,#e5e9f0);background:var(--card,#fff);border-radius:7px;padding:5px 11px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink,#101828);text-decoration:none}'
    + '.hzc-btn.pri{background:var(--blue,#2361d8);border-color:var(--blue,#2361d8);color:#fff}.hzc-btn:disabled{opacity:.5;cursor:default}.hzc input,.hzc textarea{font:inherit;font-size:13px;border:1px solid var(--line,#e5e9f0);border-radius:6px;padding:4px 6px;background:var(--card,#fff);color:var(--ink,#101828)}'
    + '.hzc-msg{font-size:12px;color:var(--muted,#5b6b83)}.hzc-msg.err{color:var(--neg,#d23227)}.hzc-step{font-size:11px;font-weight:700;color:var(--faint,#8b98ad);letter-spacing:.05em;text-transform:uppercase}.hzc-scroll{overflow-x:auto}'
    + '.hzc-done{color:var(--pos,#118a4e);font-weight:600}.hzc-mut2{color:var(--muted,#5b6b83);font-size:12px}';
  function pill(cls, t) { return '<span class="hzc-pill hzc-' + cls + '">' + esc(t) + '</span>'; }
  function statusPill(b) { if (b.supplier_status === 'problem') return pill('neg', 'Problem flagged'); var s = STATUS[b.status] || [b.status, 'mut']; return pill(s[1], s[0]); }

  // opts: { base: '/api/portal/custom/' (ends with /), canWrite: bool, onCount: fn(n) }
  function render(host, opts) {
    var base = opts.base, ST = { list: null, open: null, flagLabel: {}, waiting: null, wpick: {}, files: null, done: {}, fst: {}, ferr: {}, pick: {}, running: false, stop: false };
    if (!document.getElementById('hzc-css')) { var st = document.createElement('style'); st.id = 'hzc-css'; st.textContent = CSS; document.head.appendChild(st); }
    function api(path, body) {
      return fetch(base + path, body === undefined ? { headers: { accept: 'application/json' } } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
    }
    function loadList() {
      host.innerHTML = '<div class="hzc"><div class="hzc-msg">Loading custom orders…</div></div>';
      Promise.all([api('batches'), api('waiting').catch(function () { return { lines: [] }; })]).then(function (r) { var j = r[0]; ST.list = j.batches || []; ST.flagLabel = j.flag_label || {}; ST.example = j.example; ST.waiting = r[1].lines || []; ST.wpick = {}; drawList(); })
        .catch(function (e) { host.innerHTML = '<div class="hzc"><div class="hzc-msg err">' + esc(e.message) + '</div></div>'; });
    }
    function drawList() {
      var L = ST.list, todo = L.filter(function (b) { return b.status === 'sent' || b.status === 'confirmed' || (b.status === 'made' && b.n_awb < Math.max(1, b.n_cartons)); }).length;
      if (opts.onCount) opts.onCount(todo);
      var h = '<div class="hzc"><div class="hzc-card"><h3>Custom orders</h3><div class="hzc-mut2">Personalised towels from the Dock &amp; Bay Customiser. Make a batch from the lines ready to batch (or accept one Dock &amp; Bay sends you), make it within the week, then enter the cartons with their DHL AWB.' + (ST.example ? ' <b>These are example batches for testing.</b>' : '') + '</div></div>';
      h += waitingCard();
      if (!L.length) { host.innerHTML = h + '<div class="hzc-msg">No custom order batches yet.</div></div>'; wireWaiting(); return; }
      h += '<div class="hzc-card hzc-scroll"><table><thead><tr><th>PO</th><th>Tuesday</th><th>Accept by</th><th>Made by</th><th>Lines</th><th>Towels</th><th>Progress</th><th>Cartons</th><th>Status</th></tr></thead><tbody>';
      L.forEach(function (b) {
        var flags = (b.flags || []).map(function (f) { return pill('neg', ST.flagLabel[f] || f); }).join(' ');
        h += '<tr class="hzc-row" data-id="' + esc(b.id) + '"><td><b>' + esc(b.po_ref) + '</b><div class="hzc-mut2">' + esc(b.node_name || b.node) + '</div></td><td>' + fd(b.batch_date) + '</td><td>' + fd(b.accept_by) + '</td><td>' + fd(b.due_date) + '</td>'
          + '<td>' + (b.n_lines || 0) + '</td><td>' + (b.n_units || 0) + '</td><td>' + (b.n_lines_packed || 0) + ' of ' + (b.n_lines || 0) + ' packed' + (b.photo_id ? ' · photo' : '') + '</td>'
          + '<td>' + (b.n_cartons ? b.n_cartons + ' (' + (b.n_awb || 0) + ' with AWB)' : '') + '</td><td>' + statusPill(b) + (flags ? '<div>' + flags + '</div>' : '') + '</td></tr>';
      });
      host.innerHTML = h + '</tbody></table></div></div>';
      host.querySelectorAll('tr.hzc-row').forEach(function (tr) { tr.onclick = function () { openBatch(tr.dataset.id); }; });
      wireWaiting();
    }
    // ── ready to batch (v28.518) ──
    function waitingCard() {
      var W = ST.waiting || [], ro = !opts.canWrite; if (!W.length) return '<div class="hzc-card"><h3>Ready to batch</h3><div class="hzc-mut2">No lines are waiting. New custom orders appear here once they are approved.</div></div>';
      var n = W.filter(function (l) { return ST.wpick[l.id]; }).length, towels = W.reduce(function (a, l) { return a + (l.qty || 0); }, 0);
      var h = '<div class="hzc-card hzc-scroll"><h3>Ready to batch: ' + W.length + ' line' + (W.length === 1 ? '' : 's') + ', ' + towels + ' towel' + (towels === 1 ? '' : 's') + '</h3>'
        + '<div class="hzc-mut2">Make a batch from the lines you choose, or all of them. It starts accepted and in production; download the files from the batch.</div>'
        + '<div class="hzc-row2"><button class="hzc-btn pri" data-wall' + (ro ? ' disabled' : '') + '>Create batch with all (' + W.length + ')</button><button class="hzc-btn" data-wtick' + (ro || !n ? ' disabled' : '') + '>Create batch from ticked (' + n + ')</button><span class="hzc-msg" data-wm></span></div>'
        + '<table><thead><tr><th><input type="checkbox" data-wallpick aria-label="Tick all"' + (n === W.length ? ' checked' : '') + '></th><th>Order</th><th>Ordered</th><th>Towel</th><th>Design</th><th>Qty</th><th>Goes to</th></tr></thead><tbody>';
      W.forEach(function (l) { h += '<tr><td><input type="checkbox" data-wpick="' + esc(l.id) + '" aria-label="Tick ' + esc(l.external_ref) + '"' + (ST.wpick[l.id] ? ' checked' : '') + '></td><td>' + esc(l.external_ref || '') + '<div class="hzc-mut2">' + esc(l.market || '') + '</div></td><td>' + fd(l.ordered_at) + '</td>'
        + '<td>' + esc(l.product_name || l.product_code) + '</td><td>' + esc(l.design || l.kind || '') + '</td><td>' + (l.qty || 0) + '</td><td class="hzc-mut2">' + esc(l.via_node ? 'carton to ' + l.via_node : l.node === 'CHINA_DIRECT' ? 'DHL direct to the customer' : '') + '</td></tr>'; });
      return h + '</tbody></table></div>';
    }
    function wireWaiting() {
      var W = ST.waiting || [];
      var al = q('[data-wallpick]'); if (al) al.onchange = function () { W.forEach(function (l) { ST.wpick[l.id] = al.checked; }); drawList(); };
      host.querySelectorAll('[data-wpick]').forEach(function (c) { c.onchange = function () { ST.wpick[c.dataset.wpick] = c.checked; drawList(); }; });
      function create(body, btn) { var m = q('[data-wm]'); if (!opts.canWrite) { m.className = 'hzc-msg err'; m.textContent = 'Read only: SUPPLY edit rights are needed to change this in the preview.'; return; }
        btn.disabled = true; m.className = 'hzc-msg'; m.textContent = 'Creating the batch…';
        api('batches/create', body).then(function (j) { var bs = j.batches || []; if (bs.length === 1) openBatch(bs[0].batch_id); else loadList(); })
          .catch(function (e) { btn.disabled = false; m.className = 'hzc-msg err'; m.textContent = e.message; }); }
      var a = q('[data-wall]'); if (a) a.onclick = function () { create({ all: true }, a); };
      var t = q('[data-wtick]'); if (t) t.onclick = function () { create({ line_ids: W.filter(function (l) { return ST.wpick[l.id]; }).map(function (l) { return l.id; }) }, t); };
    }
    function openBatch(id) {
      host.innerHTML = '<div class="hzc"><div class="hzc-msg">Loading the batch…</div></div>';
      api('batches/' + id).then(function (j) { ST.open = j.batch; ST.stages = j.stages || ['cut', 'stitched', 'packed']; ST.flagLabel = j.flag_label || ST.flagLabel; drawBatch(); })
        .catch(function (e) { host.innerHTML = '<div class="hzc"><button class="hzc-btn" data-back>Back to custom orders</button><div class="hzc-msg err">' + esc(e.message) + '</div></div>'; host.querySelector('[data-back]').onclick = loadList; });
    }
    function act(path, body, btn, msgEl) {
      if (!opts.canWrite) { if (msgEl) { msgEl.className = 'hzc-msg err'; msgEl.textContent = 'Read only: SUPPLY edit rights are needed to change this in the preview.'; } return; }
      if (btn) btn.disabled = true; if (msgEl) { msgEl.className = 'hzc-msg'; msgEl.textContent = 'Saving…'; }
      api('batches/' + ST.open.id + '/' + path, body || {}).then(function () { openBatch(ST.open.id); })
        .catch(function (e) { if (btn) btn.disabled = false; if (msgEl) { msgEl.className = 'hzc-msg err'; msgEl.textContent = e.message; } });
    }
    function drawBatch() {
      var b = ST.open, accepted = b.supplier_status === 'accepted', made = ['made', 'shipped', 'closed'].indexOf(b.status) >= 0, prog = b.progress || {}, ro = !opts.canWrite;
      var dl = base + 'batches/' + b.id;
      var h = '<div class="hzc"><div class="hzc-row2"><button class="hzc-btn" data-back>Back to custom orders</button><b>' + esc(b.po_ref) + '</b>' + statusPill(b)
        + (b.flags || []).map(function (f) { return pill('neg', ST.flagLabel[f] || f); }).join(' ') + '<span class="hzc-mut2">Tuesday ' + fd(b.batch_date) + ' · accept by ' + fd(b.accept_by) + ' · made by ' + fd(b.due_date) + '</span></div>';
      h += '<div class="hzc-card"><h3>Documents</h3><div class="hzc-row2"><a class="hzc-btn" href="' + dl + '/po">PO (PDF)</a>'
        + (b.lines || []).map(function (l, i) { return '<a class="hzc-btn" href="' + dl + '/artwork?line=' + encodeURIComponent(l.id) + '">Artwork line ' + (i + 1) + '</a>'; }).join('') + '</div></div>';
      h += '<div class="hzc-card"><h3>Production files</h3><div class="hzc-mut2">The print-ready file for every towel (true size, bleed, margin QR), pouch labels and the manifest. Files are made one at a time; a large file can take a minute. If the browser asks to allow several downloads, allow it once.</div><div data-files><div class="hzc-msg">Loading the file list…</div></div></div>';
      // 1 accept / problem
      h += '<div class="hzc-card"><div class="hzc-step">Step 1</div><h3>Accept the batch</h3>';
      if (accepted) h += '<div class="hzc-done">Accepted ' + fdt(b.accepted_at) + (b.accepted_by ? ' by ' + esc(b.accepted_by) : '') + '</div>';
      else if (['sent', 'confirmed'].indexOf(b.status) >= 0) h += (b.supplier_status === 'problem' ? '<div class="hzc-msg err">Problem flagged: ' + esc(b.problem_reason) + '</div>' : '')
        + '<div class="hzc-row2"><button class="hzc-btn pri" data-accept' + (ro ? ' disabled' : '') + '>Accept</button><input data-reason placeholder="Or describe a problem" style="flex:1;min-width:200px"><button class="hzc-btn" data-problem' + (ro ? ' disabled' : '') + '>Flag a problem</button></div><div class="hzc-msg" data-m1></div>';
      else h += '<div class="hzc-mut2">Nothing to accept.</div>';
      h += '</div>';
      // 2 lines
      h += '<div class="hzc-card hzc-scroll"><div class="hzc-step">Step 2</div><h3>Line progress</h3><table><thead><tr><th>#</th><th>Order</th><th>Towel</th><th>Design</th><th>Qty</th><th>Unit refs</th><th>Stage</th></tr></thead><tbody>';
      (b.lines || []).forEach(function (l, i) {
        var cur = prog[l.id] || '', ix = ST.stages.indexOf(cur), next = ST.stages[ix + 1];
        var gone = l.status === 'cancelled';   // v28.517: cancelled by the customer in Shopify (the Customiser takes it out of the files and the made check)
        var btn = (!made && accepted && next && !ro && !gone) ? '<button class="hzc-btn" data-stage="' + esc(next) + '" data-line="' + esc(l.id) + '">Mark ' + esc(next) + '</button>' : '';
        h += '<tr><td>' + (i + 1) + '</td><td>' + esc(l.external_ref || '') + '<div class="hzc-mut2">' + esc(l.market || '') + (l.via_node ? ' via ' + esc(l.via_node) : '') + '</div></td><td>' + esc(l.product_name || l.product_code) + '</td><td>' + esc(l.design || '') + '</td><td>' + (l.qty || 0) + '</td>'
          + '<td class="hzc-mut2">' + esc((l.units || []).map(function (u) { return u.ref; }).join(' ')) + '</td><td>' + (gone ? pill('neg', 'Cancelled: do not make') : cur ? '<span class="' + (cur === 'packed' ? 'hzc-done' : '') + '">' + esc(cur) + '</span> ' : '<span class="hzc-mut2">not started</span> ') + btn + '</td></tr>';
      });
      h += '</tbody></table>' + (accepted ? '' : '<div class="hzc-mut2">Accept the batch first.</div>') + '<div class="hzc-msg" data-m2></div></div>';
      // 3 photo
      h += '<div class="hzc-card"><div class="hzc-step">Step 3</div><h3>Photo of the first unit</h3>';
      var photos = (b.files || []).filter(function (f) { return f.kind === 'first_unit_photo'; });
      if (photos.length) h += '<div class="hzc-row2">' + photos.map(function (f) { return '<a href="' + base + 'files/' + esc(f.id) + '" target="_blank" rel="noopener"><img src="' + base + 'files/' + esc(f.id) + '" alt="first unit photo" style="height:90px;border-radius:6px;border:1px solid var(--line,#e5e9f0)"></a>'; }).join('') + '</div>';
      if (!made && accepted && !ro) h += '<div class="hzc-row2"><input type="file" accept="image/jpeg,image/png,image/webp" data-photo><input data-uref placeholder="Unit ref (optional)" style="width:130px"><button class="hzc-btn" data-upload>Upload</button></div><div class="hzc-mut2">JPEG, PNG or WebP, under 8 MB.</div>';
      h += '<div class="hzc-msg" data-m3></div></div>';
      // 4 made
      h += '<div class="hzc-card"><div class="hzc-step">Step 4</div><h3>Mark made</h3>';
      if (made) h += '<div class="hzc-done">Made ' + fdt(b.made_at) + (b.made_by ? ' by ' + esc(b.made_by) : '') + '</div>';
      else h += '<div class="hzc-row2"><button class="hzc-btn pri" data-made' + ((!accepted || ro) ? ' disabled' : '') + '>Mark the batch made</button><span class="hzc-mut2">Needs every line packed and the first unit photo.</span></div>';
      h += '<div class="hzc-msg" data-m4></div></div>';
      // 5 cartons
      var cs = (b.cartons || []).length ? b.cartons.map(function (c) { return { weight_kg: c.weight_kg, length_cm: c.length_cm, width_cm: c.width_cm, height_cm: c.height_cm, awb: c.awb || '' }; }) : [{ weight_kg: '', length_cm: '', width_cm: '', height_cm: '', awb: '' }];
      ST.cartons = cs;
      h += '<div class="hzc-card hzc-scroll"><div class="hzc-step">Step 5</div><h3>Cartons and DHL AWB</h3>';
      if (!made) h += '<div class="hzc-mut2">Mark the batch made first.</div>';
      else {
        h += '<table><thead><tr><th>#</th><th>Weight (kg)</th><th>Length (cm)</th><th>Width (cm)</th><th>Height (cm)</th><th>DHL AWB (10 digits)</th></tr></thead><tbody data-ctn>' + cartonRows(cs, b.status === 'closed' || ro) + '</tbody></table>';
        if (b.status !== 'closed' && !ro) h += '<div class="hzc-row2"><button class="hzc-btn" data-addc>Add a carton</button><button class="hzc-btn pri" data-savec>Save cartons</button><span class="hzc-mut2">When every carton has an AWB the batch is shipped and the customers are told.</span></div>';
      }
      h += '<div class="hzc-msg" data-m5></div></div>';
      // timeline
      if ((b.timeline || []).length) h += '<div class="hzc-card"><h3>Timeline</h3>' + b.timeline.slice(0, 30).map(function (t) { return '<div class="hzc-mut2">' + fdt(t.at) + ' · ' + esc(t.type) + (t.actor ? ' · ' + esc(t.actor) : '') + '</div>'; }).join('') + '</div>';
      host.innerHTML = h + '</div>';
      wire(); loadFiles();
    }
    // ── production files (v28.517) ──
    var KIND = { front: 'Front', back: 'Back', label: 'Pouch label', pouch: 'Printed pouch', roll: 'Roll sheet', manifest: 'Manifest' };
    function prodUrl(qs) { return base + 'batches/' + ST.open.id + '/production?' + qs; }
    function loadFiles() {
      var id = ST.open.id;
      fetch(prodUrl('list=1'), { headers: { accept: 'application/json' } }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
        .then(function (j) { if (!ST.open || ST.open.id !== id) return; var tag = String(ST.open.po_ref || '').replace(/[^A-Za-z0-9_-]+/g, '');
          ST.files = (j.files || []).map(function (f) { return { name: f.name, kind: f.kind, format: f.format, unit: f.unit }; }).concat([{ name: tag + '_manifest.csv', kind: 'manifest', format: 'csv' }]);
          ST.done = j.downloads || {}; ST.fst = {}; ST.ferr = {}; ST.pick = {}; ST.files.forEach(function (f) { ST.pick[f.name] = !ST.done[f.name]; }); drawFiles(); })
        .catch(function (e) { var el = q('[data-files]'); if (el) el.innerHTML = '<div class="hzc-msg err">' + esc(e.message) + '</div>'; });
    }
    function drawFiles() {
      var el = q('[data-files]'); if (!el || !ST.files) return; var F = ST.files, run = ST.running;
      var rem = F.filter(function (f) { return !ST.done[f.name]; }), tick = F.filter(function (f) { return ST.pick[f.name]; });
      var h = '<div class="hzc-row2"><button class="hzc-btn pri" data-dl-rem' + (run || !rem.length ? ' disabled' : '') + '>Download remaining (' + rem.length + ')</button>'
        + '<button class="hzc-btn" data-dl-tick' + (run || !tick.length ? ' disabled' : '') + '>Download ticked (' + tick.length + ')</button>'
        + (run ? '<button class="hzc-btn" data-dl-stop>Stop after this file</button>' : '') + '<span class="hzc-mut2">' + (F.length - rem.length) + ' of ' + F.length + ' downloaded</span></div>';
      h += '<div class="hzc-scroll"><table><thead><tr><th><input type="checkbox" data-dl-all aria-label="Tick all"' + (tick.length === F.length ? ' checked' : '') + (run ? ' disabled' : '') + '></th><th>File</th><th>Towel</th><th>Kind</th><th>Status</th><th></th></tr></thead><tbody>';
      F.forEach(function (f, i) { var s = ST.fst[f.name] || '', d = ST.done[f.name];
        var stat = s === 'busy' ? pill('blue', 'Preparing…') : s === 'queued' ? pill('mut', 'Waiting') : s === 'error' ? pill('neg', 'Failed') + '<div class="hzc-msg err">' + esc(ST.ferr[f.name] || '') + '</div>'
          : d ? pill('pos', 'Downloaded ' + fdt(d.at)) : pill('amber', 'Not downloaded');
        h += '<tr><td><input type="checkbox" data-dl-pick="' + i + '" aria-label="Tick ' + esc(f.name) + '"' + (ST.pick[f.name] ? ' checked' : '') + (run ? ' disabled' : '') + '></td><td style="word-break:break-all">' + esc(f.name) + '</td><td>' + esc(f.unit || '') + '</td>'
          + '<td>' + esc((KIND[f.kind] || f.kind) + ' ' + String(f.format || '').toUpperCase()) + '</td><td>' + stat + '</td><td><button class="hzc-btn" data-dl-one="' + i + '"' + (run ? ' disabled' : '') + '>' + (d ? 'Again' : 'Download') + '</button></td></tr>'; });
      el.innerHTML = h + '</tbody></table></div>';
      var b1 = el.querySelector('[data-dl-rem]'); if (b1) b1.onclick = function () { runFiles(rem); };
      var b2 = el.querySelector('[data-dl-tick]'); if (b2) b2.onclick = function () { runFiles(tick); };
      var b3 = el.querySelector('[data-dl-stop]'); if (b3) b3.onclick = function () { ST.stop = true; b3.disabled = true; };
      var al = el.querySelector('[data-dl-all]'); if (al) al.onchange = function () { F.forEach(function (f) { ST.pick[f.name] = al.checked; }); drawFiles(); };
      el.querySelectorAll('[data-dl-pick]').forEach(function (c) { c.onchange = function () { ST.pick[F[+c.dataset.dlPick].name] = c.checked; drawFiles(); }; });
      el.querySelectorAll('[data-dl-one]').forEach(function (bt) { bt.onclick = function () { runFiles([F[+bt.dataset.dlOne]]); }; });
    }
    function oneFile(f) {
      ST.fst[f.name] = 'busy'; ST.ferr[f.name] = ''; drawFiles();
      return fetch(prodUrl('file=' + encodeURIComponent(f.name) + '&link=1'), { headers: { accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.url) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
        .then(function (j) { var a = document.createElement('a'); a.href = j.url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
          ST.fst[f.name] = 'done'; ST.done[f.name] = { at: new Date().toISOString() }; ST.pick[f.name] = false; })
        .catch(function (e) { ST.fst[f.name] = 'error'; ST.ferr[f.name] = String(e && e.message || e).slice(0, 160); });
    }
    function runFiles(list) {
      if (ST.running || !list.length) return; ST.running = true; ST.stop = false; list.forEach(function (f) { ST.fst[f.name] = 'queued'; }); drawFiles();
      var i = 0, id = ST.open.id;
      (function next() {
        if (ST.stop || i >= list.length || !ST.open || ST.open.id !== id) { ST.running = false; list.forEach(function (f) { if (ST.fst[f.name] === 'queued') ST.fst[f.name] = ''; }); drawFiles(); return; }
        oneFile(list[i++]).then(function () { drawFiles(); setTimeout(next, 1200); });   // a pause so the browser takes each download in turn
      })();
    }
    function cartonRows(cs, ro) {
      return cs.map(function (c, i) { function inp(k, w) { return '<input data-c="' + i + '" data-k="' + k + '" value="' + esc(c[k] == null ? '' : c[k]) + '" style="width:' + w + 'px"' + (ro ? ' disabled' : '') + '>'; }
        return '<tr><td>' + (i + 1) + '</td><td>' + inp('weight_kg', 70) + '</td><td>' + inp('length_cm', 70) + '</td><td>' + inp('width_cm', 70) + '</td><td>' + inp('height_cm', 70) + '</td><td>' + inp('awb', 120) + '</td></tr>'; }).join('');
    }
    function q(sel) { return host.querySelector(sel); }
    function wire() {
      q('[data-back]').onclick = loadList;
      var a = q('[data-accept]'); if (a) a.onclick = function () { act('respond', { decision: 'accept' }, a, q('[data-m1]')); };
      var p = q('[data-problem]'); if (p) p.onclick = function () { var r = (q('[data-reason]').value || '').trim(); if (r.length < 3) { var m = q('[data-m1]'); m.className = 'hzc-msg err'; m.textContent = 'Say what the problem is.'; return; } act('respond', { decision: 'problem', note: r }, p, q('[data-m1]')); };
      host.querySelectorAll('[data-stage]').forEach(function (bt) { bt.onclick = function () { act('lines', { line_id: bt.dataset.line, stage: bt.dataset.stage }, bt, q('[data-m2]')); }; });
      var up = q('[data-upload]'); if (up) up.onclick = function () { var f = q('[data-photo]').files[0], m = q('[data-m3]'); if (!f) { m.className = 'hzc-msg err'; m.textContent = 'Choose a photo.'; return; }
        if (f.size > 8 * 1024 * 1024) { m.className = 'hzc-msg err'; m.textContent = 'The photo must be under 8 MB.'; return; }
        var rd = new FileReader(); rd.onload = function () { act('photo', { data_base64: String(rd.result).replace(/^data:[^,]*,/, ''), mime: f.type, filename: f.name, unit_ref: q('[data-uref]').value || null }, up, m); }; rd.readAsDataURL(f); };
      var md = q('[data-made]'); if (md) md.onclick = function () { act('made', {}, md, q('[data-m4]')); };
      var ad = q('[data-addc]'); if (ad) ad.onclick = function () { readCartons(); ST.cartons.push({ weight_kg: '', length_cm: '', width_cm: '', height_cm: '', awb: '' }); q('[data-ctn]').innerHTML = cartonRows(ST.cartons, false); };
      var sv = q('[data-savec]'); if (sv) sv.onclick = function () { readCartons(); act('cartons', { cartons: ST.cartons }, sv, q('[data-m5]')); };
    }
    function readCartons() { host.querySelectorAll('[data-c]').forEach(function (i) { var c = ST.cartons[+i.dataset.c]; if (c) c[i.dataset.k] = i.value.trim(); }); }
    loadList();
  }
  // Ask whether this supplier has custom orders; cb(status) only when linked.
  function status(base, cb) { fetch(base + 'status', { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.linked) cb(j); }).catch(function () {}); }
  window.HZCustomOrders = { render: render, status: status };
})();
