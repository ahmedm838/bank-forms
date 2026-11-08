/* ABK — tax payments.

   Placeholders, waiting on their blank PDFs from the bank. The hub greys them
   out and form.html refuses them by URL while `ready` is false.

   To finish one:
     1. put the blank PDF in assets/ and a page-1 render beside it
     2. set pdf, preview and page in the definition
     3. read the field boxes off the PDF and fill in groups/fields — see
        forms/abk-transfer.js for a ruled form and forms/abk-payroll-transfer.js
        for blanks inside running text
     4. set ready: true */
window.FORM_DEFS = window.FORM_DEFS || {};

(function(){
const pending = (title, note) => ({
  title,
  bank: 'Al Ahli Bank of Kuwait – Egypt',
  ready: false,
  note,
});

window.FORM_DEFS['vat-payment'] = pending('VAT Payment',
  'Payment of value added tax. Waiting on the blank PDF from the bank.');

window.FORM_DEFS['withholding-payment'] = pending('Withholding Payment',
  'Payment of tax withheld at source. Waiting on the blank PDF from the bank.');
})();
