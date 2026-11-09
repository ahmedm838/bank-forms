window.LISTS = (function(){

const BANKS_KEY = 'abk-banks';
const SUPPLIERS_KEY = 'abk-suppliers';
const TX_KEY = 'abk-transactions';

const memory = window.BankFormsMemory;
const clone = value => JSON.parse(JSON.stringify(value));
const read = (key, fallback) => Array.isArray(memory[key]) ? clone(memory[key]) : fallback;
const write = (key, value) => { memory[key] = clone(value); return true; };
const byOrder = rows => rows.slice().sort((a, b) =>
  (Number(a.order) || 0) - (Number(b.order) || 0));

/* ---------- banks ---------- */
function banks(){
  const stored = read(BANKS_KEY, null);
  if (stored) return byOrder(stored);
  return byOrder((window.BANKS_SEED || []).map(b => Object.assign({}, b)));
}
function saveBanks(rows){ return write(BANKS_KEY, rows); }
function resetBanks(){ delete memory[BANKS_KEY]; }

/* ---------- suppliers ---------- */
function suppliers(){ return byOrder(read(SUPPLIERS_KEY, [])); }
async function saveSuppliers(rows){ rows=clone(rows); await RepoStore.save('suppliers', rows); return write(SUPPLIERS_KEY, rows); }

/* Defaults are kept separately from transaction history and reference lists. */
function allFormDefaults(){ return clone(memory['abk-form-defaults'] || {}); }
const canDefault = field => !field.thousands && !field.wordsOf && field.type !== 'select';
function formDefaults(id){
  const saved=allFormDefaults()[id] || {}, definition=window.FORM_DEFS && window.FORM_DEFS[id];
  if(!definition) return saved;
  const values={};
  (definition.fields || []).filter(canDefault).forEach(f=>{
    if(saved.values && Object.hasOwn(saved.values,f.id)) values[f.id]=saved.values[f.id];
  });
  return {values};
}
function saveFormDefaults(id, settings){
  const all = allFormDefaults(); all[id] = settings;
  return write('abk-form-defaults', all);
}

/* ---------- transfers made ----------
   Every transfer saved from the Bank Transfer form is written down here, so
   there is a record of what was sent and to whom. Records persist in GitHub Excel files. */
function transactions(){
  return read(TX_KEY, []).slice().sort((a, b) =>
    String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')));
}
async function saveTransactions(rows){ rows=clone(rows).filter((row,i,all)=>all.findIndex(other=>transactionKey(other)===transactionKey(row))===i); await RepoStore.save('transactions', rows); return write(TX_KEY, rows); }
// Compare the transaction columns, excluding save times and PDF filenames.
function transactionKey(row){
  return JSON.stringify(['date','benName','benAccount','benBank','currency','amount','purpose','issueType']
    .map(key => {
      const value = String(row[key] || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if(key === 'amount'){
        const number = Number(value.replace(/,/g, ''));
        if(value && Number.isFinite(number)) return String(number);
      }
      return value;
    }));
}
function alreadyRecorded(rows, entry){
  return rows.some(row => transactionKey(row) === transactionKey(entry));
}
async function addTransaction(entry){
  const rows=await RepoStore.load('transactions'); write(TX_KEY,rows);
  if(alreadyRecorded(rows, entry)) return 'duplicate';
  rows.push(Object.assign({
    id: 'tx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    recordedAt: new Date().toISOString(),
  }, entry));
  return saveTransactions(rows);
}

/* Saving a transfer opened for editing overwrites the record it came from
   rather than leaving two. When it was first written is kept; when it was last
   changed is noted beside it. */
async function updateTransaction(id, entry){
  const previous=getTransaction(id);
  const rows=await RepoStore.load('transactions');
  const current=rows.find(row=>row.id===id);
  if(JSON.stringify(previous)!==JSON.stringify(current)) throw new Error('This transaction changed in GitHub. Reload before editing it.');
  write(TX_KEY,rows);
  if(alreadyRecorded(rows.filter(row=>row.id!==id), entry)) return 'duplicate';
  const i = rows.findIndex(r => r.id === id);
  if (i === -1) throw new Error('This transaction was removed. Reload before saving.');
  rows[i] = Object.assign({}, rows[i], entry, {
    id: rows[i].id,
    recordedAt: rows[i].recordedAt,
    editedAt: new Date().toISOString(),
  });
  return saveTransactions(rows);
}

function getTransaction(id){
  return read(TX_KEY, []).find(r => r.id === id) || null;
}

/* ---------- matching a written bank name to the list ----------
   An imported sheet names banks however whoever typed it felt that day — "cib",
   "CIB", "National Bank Egypt", "بنك مصر". This tries to land each on a row of
   the banks list; what it cannot place is left as written for you to fix. */
const normalise = s => String(s || '')
  .toLowerCase()
  .replace(/[ً-ٰٟ]/g, '')          // Arabic diacritics
  .replace(/[أإآ]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

function matchBank(text, list){
  const q = normalise(text);
  if (!q) return null;
  const rows = list || banks();

  for (const b of rows){
    if (normalise(b.en) === q || normalise(b.ar) === q) return b;
  }
  // an abbreviation in brackets, like (CIB) or (NBE)
  for (const b of rows){
    const abbr = (String(b.en).match(/\(([^)]+)\)/) || [])[1];
    if (abbr && normalise(abbr) === q) return b;
  }
  // whichever name contains the other, longest match winning
  let best = null, bestLen = 0;
  for (const b of rows){
    for (const name of [b.en, b.ar]){
      const n = normalise(name);
      if (!n) continue;
      if ((n.includes(q) || q.includes(n)) && n.length > bestLen){ best = b; bestLen = n.length; }
    }
  }
  return best;
}

/* A SWIFT code may carry a branch suffix (CIBEEGCX002); the first eight
   characters are the bank itself. */
function matchBankBySwift(swift, list){
  const s = String(swift || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length < 8) return null;
  const head = s.slice(0, 8);
  return (list || banks()).find(b => String(b.swift).toUpperCase().startsWith(head)) || null;
}

const isBic = s => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
  String(s || '').toUpperCase().replace(/\s/g, ''));

/* An IBAN here is the Egyptian form; anything else in that column is really a
   plain account number, which is why a supplier keeps both. */
const looksLikeIban = s => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(
  String(s || '').toUpperCase().replace(/\s/g, ''));

/* what a supplier should be paid into: the IBAN when there is one */
function payTo(supplier){
  const iban = String(supplier.iban || '').trim();
  const acct = String(supplier.account || '').trim();
  return iban || acct;
}

async function loadRepository(){
  if(window.BANK_FORMS_STANDALONE) return;
  const suppliers=await RepoStore.load('suppliers');
  const transactions=await RepoStore.load('transactions');
  write(SUPPLIERS_KEY,suppliers);write(TX_KEY,transactions);
}
return {
  loadRepository, transactionKey, banks, saveBanks, resetBanks,
  suppliers, saveSuppliers, formDefaults, saveFormDefaults, canDefault,
  transactions, saveTransactions, addTransaction, updateTransaction, getTransaction,
  matchBank, matchBankBySwift, isBic, looksLikeIban, payTo, byOrder, normalise,
  BANKS_KEY, SUPPLIERS_KEY, TX_KEY,
};
})();
