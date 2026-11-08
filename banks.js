/* Banks List — the names and SWIFT codes the Suppliers page chooses from. */

const $ = id => document.getElementById(id);
let table;

function flashMsg(msg){
  const n = $('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => n.classList.remove('show'), 3000);
}

function save(rows){
  if (!LISTS.saveBanks(rows)) flashMsg('Could not save in this browser.');
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

function importBook(file){
  const r = new FileReader();
  r.onload = () => {
    let wb;
    try { wb = XLSX.read(new Uint8Array(r.result), { type:'array' }); }
    catch(e){ return flashMsg('That file is not a workbook this can read.'); }

    const grid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, raw:false, defval:'' });
    const out = [];
    for (const row of grid){
      const cells = row.map(c => String(c).trim());
      // the header row names a column; a data row has a bank on it
      const swift = cells.find(c => LISTS.isBic(c)) || '';
      const texts = cells.filter(c => c && c !== swift && !/^\d+$/.test(c));
      if (!texts.length) continue;
      if (/bank name|اسم البنك|swift/i.test(cells.join(' '))) continue;
      const en = texts.find(t => /[A-Za-z]/.test(t)) || '';
      const ar = texts.find(t => /[؀-ۿ]/.test(t)) || '';
      if (!en && !ar) continue;
      out.push({ order: out.length + 1, en, ar, swift });
    }
    if (!out.length) return flashMsg('No banks found in that file.');
    table.rows = out;
    save(out);
    flashMsg(`Imported ${out.length} banks.`);
  };
  r.onerror = () => flashMsg('Could not read that file.');
  r.readAsArrayBuffer(file);
}

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
  table = ListTable({ mount: $('table'), columns: COLUMNS, rows: LISTS.banks(), onChange: save });
  table.render();
  refreshState();

  $('btnAdd').addEventListener('click', () => table.add({ en:'', ar:'', swift:'' }));
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', e => {
    if (e.target.files[0]) importBook(e.target.files[0]);
    e.target.value = '';
  });
  $('btnExport').addEventListener('click', exportBook);
  $('btnReset').addEventListener('click', () => {
    if (!confirm('Throw away your changes and go back to the standard list of Egyptian banks?')) return;
    LISTS.resetBanks();
    table.rows = LISTS.banks();
    refreshState();
    flashMsg('Standard list restored.');
  });
}

boot().catch(e => flashMsg('Could not start: ' + e.message));
