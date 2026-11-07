/* What each form id on the hub means.

   Every ABK entry is the one "Transfer / Bank Draft Application" PDF. A cheque
   (شيك مصرفي) is that form with "Bank Draft" ticked and the currency fixed, so the
   cheque presets just set and lock those two.

   `set`   — field values applied on open
   `check` — radio groups applied on open
   `lock`  — field or group ids the user cannot change for this form */
const FORM_PRESETS = {
  'transfer': {
    title: 'Bank Transfer',
    bank: 'Al Ahli Bank of Kuwait – Egypt',
  },
  'cheque-egp': {
    title: 'Cheque — EGP',
    bank: 'Al Ahli Bank of Kuwait – Egypt',
    check: { issueType: 'draft' },
    set:   { currency: 'EGP' },
    lock:  ['issueType', 'currency'],
  },
  'cheque-usd': {
    title: 'Cheque — USD',
    bank: 'Al Ahli Bank of Kuwait – Egypt',
    check: { issueType: 'draft' },
    set:   { currency: 'USD' },
    lock:  ['issueType', 'currency'],
  },
  'cheque-eur': {
    title: 'Cheque — EUR',
    bank: 'Al Ahli Bank of Kuwait – Egypt',
    check: { issueType: 'draft' },
    set:   { currency: 'EUR' },
    lock:  ['issueType', 'currency'],
  },
};

function currentPreset(){
  const id = new URLSearchParams(location.search).get('f') || 'transfer';
  return FORM_PRESETS[id] || FORM_PRESETS['transfer'];
}
