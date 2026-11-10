/* ABK — Bank Deposit (طلب إيداع بنكي), from Deposit Form.docx.

   A letter, not a ruled form, so it is built the way the Payroll Debit Order is:
   the wording and the layout live in the HTML below, the values flow inline, and
   printing prints that page rather than stamping a template. Nothing is measured
   in points here — a longer account name simply pushes the line along.

   Word renders this letter with Arabic-Indic digits, so every number does the
   same here. The amount in words is written for you from the figures, in Arabic,
   and cannot be typed over.

   The company's tax registration number and bank account number are fields
   rather than printed text: this repository is public, and the same choice was
   made for the Payroll Debit Order. */
window.FORM_DEFS = window.FORM_DEFS || {};

/* The accounts this letter can be addressed to. */
const DEPOSIT_ACCOUNTS = [
  'مصلحة الضرائب المصرية (ضريبة كسب عمل)',
  'مصلحة الضرائب المصرية (مساهمه تكافليه)',
  'مصلحة الضرائب المصرية (ضريبة خصم وتحصيل-خصم من المنبع-موردين)',
  'الهيئة العامة للتأمينات الاجتماعية',
  'نافذة',
];

window.FORM_DEFS['bank-deposit'] = {
  title: 'Bank Deposit', bank: 'Al Ahli Bank of Kuwait – Egypt', ready: true,
  flowingLetter: true, letterHtml: 'depositLetterHtml', overlayOnly: true,
  page: { w: 595.3, h: 841.9 }, fontSize: 14,
  groups: [{ id:'letter', title:'طلب إيداع بنكي — Deposit request' }],
  fields: [
    { id:'account', label:'في حساب — Deposit into', group:'letter',
      type:'select', options:DEPOSIT_ACCOUNTS, required:true },
    { id:'amount', label:'المبلغ بالأرقام — Amount in figures', group:'letter',
      latin:true, thousands:true, arabicDigits:true, required:true, hint:'e.g. 125400' },
    /* written from the figures; the letter prints فقط itself, so the wording
       must not repeat it */
    { id:'amountWords', label:'المبلغ بالحروف — Amount in words', group:'letter',
      multi:true, wordsOf:'amount', currencyFixed:'EGP', wordsStyle:'amountOnly',
      arabicOnly:true, required:true },
    { id:'claimNo', label:'رقم المطالبة — Claim no.', group:'letter',
      arabicDigits:true, required:true, unless:'noClaim' },
    { id:'taxNo', label:'الرقم الضريبي — Tax registration no.', group:'letter',
      latin:true, arabicDigits:true, required:true },
    { id:'accountNo', label:'رقم الحساب البنكي — Bank account no.', group:'letter',
      latin:true, arabicDigits:true, required:true },
    { id:'date', label:'التاريخ — Date', group:'letter',
      latin:true, arabicDigits:true, today:true, required:true, hint:'dd/mm/yyyy' },
  ],
  flags: [
    /* ticked, the claim-number line comes off the letter altogether */
    { id:'noClaim', label:'No claim number — leave the line off', group:'letter' },
  ],
};

window.depositLetterHtml = function(values, size = 14, flags = {}){
  const escape = text => String(text || '').replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const field = id => {
    const f = window.FORM_DEFS['bank-deposit'].fields.find(f => f.id === id);
    let value = String(values[id] || '');
    if(f.arabicDigits) value = value.replace(/[0-9]/g, n => '٠١٢٣٤٥٦٧٨٩'[Number(n)]);
    if(id === 'date' && /^[٠-٩0-9]{1,2}\/[٠-٩0-9]{1,2}\/[٠-٩0-9]{4}$/.test(value)){
      return '<span class="date-value" dir="rtl">'
        + value.split('/').map(part => '<bdi dir="ltr">'+escape(part)+'</bdi>').join('<span>/</span>')
        + '</span>';
    }
    return '<bdi>' + escape(value || '…………') + '</bdi>';
  };
  const pt = Math.max(7, Math.min(30, Number(size) || 14));
  const claimLine = flags.noClaim ? ''
    : `<p>رقم المطالبة: (${field('claimNo')})</p>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Bank Deposit</title>
  <style>@page{size:A4 portrait;margin:72pt 54pt}*{box-sizing:border-box}html{background:#fff;color:#000}
  body{font-family:Arial,sans-serif;font-size:${pt}pt;line-height:1.08;margin:72pt 54pt;width:487.3pt;text-align:right}
  p{margin:0 0 8pt}
  h1{font-size:${pt * 18 / 14}pt;text-align:center;text-decoration:underline;margin:0 0 ${pt}pt}
  .blank{height:${pt * 1.08}pt;margin:0}
  .center{text-align:center}
  .dateline{text-decoration:underline}
  .sign{display:flex;justify-content:space-around;text-align:center;margin-top:${pt}pt}
  .sign div{line-height:1.6;font-weight:bold}
  .date-value{display:inline-flex;direction:rtl;unicode-bidi:isolate;white-space:nowrap}
  @media print{body{margin:0;width:auto}}</style></head><body>
  <p class="blank"></p><p class="blank"></p><p class="blank"></p>
  <h1>طلب إيداع بنكي</h1>
  <p><span class="dateline">التاريخ: ${field('date')}</span></p>
  <p class="blank"></p>
  <p>السادة/&nbsp;&nbsp; البنك الأهلي الكويتي – مصر</p>
  <p class="center">تحية طيبة وبعد،،،</p>
  <p>برجاء التكرم بعمل ايداع بنكي في حساب ${field('account')}</p>
  <p>بمبلغ قدره (${field('amount')}) فقط (${field('amountWords')})</p>
  ${claimLine}
  <p>اسم المنشأة : أي انيرجي لصناعة العدادات</p>
  <p>الرقم الضريبي: (${field('taxNo')})</p>
  <p>رقم الحساب البنكي : (${field('accountNo')})</p>
  <p class="blank"></p>
  <p class="center">برجاء التكرم بتحويل المبلغ وإخطارنا بالإشعارات الدالة على ذلك.</p>
  <p class="center">وتفضلوا بقبول فائق الاحترام ،،،</p>
  <p class="blank"></p>
  <div class="sign">
    <div>عضو مجلس الإدارة المنتدب<br>م/ أحمد مصطفى محمد</div>
    <div>مدير قطاع المشتريات<br>أ/ دعاء رمضان محمد</div>
  </div>
  </body></html>`;
};
