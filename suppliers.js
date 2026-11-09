/* Suppliers List — who gets paid, into which account, and what for.

   The bank transfer form reads this: pick a supplier there and it fills the
   beneficiary, the account, the bank and the reason. The bank is chosen from
   the Banks page so the SWIFT code comes with it, though it stays editable
   because a branch code can differ from the bank's own. */

const $ = id => document.getElementById(id);
let table, unsaved;

function flashMsg(msg){
  const n = $('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => n.classList.remove('show'), 3200);
}

/* an edit only marks the page; Save is what writes it */
function touched(){
  unsaved.touch();
  refreshState();
}

const bankOptions = () => LISTS.banks().map(b => ({
  value: b.en || b.ar,
  label: [b.en, b.ar].filter(Boolean).join('  ·  '),
}));

/* choosing a bank brings its SWIFT with it, unless one is already written */
function onBankPicked(row, value){
  const b = LISTS.banks().find(x => (x.en || x.ar) === value);
  if (b && b.swift && !row.swift) row.swift = b.swift;
}

const COLUMNS = [
  { key:'order',   label:'#',                   width:'54px', type:'order' },
  { key:'nameAr',  label:'اسم المورد (عربي)',    width:'19%',  dir:'rtl' },
  { key:'nameEn',  label:'Supplier (English)',   width:'13%',  dir:'ltr' },
  { key:'iban',    label:'IBAN',                 width:'19%',  dir:'ltr', upper:true, live:true },
  { key:'account', label:'Account no.',          width:'11%',  dir:'ltr' },
  { key:'bank',    label:'Bank',                 width:'15%',  type:'select', options:bankOptions, onChange:onBankPicked },
  { key:'swift',   label:'SWIFT',                width:'10%',  dir:'ltr', upper:true, live:true },
  { key:'reason',  label:'سبب التحويل — Reason', width:'13%',  dir:'auto' },
];

function refreshState(){
  const rows = table ? table.rows : LISTS.suppliers();
  $('state').textContent = rows.length
    ? rows.length + (rows.length === 1 ? ' supplier' : ' suppliers')
    : 'No suppliers yet. Add one, or import your spreadsheet.';

}

function exportBook(){
  const aoa = [['#','Supplier Name (Arabic)','Supplier Name (English)','IBAN','Account No.','Bank','SWIFT','Reason']];
  table.rows.forEach(s => aoa.push([s.order, s.nameAr, s.nameEn, s.iban, s.account, s.bank, s.swift, s.reason]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:5},{wch:40},{wch:26},{wch:32},{wch:20},{wch:30},{wch:14},{wch:26}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  XLSX.writeFile(wb, 'Suppliers.xlsx');
  flashMsg('Saved Suppliers.xlsx');
}

async function boot(){
  await setupGate();
  await LISTS.loadRepository();
  table = ListTable({ mount: $('table'), columns: COLUMNS, rows: LISTS.suppliers(), onChange: touched });
  unsaved = Unsaved({
    badge: $('dirty'), saveBtn: $('btnSave'),
    commit: async () => {
      try { if (await LISTS.saveSuppliers(table.rows)) return true; }
      catch(e){ flashMsg(e.message); return false; }
      flashMsg('Could not save to GitHub.'); return false;
    },
    onSaved: () => flashMsg(table.rows.length + ' suppliers saved.'),
  });
  table.render();
  refreshState();

  $('btnAdd').addEventListener('click', () =>
    table.add({ nameAr:'', nameEn:'', iban:'', account:'', bank:'', swift:'', reason:'' }));
  $('btnSave').addEventListener('click', () => unsaved.save());
  $('btnExport').addEventListener('click', exportBook);
}

boot().catch(e => { $('state').textContent='Could not load the repository list: '+e.message+' Reload to retry.'; flashMsg('Repository list could not be loaded.'); });
