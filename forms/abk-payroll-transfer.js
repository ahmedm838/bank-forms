/* ABK — Payroll Debit Order (خصم مرتبات).

   A letter, not a ruled form: four blanks in running Arabic text. The template
   is the company's own Word document converted to PDF once; the sentence around
   each blank is already printed, so only the missing words go in.

   The letter reads:
     برجاء التكرم بخصم مبلغ ( <amount> ) فقط وقدره <amountWords>
     جنيها مصريا فقط لا غير وذلك خصماً من حسابنا طرفكم رقم ( ... ) فرع ( ... )
     وذلك لتحويله للعاملين بالشركة ( كما بالكشف المرفق ) مرتبات شهر ( <month> ).
     ...
     التاريخ: <date>

   So `amountWords` holds the number alone — فقط, جنيها مصريا and لا غير are
   already on the page, which is why it uses wordsStyle 'bare'.

   Boxes are the gaps between the printed runs, measured off the PDF. The page is
   US Letter (612 x 792), not A4. Values are typed in Western digits and printed
   in Arabic-Indic ones to match the rest of the letter (`arabicDigits`). */
window.FORM_DEFS = window.FORM_DEFS || {};

window.FORM_DEFS['payroll-debit-order'] = {
  title: 'Payroll Debit Order',
  bank:  'Al Ahli Bank of Kuwait – Egypt',
  ready: true,
  pdf:     'assets/payroll-debit-order.pdf',
  preview: 'assets/payroll-debit-order-preview.png',
  page: { w: 612, h: 792 },
  fontSize: 20,            // the letter is set in 16pt; filled values sit larger

  groups: [
    { id:'amount',  title:'المبلغ — Amount' },
    { id:'detail',  title:'التفاصيل — Month and date' },
    { id:'company', title:'بيانات الشركة — Your account' },
  ],

  fields: [
    /* The printed ( ) sit at 375.6 and 440.6, so the figure has that gap and no
       more; pad:1 lets it use nearly all of it before it has to shrink. */
    { id:'amount', label:'المبلغ بالأرقام — Amount in figures',
      box:[376,514.8,440.5,552.8], group:'amount', maxLines:1, baseline:531.3, pad:2.5,
      hint:'e.g. 125400', required:true, latin:true, thousands:true, arabicDigits:true },

    { id:'amountWords', label:'المبلغ بالحروف — Amount in words',
      box:[58,514.8,313,552.8], group:'amount', maxLines:1, baseline:531.3,
      multi:true, required:true, wordsOf:'amount', wordsStyle:'bare' },

    { id:'month', label:'مرتبات شهر — Month, as it goes in the brackets',
      box:[103,425.3,222,463.3], group:'detail', maxLines:1, baseline:441.8,
      hint:'مثال: أكتوبر ٢٠٢٦', required:true, arabicDigits:true },

    { id:'date', label:'التاريخ — Date',
      box:[105,215.2,211,253.2], group:'detail', maxLines:1, baseline:231.7,
      hint:'dd/mm/yyyy', required:true, latin:true, arabicDigits:true, today:true },

    /* The template used to carry these three pre-printed. They were blanked so
       nothing private sits in a public repository; they are typed in like any
       other field, and the printed letter comes out exactly as before. */
    { id:'accountNo', label:'رقم الحساب — Account no.',
      box:[198,470.1,258,508.1], group:'company', maxLines:1, baseline:486.6,
      hint:'9229017', required:true, latin:true, arabicDigits:true },

    { id:'branch', label:'الفرع — Branch',
      box:[64,470.1,156,508.1], group:'company', maxLines:1, baseline:486.6,
      hint:'القرية الذكية', required:true },

    /* Nothing is printed to the left of الاسم:, so the name may run out to the
       page margin. A long one still cannot reach 20pt across that width and
       shrinks to fit rather than colliding with the label. */
    { id:'signatory', label:'الاسم — Name of signatory',
      box:[50,290.9,219,328.9], group:'company', maxLines:1, baseline:307.4, pad:1,
      required:true, fileLabel:true },
  ],
};

/* It was called Payroll Transfer at first; links handed out under that name
   still work. `alias` keeps it out of the form switcher so it is not listed
   twice. */
window.FORM_DEFS['payroll-transfer'] =
  Object.assign(Object.create(window.FORM_DEFS['payroll-debit-order']),
    { alias: true, canonicalId: 'payroll-debit-order' });
