/* ABK — Salary Taxes Payment (طلب إيداع بنكي).

   Two deposit letters on one template, from كسب العمل و صندوق الشهداء.docx:
   sheet 1 is the payroll tax (ضريبة كسب عمل), sheet 2 the solidarity
   contribution (مساهمه تكافليه). Each carries its own amount and claim number;
   the date, the tax number and the bank account are the company's own and are
   the same on both, so they are typed once and mirrored with `sameAs`.

   The shipped template is the Word letter with the date, the tax registration
   number and the bank account number taken out of the document — not painted
   over, removed — because the repository is public. They are fields now, filled
   in by whoever prints the letter. The dotted leaders came out with them: the
   app prints each value on its line, and dots under printed text only make it
   harder to read.

   Boxes were read off the blanked PDF's own text positions. Every value sits
   between the brackets already printed on its line, on that line's baseline. */
window.FORM_DEFS = window.FORM_DEFS || {};

window.FORM_DEFS['salary-taxes'] = {
  title: 'Salary Taxes Payment',
  bank:  'Al Ahli Bank of Kuwait – Egypt',
  ready: true,
  pdf:      'assets/salary-taxes.pdf',
  previews: ['assets/salary-taxes-preview-1.png', 'assets/salary-taxes-preview-2.png'],
  page: { w: 595.32, h: 841.92 },
  fontSize: 12,

  groups: [
    { id:'head',  title:'بيانات المنشأة — The company' },
    { id:'tax',   title:'ضريبة كسب عمل — Payroll tax (sheet 1)' },
    { id:'fund',  title:'مساهمه تكافليه — Solidarity contribution (sheet 2)' },
  ],

  fields: [
    /* the head of both sheets: one input each, printed twice */
    { id:'date', label:'التاريخ — Date', group:'head', box:[437,641.6,509,657.6], baseline:648.6,
      maxLines:1, pad:2, latin:true, today:true, required:true, hint:'dd/mm/yyyy' },
    { id:'dateB', sameAs:'date', group:'head', pdfPage:1, box:[437,639.1,509,655.1], baseline:646.1,
      maxLines:1, pad:2, latin:true },

    { id:'taxNo', label:'الرقم الضريبي — Tax registration no.', group:'head',
      box:[403,430.6,467,446.6], baseline:437.6, maxLines:1, pad:2, latin:true, required:true },
    { id:'taxNoB', sameAs:'taxNo', group:'head', pdfPage:1,
      box:[403,436.1,467,452.1], baseline:443.1, maxLines:1, pad:2, latin:true },

    { id:'accountNo', label:'رقم الحساب البنكي — Bank account no.', group:'head',
      box:[396,405.1,444,421.1], baseline:412.1, maxLines:1, pad:2, latin:true, required:true },
    { id:'accountNoB', sameAs:'accountNo', group:'head', pdfPage:1,
      box:[396,410.7,444,426.7], baseline:417.7, maxLines:1, pad:2, latin:true },

    /* sheet 1 — ضريبة كسب عمل */
    { id:'taxAmount', label:'المبلغ بالأرقام — Amount in figures', group:'tax',
      box:[487,506.5,539,522.5], baseline:513.5, maxLines:1, pad:1,
      latin:true, thousands:true, required:true, hint:'e.g. 125400' },
    /* the letter prints فقط itself, between the figures and the words */
    { id:'taxWords', label:'المبلغ بالحروف — Amount in words', group:'tax',
      box:[291,506.5,452,522.5], baseline:513.5, maxLines:1, pad:2,
      wordsOf:'taxAmount', currencyFixed:'EGP', wordsStyle:'amountOnly', required:true },
    { id:'taxClaim', label:'رقم المطالبة — Claim no.', group:'tax',
      box:[422,481.4,478,497.4], baseline:488.4, maxLines:1, pad:2, latin:true, required:true },

    /* sheet 2 — مساهمه تكافليه */
    { id:'fundAmount', label:'المبلغ بالأرقام — Amount in figures', group:'fund', pdfPage:1,
      box:[491,512.2,539,528.2], baseline:519.2, maxLines:1, pad:1,
      latin:true, thousands:true, required:true, hint:'e.g. 4300' },
    { id:'fundWords', label:'المبلغ بالحروف — Amount in words', group:'fund', pdfPage:1,
      box:[303,512.2,455,528.2], baseline:519.2, maxLines:1, pad:2,
      wordsOf:'fundAmount', currencyFixed:'EGP', wordsStyle:'amountOnly', required:true },
    { id:'fundClaim', label:'رقم المطالبة — Claim no.', group:'fund', pdfPage:1,
      box:[422,486.9,478,502.9], baseline:493.9, maxLines:1, pad:2, latin:true, required:true },
  ],
};
