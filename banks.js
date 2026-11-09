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
  { key:'acronym', label:'Acronym', width:'140px', dir:'ltr' },
  { key:'ar',    label:'اسم البنك (عربي)',    width:'32%',  dir:'rtl' },
  { key:'swift', label:'SWIFT code',          width:'150px', dir:'ltr', upper:true, live:true },
];

function exportBook(){
  XLSX.writeFile(RepoWorkbooks.banks(table.rows), 'Banks.xlsx');
  flashMsg('Saved Banks.xlsx');
}

async function boot(){
  await setupGate();
  if(!window.BANK_FORMS_STANDALONE) window.BankFormsMemory['abk-banks']=await RepoStore.load('banks');
  table = ListTable({ mount: $('table'), columns: COLUMNS, rows: LISTS.banks(), onChange: touched });
  unsaved = Unsaved({
    badge: $('dirty'), saveBtn: $('btnSave'),
    commit: async () => {
      try { return await LISTS.saveBanks(table.rows); }
      catch(e){ flashMsg(e.message); return false; }
    },
    onSaved: () => flashMsg(table.rows.length + ' banks saved.'),
  });
  table.render();
  refreshState();

  $('btnAdd').addEventListener('click', () => table.add({ en:'', acronym:'', ar:'', swift:'' }));
  $('btnSave').addEventListener('click', () => unsaved.save());
  $('btnExport').addEventListener('click', exportBook);

}

boot().catch(e => flashMsg('Could not start: ' + e.message));
