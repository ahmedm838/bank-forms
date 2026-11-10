/* ABK — the Payroll Transfer Sheet.

   The sheet of employees the Payroll Debit Order letter refers to as
   "كما بالكشف المرفق". Not a bank form to stamp but two spreadsheets to build
   from the month's attendance export, so it has a page of its own.

   The letter itself is in forms/abk-payroll-transfer.js. */
window.FORM_DEFS = window.FORM_DEFS || {};

window.FORM_DEFS['payroll-sheet'] = {
  title: 'Payroll Transfer Sheet',
  bank:  'Al Ahli Bank of Kuwait – Egypt',
  ready: true,
  pageUrl: 'payroll-sheet.html',   // its own page, not a stamped PDF
};
