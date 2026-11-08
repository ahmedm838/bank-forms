/* ABK — cheque requests, one form per currency.

   Placeholders. Each is its own blank PDF from the bank, not the transfer form,
   so none can be filled in until its PDF is added. The hub greys these out and
   form.html refuses to open them while `ready` is false — that is deliberate, so
   nobody prints something that is not the form they asked for.

   To finish one:
     1. put the blank PDF in assets/ and a page-1 render beside it
     2. set pdf, preview and page here
     3. read the field boxes off the PDF's own grid and fill in groups/fields
        (see forms/abk-transfer.js for the shape, and the README for how the
        boxes were derived)
     4. set ready: true */
window.FORM_DEFS = window.FORM_DEFS || {};

(function(){
const cheque = (currency, words) => ({
  title: 'Cheque — ' + currency,
  bank:  'Al Ahli Bank of Kuwait – Egypt',
  ready: false,
  currency,
  note:  'Cheque request in ' + words + '. Waiting on the blank PDF from the bank.',
});

/* EGP is done — see forms/abk-cheque-egp.js */
window.FORM_DEFS['cheque-usd'] = cheque('USD', 'US dollars');
window.FORM_DEFS['cheque-eur'] = cheque('EUR', 'euro');
})();
