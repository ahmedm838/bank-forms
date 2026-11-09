/* Payroll Debit Order: wording and paragraph layout from Payroll Debit Order.docx.
   Values flow inline, using the same Arial font as the supplied Word letter. */
window.FORM_DEFS = window.FORM_DEFS || {};
window.FORM_DEFS['payroll-debit-order'] = {
  title:'Payroll Debit Order', bank:'Al Ahli Bank of Kuwait – Egypt', ready:true,
  flowingLetter:true, overlayOnly:true,
  preview:'assets/payroll-debit-order-preview.png', page:{w:595.3,h:841.9}, fontSize:16,
  groups:[{id:'letter',title:'خصم مرتبات — Debit order'}],
  fields:[
    {id:'amount',label:'المبلغ بالأرقام — Amount in figures',group:'letter',latin:true,thousands:true,arabicDigits:true,required:true},
    {id:'amountWords',label:'المبلغ بالحروف — Amount in words',group:'letter',multi:true,wordsOf:'amount',wordsStyle:'bare',required:true},
    {id:'accountNo',label:'رقم الحساب — Account no.',group:'letter',latin:true,arabicDigits:true,required:true},
    {id:'branch',label:'الفرع — Branch',group:'letter',required:true},
    {id:'month',label:'مرتبات شهر — Month',group:'letter',arabicDigits:true,required:true},
    {id:'signatory',label:'الاسم — Name of signatory',group:'letter',required:true,fileLabel:true},
    {id:'date',label:'التاريخ — Date',group:'letter',latin:true,arabicDigits:true,today:true,required:true,hint:'dd/mm/yyyy'},
  ],
};
window.FORM_DEFS['payroll-transfer'] = Object.assign(
  Object.create(window.FORM_DEFS['payroll-debit-order']),
  {alias:true,canonicalId:'payroll-debit-order'});

window.payrollLetterHtml = function(values, size = 16){
  const escape = text => String(text || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const field = id => {
    const f = window.FORM_DEFS['payroll-debit-order'].fields.find(f => f.id === id);
    let value = String(values[id] || '');
    if(f.arabicDigits) value = value.replace(/[0-9]/g, n => '٠١٢٣٤٥٦٧٨٩'[Number(n)]);
    if(id === 'date' && /^[٠-٩0-9]{1,2}\/[٠-٩0-9]{1,2}\/[٠-٩0-9]{4}$/.test(value)){
      return '<span class="date-value" dir="rtl">' + value.split('/').map(part => '<bdi dir="ltr">'+escape(part)+'</bdi>').join('<span>/</span>') + '</span>';
    }
    return '<bdi>' + escape(value || '…………') + '</bdi>';
  };
  const pt = Math.max(7, Math.min(30, Number(size) || 16));
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Payroll Debit Order</title>
  <style>@page{size:A4 portrait;margin:36pt}*{box-sizing:border-box}html{background:#fff;color:#000}
  body{font-family:Arial,sans-serif;font-size:${pt}pt;line-height:1.15;margin:36pt;width:523.3pt}
  p{margin:0 0 8pt;white-space:normal;overflow-wrap:anywhere;break-inside:avoid}
  .blank{height:26.4pt}.center{text-align:center}.double{line-height:2}
  .body{text-align:justify}.sign{width:calc(100% - 324pt);margin-right:324pt;margin-bottom:18pt}
  .signature{line-height:2;margin-bottom:24pt}
  .date-value{display:inline-flex;direction:rtl;unicode-bidi:isolate;white-space:nowrap}
  @media print{body{margin:0;width:auto}html{width:auto}}</style></head><body>
  <p class="blank"></p><p class="blank"></p>
  <p><strong>الســادة / البنك الأهلي الكويتي – مصر</strong></p><p class="blank"></p>
  <p class="center">تحية طيبة وبعد،،</p>
  <p class="center double">الحاقاً بعقد المرتبات المبرم بيننا وبين بنككم الموقر ..</p>
  <p style="height:16pt;margin-bottom:6pt"></p>
  <p class="body double">برجاء التكرم بخصم مبلغ اجمالي قدره (${field('amount')}) فقط (${field('amountWords')}) جنيهاً مصرياً فقط لا غير من حسابنا طرفكم رقم (${field('accountNo')}) فرع (${field('branch')}) وذلك لتحويله لحسابات العاملين بالشركة (كما بالكشف المرفق) كمرتبات شهر (${field('month')}).</p>
  <p class="center double">برجاء التكرم بتحويل المبلغ وإخطارنا بالإشعارات الدالة على ذلك.</p>
  <p class="center double">وتفضلوا بقبول فائق الاحترام ،،،</p>
  <p class="sign">الاســم: ${field('signatory')}</p>
  <p class="sign">التاريخ: ${field('date')}</p>
  <p class="sign signature">التوقيع:</p>
  <p class="sign">ختم الشركة:</p>
  </body></html>`;
};
