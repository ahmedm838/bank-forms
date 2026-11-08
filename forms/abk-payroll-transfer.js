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
  fontSize: 13,            // the letter is set in 16pt; 13 sits inside the gaps

  groups: [
    { id:'amount',  title:'المبلغ — Amount' },
    { id:'detail',  title:'التفاصيل — Month and date' },
    { id:'company', title:'بيانات الشركة — Your account (remembered)' },
  ],

  fields: [
    { id:'amount', label:'المبلغ بالأرقام — Amount in figures',
      box:[377,523.8,439,543.8], group:'amount',
      hint:'e.g. 125400', required:true, latin:true, thousands:true, arabicDigits:true },

    { id:'amountWords', label:'المبلغ بالحروف — Amount in words',
      box:[78,523.8,313,543.8], group:'amount',
      multi:true, required:true, wordsOf:'amount', wordsStyle:'bare' },

    { id:'month', label:'مرتبات شهر — Month, as it goes in the brackets',
      box:[103,434.3,222,454.3], group:'detail',
      hint:'مثال: أكتوبر ٢٠٢٦', required:true, arabicDigits:true },

    { id:'date', label:'التاريخ — Date',
      box:[105,224.2,211,244.2], group:'detail',
      hint:'dd/mm/yyyy', required:true, latin:true, arabicDigits:true, today:true },

    /* The template used to carry these three pre-printed. They were blanked so
       nothing private sits in a public repository; each browser remembers its
       own, and the printed letter comes out exactly as before. */
    { id:'accountNo', label:'رقم الحساب — Account no.',
      box:[198,479.1,258,499.1], group:'company',
      hint:'9229017', required:true, latin:true, arabicDigits:true, remember:true },

    { id:'branch', label:'الفرع — Branch',
      box:[64,479.1,156,499.1], group:'company',
      hint:'القرية الذكية', required:true, remember:true },

    { id:'signatory', label:'الاسم — Name of signatory',
      box:[85,299.9,218,319.9], group:'company',
      required:true, remember:true, fileLabel:true },
  ],
};

/* It was called Payroll Transfer at first; links handed out under that name
   still work. `alias` keeps it out of the form switcher so it is not listed
   twice. */
window.FORM_DEFS['payroll-transfer'] =
  Object.assign(Object.create(window.FORM_DEFS['payroll-debit-order']),
    { alias: true, canonicalId: 'payroll-debit-order' });
