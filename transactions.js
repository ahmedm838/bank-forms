/* Transactions — what was transferred, to whom, and when.

   A row is written each time a transfer is saved from the Bank Transfer form.
   Rows are read-only here: a record of a payment should not be editable after
   the fact. A row can be removed, and removals wait for Save like the other
   lists, so a mis-click is not final. */

const $ = id => document.getElementById(id);
let rows = [];                 // what is on screen, removals included
let filters = {};
let unsaved;

const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

function flashMsg(msg){
  const n = $('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => n.classList.remove('show'), 3000);
}

/* Widths are in pixels and add up to about 1280, so every column lands on an
   ordinary laptop without scrolling sideways. Drag a heading edge to change
   one; the widths you set are remembered. */
const COLUMNS = [
  { key:'recordedAt', label:'Saved',          width:116, get: r => formatWhen(r.recordedAt) },
  { key:'date',       label:'Value date',     width:88 },
  { key:'benName',    label:'Beneficiary',    width:208 },
  { key:'benAccount', label:'Account / IBAN', width:224 },
  { key:'benBank',    label:'Bank',           width:186 },
  { key:'currency',   label:'Ccy',            width:52 },
  { key:'amount',     label:'Amount',         width:104, num:true },
  { key:'purpose',    label:'Purpose',        width:182 },
  { key:'issueType',  label:'Type',           width:72 },
];

function formatWhen(iso){
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const cellText = (row, col) => String(col.get ? col.get(row) : (row[col.key] == null ? '' : row[col.key]));

/* ---------- column widths ----------
   The defaults add up to a laptop screen. Drag the right edge of a heading to
   change one, and the widths are remembered for next time. */
const ACTS_W = 124;
const WIDTH_KEY = 'abk-tx-widths';
let widths = (() => {
  try { return JSON.parse(localStorage.getItem(WIDTH_KEY)) || {}; }
  catch(e){ return {}; }
})();
const widthOf = c => Math.max(44, Number(widths[c.key]) || c.width);
function saveWidths(){
  try { localStorage.setItem(WIDTH_KEY, JSON.stringify(widths)); } catch(e){}
}

function makeResizer(col){
  const grip = el('span', 'resizer');
  grip.title = 'Drag to resize · double-click to reset';
  grip.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startW = widthOf(col);
    const th = grip.parentElement;
    document.body.classList.add('resizing');
    const move = ev => {
      const w = Math.max(44, startW + ev.clientX - startX);
      widths[col.key] = w;
      th.style.width = w + 'px';          // live, without rebuilding the table
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.classList.remove('resizing');
      saveWidths();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  grip.addEventListener('dblclick', e => {
    e.preventDefault(); e.stopPropagation();
    delete widths[col.key]; saveWidths(); render();
  });
  return grip;
}

function visibleRows(){
  return rows.filter(r => COLUMNS.every(c => {
    const q = (filters[c.key] || '').trim().toLowerCase();
    return !q || cellText(r, c).toLowerCase().includes(q);
  }));
}

function render(){
  const mount = $('table');
  mount.innerHTML = '';

  const table = el('table', 'listtable txtable');
  const thead = el('thead');

  const hr = el('tr');
  for (const c of COLUMNS){
    const th = el('th', null, c.label);
    th.style.width = widthOf(c) + 'px';
    th.appendChild(makeResizer(c));
    hr.appendChild(th);
  }
  hr.appendChild(el('th', 'rowacts-head', ''));
  thead.appendChild(hr);

  /* a filter box under each heading */
  const fr = el('tr', 'filterrow');
  for (const c of COLUMNS){
    const td = el('th');
    const inp = document.createElement('input');
    inp.type = 'search';
    inp.placeholder = 'filter';
    inp.value = filters[c.key] || '';
    inp.addEventListener('input', () => {
      filters[c.key] = inp.value;
      render();
      const again = mount.querySelector(`.filterrow input[data-k="${c.key}"]`);
      if (again){ again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
    inp.dataset.k = c.key;
    td.appendChild(inp);
    fr.appendChild(td);
  }
  fr.appendChild(el('th'));
  thead.appendChild(fr);
  table.appendChild(thead);

  const shown = visibleRows();
  const tb = el('tbody');
  for (const r of shown){
    const tr = el('tr');
    for (const c of COLUMNS){
      const td = el('td', c.num ? 'n' : null, cellText(r, c));
      td.title = cellText(r, c);
      tr.appendChild(td);
    }
    const act = el('td', 'rowacts');

    const edit = el('a', 'rowbtn', 'Edit');
    edit.href = 'form.html?f=transfer&tx=' + encodeURIComponent(r.id);
    edit.title = 'Open this transfer on the form to change it';
    edit.addEventListener('click', e => {
      if (!unsaved.dirty) return;
      if (!confirm('There are unsaved changes here. Leave them and open the transfer?')) e.preventDefault();
    });

    const del = el('button', 'rowbtn danger', 'Delete');
    del.type = 'button'; del.title = 'Delete this record';
    del.addEventListener('click', () => {
      if (!confirm(`Delete the transfer to ${r.benName || 'this beneficiary'} of ${r.currency} ${r.amount}?`)) return;
      rows = rows.filter(x => x.id !== r.id);
      unsaved.touch();
      render();
    });
    act.append(edit, del);
    tr.appendChild(act);
    tb.appendChild(tr);
  }
  table.appendChild(tb);
  mount.appendChild(table);

  if (!rows.length){
    mount.appendChild(el('p', 'hint', 'Nothing here yet. Transfers are written down when you use Save PDF… on the bank transfer form.'));
  } else if (!shown.length){
    mount.appendChild(el('p', 'hint', 'No transfer matches those filters.'));
  }

  const total = shown.reduce((s, r) => s + (parseFloat(String(r.amount).replace(/,/g,'')) || 0), 0);
  const ccys = [...new Set(shown.map(r => r.currency).filter(Boolean))];
  $('state').textContent =
    shown.length === rows.length
      ? `${rows.length} ${rows.length === 1 ? 'transfer' : 'transfers'}`
      : `${shown.length} of ${rows.length} shown`;
  if (shown.length && ccys.length === 1)
    $('state').textContent += ` · ${ccys[0]} ${total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}

function exportBook(){
  const shown = visibleRows();
  const head = ['Saved','Value date','Beneficiary','Account / IBAN','Bank','SWIFT','Currency','Amount',
                'Amount in words','Purpose','Type','Charges','Debit account','Debit ccy',
                'Commission account','Commission ccy','Ordering customer','File'];
  const aoa = [head];
  for (const r of shown){
    aoa.push([formatWhen(r.recordedAt), r.date, r.benName, r.benAccount, r.benBank, r.benSwift,
              r.currency, r.amount, r.amountWords, r.purpose, r.issueType, r.charges,
              r.debitAccount, r.debitCurrency, r.commAccount, r.commCurrency, r.ordName, r.file]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:17},{wch:12},{wch:34},{wch:32},{wch:26},{wch:13},{wch:8},{wch:14},
                 {wch:46},{wch:26},{wch:10},{wch:9},{wch:18},{wch:9},{wch:18},{wch:9},{wch:28},{wch:34}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Transactions ${stamp}.xlsx`);
  flashMsg(`Saved ${shown.length} ${shown.length === 1 ? 'transfer' : 'transfers'}.`);
}

async function boot(){
  await setupGate();
  rows = LISTS.transactions();
  unsaved = Unsaved({
    badge: $('dirty'), saveBtn: $('btnSave'),
    commit: () => {
      if (LISTS.saveTransactions(rows)) return true;
      flashMsg('Could not save in this browser.'); return false;
    },
    onSaved: () => flashMsg('Saved.'),
  });
  render();

  $('btnSave').addEventListener('click', () => unsaved.save());
  $('btnExport').addEventListener('click', exportBook);
  $('btnClearFilters').addEventListener('click', () => { filters = {}; render(); });
}

boot().catch(e => flashMsg('Could not start: ' + e.message));
