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

const COLUMNS = [
  { key:'recordedAt', label:'Saved',        width:'128px', get: r => formatWhen(r.recordedAt) },
  { key:'date',       label:'Value date',   width:'96px' },
  { key:'benName',    label:'Beneficiary',  width:'20%'  },
  { key:'benAccount', label:'Account / IBAN', width:'17%' },
  { key:'benBank',    label:'Bank',         width:'15%'  },
  { key:'currency',   label:'Ccy',          width:'62px' },
  { key:'amount',     label:'Amount',       width:'110px', num:true },
  { key:'purpose',    label:'Purpose',      width:'16%'  },
  { key:'issueType',  label:'Type',         width:'84px' },
  { key:'charges',    label:'Charges',      width:'84px' },
];

function formatWhen(iso){
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const cellText = (row, col) => String(col.get ? col.get(row) : (row[col.key] == null ? '' : row[col.key]));

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
    if (c.width) th.style.width = c.width;
    hr.appendChild(th);
  }
  hr.appendChild(el('th', null, ''));
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
    const del = el('button', 'iconbtn danger', '✕');
    del.type = 'button'; del.title = 'Remove this record';
    del.addEventListener('click', () => {
      if (!confirm(`Remove the transfer to ${r.benName || 'this beneficiary'} of ${r.currency} ${r.amount}?`)) return;
      rows = rows.filter(x => x.id !== r.id);
      unsaved.touch();
      render();
    });
    act.appendChild(del);
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
                'Amount in words','Purpose','Type','Charges','Debit account','Debit ccy','Ordering customer','File'];
  const aoa = [head];
  for (const r of shown){
    aoa.push([formatWhen(r.recordedAt), r.date, r.benName, r.benAccount, r.benBank, r.benSwift,
              r.currency, r.amount, r.amountWords, r.purpose, r.issueType, r.charges,
              r.debitAccount, r.debitCurrency, r.ordName, r.file]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:17},{wch:12},{wch:34},{wch:32},{wch:26},{wch:13},{wch:8},{wch:14},
                 {wch:46},{wch:26},{wch:10},{wch:9},{wch:18},{wch:9},{wch:28},{wch:34}];
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
