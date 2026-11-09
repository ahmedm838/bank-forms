/* ABK — cheque in Egyptian pounds.

   This one prints onto a real cheque, so `overlayOnly` means the output is a
   blank cheque-sized page carrying the values and nothing else. Printing the picture of a
   cheque onto a cheque would be a mess; the scan is only ever shown on screen,
   and the copy that ships has the serial, the MICR line, the QR and the account
   number painted out, since none of those belong in a public repository.

   Positions were measured off the scan against a grid in PDF points, with the
   cheque lying along the top of an A4 sheet exactly as it was scanned. The print
   output keeps a 117 × 83 mm cheque layout on landscape A4. Run one on plain
   paper first and hold it against a real cheque before printing on stationery.

   The date is eight little boxes rather than a line, so it is laid out a
   character to a box with `cells`. */
window.FORM_DEFS = window.FORM_DEFS || {};

window.FORM_DEFS['cheque-egp'] = {
  title: 'Cheque — EGP',
  bank:  'Al Ahli Bank of Kuwait – Egypt',
  ready: true,
  records: true,
  overlayOnly: true,                       // print the values, never the cheque
  preview: 'assets/cheque-egp-preview.png',
  previewBand: [625, 841.68],              // the strip of the page the scan covers
  page: { w: 595.2, h: 841.68 },
  printPage: { w: 297 * 72 / 25.4, h: 210 * 72 / 25.4, contentWidth: 117 * 72 / 25.4, contentHeight: 83 * 72 / 25.4, sourceBox: [0, 625, 595.2, 841.68], contentMargins: { right: 25 * 72 / 25.4, vertical: 'center', offsetUp: 10 * 72 / 25.4 } }, // A4 landscape with cheque-sized content
  fontSize: 12,

  groups: [
    { id:'head', title:'التاريخ — Date' },
    { id:'body', title:'الشيك — Cheque' },
  ],

  fields: [
    /* DDMMYYYY, one digit to a box */
    { id:'date', label:'التاريخ — Date', box:[376,802,458,818], group:'head',
      cells: 8, cellSize: 11, baseline: 809, latin:true, required:true, today:true,
      hint:'dd/mm/yyyy — printed one digit per box' },

    { id:'payTo', label:'إدفعوا بموجب هذا الشيك إلى — Pay to', box:[62,764,366,780], group:'body',
      type:'select', supplierNames:true,
      maxLines:1, baseline:772, pad:2, arabic:true, required:true },

    /* the printed EGP box; #...# so the figure cannot be extended */
    { id:'amount', label:'المبلغ بالأرقام — EGP', box:[399,737,486,753], group:'body',
      maxLines:1, baseline:745, pad:1, latin:true, thousands:true, wrap:'#', required:true,
      hint:'e.g. 125400' },

    { id:'sumWords', label:'مبلغاً وقدره — The sum of', box:[78,745,320,761], group:'body',
      maxLines:1, baseline:753, pad:2, required:true,
      wordsOf:'amount', currencyFixed:'EGP' },

    { id:'purpose', label:'الغرض — Purpose (transaction only)', group:'body', multi:true, screenOnly:true },

    { id:'name', label:'الاسم — Name', box:[48,704,463,720], group:'body',
      maxLines:1, baseline:712, pad:2, arabic:true, required:true,
      noShrink:true, align:'right' },
  ],
};
