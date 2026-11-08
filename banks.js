/* Banks List — the names and SWIFT codes the Suppliers page chooses from. */

const $ = id => document.getElementById(id);
let table, unsaved;

function flashMsg(msg){
  const n = $('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => n.classList.remove('show'), 3000);
}

/* an edit only marks the page; Save is what writes it */
function touched(){
  unsaved.touch();
  refreshState();
}

function refreshState(){
  const rows = table ? table.rows : LISTS.banks();
  const bad = rows.filter(b => b.swift && !LISTS.isBic(b.swift)).length;
  $('state').textContent = rows.length + (rows.length === 1 ? ' bank' : ' banks')
    + (bad ? ` · ${bad} with a SWIFT code that is not the usual 8 or 11 characters` : '');
}

const COLUMNS = [
  { key:'order', label:'#',                  width:'62px',  type:'order' },
  { key:'en',    label:'Bank name (English)', width:'32%',  dir:'ltr' },
  { key:'ar',    label:'اسم البنك (عربي)',    width:'32%',  dir:'rtl' },
  { key:'swift', label:'SWIFT code',          width:'150px', dir:'ltr', upper:true, live:true },
];

function exportBook(){
  const aoa = [['#', 'Bank Name (English)', 'Bank Name (Arabic)', 'SWIFT Code']];
  table.rows.forEach(b => aoa.push([b.order, b.en, b.ar, b.swift]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch:5 }, { wch:42 }, { wch:34 }, { wch:16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Banks');
  XLSX.writeFile(wb, 'Banks.xlsx');
  flashMsg('Saved Banks.xlsx');
}

async function boot(){
  await setupGate();
  table = ListTable({ mount: $('table'), columns: COLUMNS, rows: LISTS.banks(), onChange: touched });
  unsaved = Unsaved({
    badge: $('dirty'), saveBtn: $('btnSave'),
    commit: () => {
      if (LISTS.saveBanks(table.rows)) return true;
      flashMsg('Could not save in this browser.'); return false;
    },
    onSaved: () => flashMsg(table.rows.length + ' banks saved.'),
  });
  table.render();
  refreshState();

  $('btnAdd').addEventListener('click', () => table.add({ en:'', ar:'', swift:'' }));
  $('btnSave').addEventListener('click', () => unsaved.save());
  $('btnExport').addEventListener('click', exportBook);
  $('btnReset').addEventListener('click', () => {
    if (!confirm('Throw away your changes and go back to the standard list of Egyptian banks?')) return;
    LISTS.resetBanks();
    table.rows = LISTS.banks();
    unsaved.settled();
    refreshState();
    flashMsg('Standard list restored.');
  });
}

boot().catch(e => flashMsg('Could not start: ' + e.message));
