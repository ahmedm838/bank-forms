/* The two reference lists — banks and suppliers — and the storage behind them.

   Both live in this browser's local storage and nowhere else. The banks ship
   with a seed, since bank names and SWIFT codes are public; suppliers start
   empty and are imported from your own spreadsheet, because their account
   numbers are not something to keep in a public repository.

   These are reference data, not form values: a form still opens blank. */
window.LISTS = (function(){

const BANKS_KEY = 'abk-banks';
const SUPPLIERS_KEY = 'abk-suppliers';

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch(e){ return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e){ return false; }
};

const byOrder = rows => rows.slice().sort((a, b) =>
  (Number(a.order) || 0) - (Number(b.order) || 0));

/* ---------- banks ---------- */
function banks(){
  const stored = read(BANKS_KEY, null);
  if (stored) return byOrder(stored);
  return byOrder((window.BANKS_SEED || []).map(b => Object.assign({}, b)));
}
function saveBanks(rows){ return write(BANKS_KEY, rows); }
function resetBanks(){ try{ localStorage.removeItem(BANKS_KEY); }catch(e){} }

/* ---------- suppliers ---------- */
function suppliers(){ return byOrder(read(SUPPLIERS_KEY, [])); }
function saveSuppliers(rows){ return write(SUPPLIERS_KEY, rows); }

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

return {
  banks, saveBanks, resetBanks,
  suppliers, saveSuppliers,
  matchBank, matchBankBySwift, isBic, looksLikeIban, payTo, byOrder, normalise,
  BANKS_KEY, SUPPLIERS_KEY,
};
})();
