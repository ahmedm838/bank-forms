/* Suppliers List — who gets paid, into which account, and what for.

   The bank transfer form reads this: pick a supplier there and it fills the
   beneficiary, the account, the bank and the reason. The bank is chosen from
   the Banks page so the SWIFT code comes with it, though it stays editable
   because a branch code can differ from the bank's own. */

const $ = id => document.getElementById(id);
let table;

function flashMsg(msg){
  const n = $('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashMsg.t);
  flashMsg.t = setTimeout(() => n.classList.remove('show'), 3200);
}

function save(rows){
  if (!LISTS.saveSuppliers(rows)) flashMsg('Could not save in this browser.');
  refreshState();
}

const bankOptions = () => LISTS.banks().map(b => ({
  value: b.en || b.ar,
  label: (b.en || b.ar) + (b.swift ? '  ·  ' + b.swift : ''),
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

function problems(rows){
  const out = [];
  const bankList = LISTS.banks();
  const known = new Set(bankList.map(b => b.en || b.ar));
  rows.forEach((s, i) => {
    const who = s.nameEn || s.nameAr || ('row ' + (i + 1));

    /* The first eight characters of a SWIFT code are the bank. If they disagree
       with the bank chosen, one of the two is wrong — which is how a mistyped
       letter in a code that still looks well-formed gets caught. */
    const chosen = bankList.find(b => (b.en || b.ar) === s.bank);
    if (chosen && s.swift && LISTS.isBic(s.swift)){
      const head = String(s.swift).toUpperCase().slice(0, 8);
      const bankHead = String(chosen.swift).toUpperCase().slice(0, 8);
      if (bankHead && head !== bankHead)
        out.push(`${who}: SWIFT starts "${head}" but ${chosen.en || chosen.ar} is "${bankHead}" — one of the two is wrong.`);
    }
    if (!LISTS.payTo(s)) out.push(`${who} has neither an IBAN nor an account number, so the transfer form cannot pay it.`);
    if (s.bank && !known.has(s.bank)) out.push(`${who}: "${s.bank}" is not on the Banks list — pick a bank so the SWIFT code comes with it.`);
    if (s.swift && !LISTS.isBic(s.swift)) out.push(`${who}: SWIFT "${s.swift}" is not the usual 8 or 11 characters; the transfer form will leave it out.`);
    if (s.iban && !LISTS.looksLikeIban(s.iban)) out.push(`${who}: "${s.iban}" is in the IBAN column but does not read like one — if it is a plain account number it belongs in the next column.`);
  });
  return out;
}

function refreshState(){
  const rows = table ? table.rows : LISTS.suppliers();
  $('state').textContent = rows.length
    ? rows.length + (rows.length === 1 ? ' supplier' : ' suppliers')
    : 'No suppliers yet. Add one, or import your spreadsheet.';

  const list = problems(rows);
  const box = $('problems');
  if (!list.length){ box.hidden = true; return; }
  box.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = list.length === 1 ? 'One thing to check:' : list.length + ' things to check:';
  box.appendChild(b);
  const ul = document.createElement('ul');
  list.forEach(p => { const li = document.createElement('li'); li.textContent = p; ul.appendChild(li); });
  box.appendChild(ul);
  box.hidden = false;
}

/* ---------- import ----------
   Reads the sheet by its headings rather than by column position, since the
   attached one starts at column B. */
const HEAD = {
  nameAr:  /اسم المورد.*عرب|supplier name \(arabic\)/i,
  nameEn:  /اسم المورد.*انج|supplier name \(english\)/i,
  iban:    /iban/i,
  account: /^رقم الحساب$|account/i,
  bank:    /^البنك$|^bank$/i,
  swift:   /سوفت|swift/i,
  reason:  /سبب|reason|purpose/i,
};

function importBook(file){
  const r = new FileReader();
  r.onload = () => {
    let wb;
    try { wb = XLSX.read(new Uint8Array(r.result), { type:'array' }); }
    catch(e){ return flashMsg('That file is not a workbook this can read.'); }

    const grid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, raw:false, defval:'' });
    const headRow = grid.findIndex(row => row.some(c => HEAD.iban.test(String(c))));
    if (headRow === -1) return flashMsg('No heading row found — is that the suppliers sheet?');

    const cols = {};
    grid[headRow].forEach((cell, i) => {
      const text = String(cell).trim();
      for (const [key, re] of Object.entries(HEAD)){
        if (cols[key] == null && text && re.test(text)) cols[key] = i;
      }
    });

    const bankList = LISTS.banks();
    const out = [];
    let placed = 0, unplaced = 0;

    for (let i = headRow + 1; i < grid.length; i++){
      const row = grid[i];
      const get = key => cols[key] == null ? '' : String(row[cols[key]] || '').trim();
      const nameAr = get('nameAr'), nameEn = get('nameEn');
      if (!nameAr && !nameEn) continue;

      const rawBank = get('bank');
      const rawSwift = get('swift').replace(/^-+$/, '');
      const hit = LISTS.matchBank(rawBank, bankList) || LISTS.matchBankBySwift(rawSwift, bankList);
      if (hit) placed++; else if (rawBank) unplaced++;

      // what sits in the IBAN column is not always an IBAN
      const ibanCell = get('iban').replace(/\s+/g, '');
      const acctCell = get('account');
      const isIban = LISTS.looksLikeIban(ibanCell);

      out.push({
        order: out.length + 1,
        nameAr, nameEn,
        iban:    isIban ? ibanCell.toUpperCase() : '',
        account: acctCell || (isIban ? '' : ibanCell),
        bank:    hit ? (hit.en || hit.ar) : rawBank,
        swift:   rawSwift || (hit ? hit.swift : ''),
        reason:  get('reason'),
      });
    }

    if (!out.length) return flashMsg('No suppliers found in that file.');
    table.rows = out;
    save(out);
    flashMsg(`Imported ${out.length} suppliers. ${placed} banks matched the list` +
             (unplaced ? `, ${unplaced} could not be placed — they are marked below.` : '.'));
  };
  r.onerror = () => flashMsg('Could not read that file.');
  r.readAsArrayBuffer(file);
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
  table = ListTable({ mount: $('table'), columns: COLUMNS, rows: LISTS.suppliers(), onChange: save });
  table.render();
  refreshState();

  $('btnAdd').addEventListener('click', () =>
    table.add({ nameAr:'', nameEn:'', iban:'', account:'', bank:'', swift:'', reason:'' }));
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', e => {
    if (e.target.files[0]) importBook(e.target.files[0]);
    e.target.value = '';
  });
  $('btnExport').addEventListener('click', exportBook);
}

boot().catch(e => flashMsg('Could not start: ' + e.message));
