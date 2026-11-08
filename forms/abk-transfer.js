/* ABK — Transfer / Bank Draft Application.

   Boxes are [x0, y0, x1, y1] in PDF points, origin bottom-left, taken from the
   PDF's own table grid so they line up with the printed rules.

   Field options:
     type:'select' + options   a dropdown instead of a text box
     multi                     a textarea; the value wraps over the cell
     required                  print and save are blocked until it is filled
     latin                     English only; Arabic-Indic digits are converted
     thousands                 groups the number as it is typed
     upper                     forced to upper case
     arabic                    Arabic only; Latin letters are refused
     hint                      placeholder text
     def                       value a blank form opens with, yours to change */
window.FORM_DEFS = window.FORM_DEFS || {};

(function(){
const CURRENCIES = ['EGP', 'USD', 'EUR'];

window.FORM_DEFS['transfer'] = {
  title: 'Bank Transfer',
  bank:  'Al Ahli Bank of Kuwait – Egypt',
  ready: true,
  suppliersInto: 'ben',      // show the supplier picker above the beneficiary fields
  pdf:     'assets/transfer-request.pdf',
  preview: 'assets/preview.png',
  page: { w: 595.276, h: 842 },

  groups: [
    { id:'head',   title:'Application' },
    { id:'amount', title:'Amount (32A)' },
    { id:'ben',    title:'Beneficiary' },
    { id:'debit',  title:'Charges & debit instructions' },
    { id:'ord',    title:'Ordering customer (50)' },
  ],

  fields: [
    { id:'date',            label:'Date',                                box:[303,698.5,522,716.5], group:'head', hint:'dd/mm/yyyy', required:true, latin:true, today:true },

    { id:'currency',        label:'Currency (32A)',                      box:[61.3,618.4,114.2,635.8], group:'amount', type:'select', options:CURRENCIES, required:true, latin:true },
    // printed as #125,400.50# so the figure cannot be extended afterwards
    { id:'amountFigures',   label:'Amount in figures',                   box:[114.2,618.4,234.9,635.8], group:'amount', hint:'e.g. 125,400.50', required:true, latin:true, thousands:true, wrap:'#' },
    { id:'amountWords',     label:'Amount in words',                     box:[234.9,618.4,553.6,635.8], group:'amount', multi:true, wordsOf:'amountFigures', currencyField:'currency' },

    { id:'benName',         label:"Beneficiary's name (59)",             box:[176.4,604.6,459.4,618.4], group:'ben', required:true, fileLabel:true },
    { id:'benAddress',      label:"Beneficiary's address (or ID no. if paid in cash)", box:[176.4,586.6,459.4,604.6], group:'ben', multi:true },
    { id:'benAccount',      label:"Beneficiary's account no. / IBAN",    box:[176.4,569.5,459.4,586.6], group:'ben', multi:true, required:true },
    { id:'intermediaryBank',label:'Intermediary bank name & SWIFT code (56)', box:[176.4,552.2,459.4,569.5], group:'ben', multi:true },
    { id:'benBank',         label:"Beneficiary's bank (57)",             box:[176.4,539.4,459.4,552.2], group:'ben', required:true },
    { id:'benBankAddress',  label:"Beneficiary's bank address",          box:[176.4,521,459.4,539.4], group:'ben', multi:true },
    { id:'benBankSwift',    label:"Beneficiary's bank SWIFT code",       box:[176.4,504.4,459.4,521], group:'ben', upper:true, hint:'8 or 11 characters', swift:true },
    { id:'info70',          label:'Information for beneficiary (70)',    box:[176.4,491.1,459.4,504.4], group:'ben' },

    { id:'debitAccount',    label:'Payment value debited to account no.', box:[176.4,413.6,459.4,431.1], group:'debit', required:true },
    { id:'debitCurrency',   label:'Currency',                            box:[176.4,395.1,459.4,413.6], group:'debit', type:'select', options:CURRENCIES, required:true, latin:true },
    { id:'commAccount',     label:'Commission & charges debited to account no.', box:[176.4,369.4,459.4,395.1], group:'debit', required:true },
    { id:'commCurrency',    label:'Currency',                            box:[176.4,351.9,459.4,369.4], group:'debit', type:'select', options:CURRENCIES, required:true, latin:true },

    { id:'ordName',         label:"Ordering customer's name (50)",       box:[176.4,316.9,459.4,334.4], group:'ord', required:true, def:'IEnergy Meters Manufacturing' },
    { id:'ordID',           label:"Ordering customer's ID (if paid in cash)", box:[176.4,299.4,459.4,316.9], group:'ord' },
    { id:'ordAddress',      label:"Ordering customer's address",         box:[176.4,282.5,459.4,299.4], group:'ord', multi:true },
    { id:'ordPhone',        label:'Telephone no.',                       box:[176.4,265.2,459.4,282.5], group:'ord', required:true, def:'01206037776' },
    { id:'purpose',         label:'Purpose of transfer (goods type & delivery terms)', box:[176.4,237.3,459.4,265.2], group:'ord', multi:true, required:true },
  ],

  checks: [
    { id:'issueType', label:'Please issue', group:'head', required:true, options:[
        { v:'draft',    t:'Bank Draft',        box:[156,672.3,166.7,683.3] },
        { v:'internal', t:'Internal Transfer', box:[292.9,672.3,303.5,683.3] },
        { v:'swift',    t:'Swift Transfer',    box:[436.5,672.3,447.3,683.3] } ] },
    { id:'charges', label:'Charges (71A)', group:'debit', required:true, options:[
        { v:'OUR', t:'OUR — all charges on my/our account',  box:[312.9,468.5,323.5,479.4] },
        { v:'SHA', t:"SHA — sender's bank charges on us, others on beneficiary", box:[312.9,451.4,323.5,462.3] },
        { v:'BEN', t:"BEN — all charges on beneficiary's account", box:[312.9,434.4,323.5,445.3] } ] },
  ],

  flags: [
    { id:'paidInCash', label:'Paid in cash', group:'debit', box:[312.9,337.5,323.5,348.4] },
  ],
};
})();
