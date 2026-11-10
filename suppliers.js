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

/* The English name and its acronym, nothing else — the Arabic name and the
   SWIFT code made the list hard to scan, and the SWIFT arrives with the pick
   anyway. */
const bankOptions = () => LISTS.banks().map(b => ({
  value: b.en || b.ar,
  label: [b.en || b.ar, b.acronym && `(${b.acronym})`].filter(Boolean).join(' '),
}));

/* The SWIFT belongs to the bank, not to the supplier: it is set on the Banks
   page and read here, so one correction there fixes every supplier that banks
   in the same place. That is why the column cannot be typed into. */
const swiftOfBank = name => {
  const b = LISTS.banks().find(x => (x.en || x.ar) === name);
  return b ? b.swift || '' : '';
};

/* Selecting a bank brings its SWIFT with it. */
function onBankPicked(row, value){
  row.swift = swiftOfBank(value);
}

/* A row whose SWIFT no longer matches its bank — the bank's code was corrected
   after the supplier was entered — is brought back into line, and the page is
   marked unsaved so the correction is yours to keep. */
function refreshSwiftCodes(rows){
  const fixed = [];
  for(const row of rows){
    if(!row.bank) continue;
    const swift = swiftOfBank(row.bank);
    if(swift && swift !== (row.swift || '')){
      row.swift = swift;
      fixed.push(row.nameEn || row.nameAr || ('row ' + row.order));
    }
  }
  return fixed;
}

/* Widths are in pixels and add up to about 1220, so every column lands on an
   ordinary laptop without scrolling sideways. Drag a heading's right edge to
   change one; what you set is remembered, and double-clicking a grip puts that
   column back. */
const COLUMNS = [
  { key:'order',   label:'#',                   width:54,  type:'order' },
  { key:'nameAr',  label:'اسم المورد (عربي)',    width:230, dir:'rtl' },
  { key:'nameEn',  label:'Supplier (English)',   width:150, dir:'ltr' },
  { key:'iban',    label:'IBAN',                 width:230, dir:'ltr', upper:true, live:true },
  { key:'account', label:'Account no.',          width:120, dir:'ltr' },
  { key:'bank',    label:'Bank',                 width:186, type:'select', options:bankOptions, onChange:onBankPicked },
  /* filled by the bank you pick; to change one, edit it on the Banks page */
  { key:'swift',   label:'SWIFT',                width:110, dir:'ltr', readOnly:true },
  { key:'reason',  label:'سبب التحويل — Reason', width:150, dir:'auto' },
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
  table = ListTable({ mount: $('table'), columns: COLUMNS, rows: LISTS.suppliers(), onChange: touched,
                    widthKey: 'abk-suppliers-widths' });
  unsaved = Unsaved({
    badge: $('dirty'), saveBtn: $('btnSave'),
    commit: async () => {
      try { if (await LISTS.saveSuppliers(table.rows)) return true; }
      catch(e){ flashMsg(e.message); return false; }
      flashMsg('Could not save to GitHub.'); return false;
    },
    onSaved: () => flashMsg(table.rows.length + ' suppliers saved.'),
  });
  const fixed = refreshSwiftCodes(table.rows);
  table.render();
  refreshState();
  if(fixed.length){
    unsaved.touch();
    flashMsg(fixed.length === 1
      ? 'SWIFT code updated from the Banks list for ' + fixed[0] + '. Save to keep it.'
      : fixed.length + ' SWIFT codes updated from the Banks list. Save to keep them.');
  }

  $('btnAdd').addEventListener('click', () =>
    table.add({ nameAr:'', nameEn:'', iban:'', account:'', bank:'', swift:'', reason:'' }));
  $('btnSave').addEventListener('click', () => unsaved.save());
  $('btnExport').addEventListener('click', exportBook);
}

boot().catch(e => { $('state').textContent='Could not load the repository list: '+e.message+' Reload to retry.'; flashMsg('Repository list could not be loaded.'); });
