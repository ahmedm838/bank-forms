/* What each form id on the hub means.

   `ready: false` means the bank's blank PDF is not in assets/ yet. The hub shows
   those as unavailable and form.html refuses to open them, so nobody can print a
   document that is not the form they asked for.

   For a form that is ready:
     set   — field values applied on open
     check — radio groups applied on open
     lock  — field or group ids the user cannot change for this form */
const FORM_PRESETS = {
  'transfer': {
    title: 'Bank Transfer',
    bank:  'Al Ahli Bank of Kuwait – Egypt',
    ready: true,
  },

  /* A cheque is its own ABK form, not this one. Waiting on the blank PDF for each
     currency (or one form with a currency field — whichever ABK issues). */
  'cheque-egp': { title: 'Cheque — EGP', bank: 'Al Ahli Bank of Kuwait – Egypt', ready: false },
  'cheque-usd': { title: 'Cheque — USD', bank: 'Al Ahli Bank of Kuwait – Egypt', ready: false },
  'cheque-eur': { title: 'Cheque — EUR', bank: 'Al Ahli Bank of Kuwait – Egypt', ready: false },
};

function currentPreset(){
  const id = new URLSearchParams(location.search).get('f') || 'transfer';
  return FORM_PRESETS[id] || FORM_PRESETS['transfer'];
}
