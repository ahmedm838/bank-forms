/* ABK — staff payment forms.

   Placeholders. Each is waiting on its blank PDF from the bank, so none can be
   opened yet; the hub greys them out and form.html refuses them by URL.

   To finish one:
     1. put the blank PDF in assets/ and a page-1 render beside it
     2. set pdf, preview and page here
     3. read the field boxes off the PDF's own grid and fill in groups/fields
        (forms/abk-transfer.js shows the shape, and the README explains how the
        boxes were derived)
     4. set ready: true

*/
window.FORM_DEFS = window.FORM_DEFS || {};

(function(){
const pending = (title, note) => ({
  title,
  bank: 'Al Ahli Bank of Kuwait – Egypt',
  ready: false,
  note,
});

window.FORM_DEFS['social-insurance'] = pending('Social Insurance Payment',
  'Payment of social insurance contributions. Waiting on the blank PDF from the bank.');

window.FORM_DEFS['salary-taxes'] = pending('Salary Taxes Payment',
  'Payment of payroll tax. Waiting on the blank PDF from the bank.');

/* Payroll Transfer is done — see forms/abk-payroll-transfer.js */
})();
