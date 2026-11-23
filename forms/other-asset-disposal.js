/* Other forms — Asset Disposal Decision (قرار إداري: استبعاد أصل من الأصول الثابتة).

   Not a bank form: an internal decision addressed to the Managing Director, so it
   is listed on the Other forms page rather than under a bank. It is a letter, so
   it is built the way the Payroll Debit Order and the Bank Deposit are: the
   wording and layout from the supplied Word file live in the HTML below, the
   values flow inline, and printing prints that page.

   The Word file's page: A4, half-inch margins, a single-line page border 24pt in
   from the edge, Arial 12pt with 1.5 line spacing. Figures and dates print in
   Arabic-Indic digits like the other Arabic letters; the asset's serial number
   and register code are printed exactly as typed, since they may carry letters. */
window.FORM_DEFS = window.FORM_DEFS || {};

/* What the decision rests on — the Word file offers both as "التقرير / نتائج التحقيق". */
const DISPOSAL_BASIS = ['التقرير', 'نتائج التحقيق'];

/* What the report or investigation established — the Word file lists all three. */
const DISPOSAL_REASONS = [
  'تعذر الانتفاع بالأصل',
  'فقد الأصل',
  'تلف الأصل',
  'تعذر الانتفاع بالأصل أو فقده أو تلفه',
];

window.FORM_DEFS['asset-disposal'] = {
  title: 'Asset Disposal Decision', bank: '', ready: true,
  section: 'other', sub: 'Other forms  ·  قرار إداري باستبعاد أصل ثابت',
  flowingLetter: true, letterHtml: 'assetDisposalLetterHtml', overlayOnly: true,
  page: { w: 595.3, h: 841.9 }, fontSize: 12,
  groups: [
    { id:'decision', title:'القرار — Decision' },
    { id:'asset',    title:'بيانات الأصل — Asset details' },
  ],
  fields: [
    { id:'date', label:'التاريخ — Date', group:'decision',
      latin:true, arabicDigits:true, today:true, required:true, hint:'dd/mm/yyyy' },
    { id:'decisionNo', label:'رقم القرار — Decision no.', group:'decision',
      arabicDigits:true, required:true, fileLabel:true },
    { id:'basis', label:'بناءً على — Based on', group:'decision',
      type:'select', options:DISPOSAL_BASIS, required:true },
    { id:'reportDate', label:'تاريخ التقرير / التحقيق — Report / investigation date', group:'decision',
      latin:true, arabicDigits:true, required:true, hint:'dd/mm/yyyy' },
    { id:'reason', label:'ما ثبت — What was established', group:'decision',
      type:'select', options:DISPOSAL_REASONS, required:true },

    { id:'assetName', label:'اسم الأصل المراد استبعاده — Asset name', group:'asset', required:true },
    { id:'brandModel', label:'الماركة والموديل — Brand and model', group:'asset', required:true },
    { id:'serialNo', label:'الرقم المسلسل للأصل — Serial no.', group:'asset', required:true },
    { id:'assetCode', label:'كود الأصل بالسجل — Register code', group:'asset', required:true },
    { id:'purchaseDate', label:'تاريخ شراء الأصل — Purchase date', group:'asset',
      latin:true, arabicDigits:true, required:true, hint:'dd/mm/yyyy' },
    { id:'cost', label:'التكلفة التاريخية — Historical cost', group:'asset',
      latin:true, thousands:true, arabicDigits:true, required:true, hint:'e.g. 125400' },
    { id:'depreciation', label:'مجمع الإهلاك حتى تاريخ القرار — Accumulated depreciation', group:'asset',
      latin:true, thousands:true, arabicDigits:true, required:true },
    { id:'netBookValue', label:'صافي القيمة الدفترية الحالية — Net book value', group:'asset',
      latin:true, thousands:true, arabicDigits:true, required:true,
      hint:'historical cost − accumulated depreciation' },
  ],
};

window.assetDisposalLetterHtml = function(values, size = 12){
  const escape = text => String(text || '').replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const field = id => {
    const f = window.FORM_DEFS['asset-disposal'].fields.find(f => f.id === id);
    let value = String(values[id] || '');
    if(f.arabicDigits) value = value.replace(/[0-9]/g, n => '٠١٢٣٤٥٦٧٨٩'[Number(n)]);
    /* a date reads day/month/year from the right, each part in its own order */
    if(/^[٠-٩0-9]{1,2}\/[٠-٩0-9]{1,2}\/[٠-٩0-9]{4}$/.test(value)){
      return '<span class="date-value" dir="rtl">'
        + value.split('/').map(part => '<bdi dir="ltr">'+escape(part)+'</bdi>').join('<span>/</span>')
        + '</span>';
    }
    return '<bdi class="v">' + escape(value || '…………………') + '</bdi>';
  };
  const pt = Math.max(7, Math.min(30, Number(size) || 12));
  const pair = (a, aId, b, bId) =>
    `<div class="pair"><p>${a}: ${field(aId)}</p><p>${b}: ${field(bId)}</p></div>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Asset Disposal Decision</title>
  <style>@page{size:A4 portrait;margin:24pt}*{box-sizing:border-box}html{background:#fff;color:#000}
  body{font-family:Arial,sans-serif;font-size:${pt}pt;line-height:1.5;margin:0;padding:36pt;width:595.3pt;text-align:right}
  .frame{position:fixed;top:24pt;right:24pt;bottom:24pt;left:24pt;border:0.75pt solid #000;pointer-events:none}
  p{margin:0 0 ${pt * 0.35}pt}
  h1{font-size:${pt * 2.2}pt;font-weight:normal;text-align:center;line-height:1.2;margin:0 0 ${pt * 0.6}pt;padding-bottom:${pt * 0.2}pt;border-bottom:0.75pt solid #000}
  h3{font-size:${pt}pt;font-weight:normal;color:#0F4761;text-align:center;line-height:1.3;margin:${pt * 0.6}pt 0 ${pt * 0.15}pt}
  .head{display:flex;gap:${pt * 3}pt}
  .pair{display:grid;grid-template-columns:1fr 1fr;column-gap:${pt * 1.5}pt}
  .body{text-align:justify}
  .sign{display:grid;grid-template-columns:1fr 1fr;text-align:center;margin-top:${pt * 1.5}pt}
  .sign p{margin:0}.sign .line{margin-top:${pt * 0.6}pt}
  .date-value{display:inline-flex;direction:rtl;unicode-bidi:isolate;white-space:nowrap}
  bdi.v{unicode-bidi:isolate}
  @media print{body{padding:12pt;width:auto}.frame{top:0;right:0;bottom:0;left:0}}</style></head><body>
  <div class="frame"></div>
  <h1>قرار إداري</h1>
  <div class="head"><p>التاريخ: ${field('date')}</p><p>رقم القرار: ${field('decisionNo')}</p></div>
  <p>الموضوع: استبعاد أصل من الأصول الثابتة للشركة</p>
  <p>السيد/ العضو المنتدب لشركة أي انيرجي لصناعة العدادات.</p>
  <p class="center" style="text-align:center">تحية طيبة وبعد،</p>
  <p class="body">بعد الاطلاع على ${field('basis')} المؤرخ في ${field('reportDate')} والمرفق منه صورة بشأن حالة الأصل المشار إليه أدناه.</p>
  <p>اسم الأصل المراد استبعاده: ${field('assetName')}</p>
  <p>الماركة والموديل: ${field('brandModel')}</p>
  ${pair('الرقم المسلسل للأصل', 'serialNo', 'كود الأصل بالسجل', 'assetCode')}
  ${pair('تاريخ شراء الأصل', 'purchaseDate', 'التكلفة التاريخية', 'cost')}
  ${pair('مجمع الإهلاك حتى تاريخ القرار', 'depreciation', 'صافي القيمة الدفترية الحالية', 'netBookValue')}
  <p class="body">وحيث إنه قد ثبت من واقع ${field('basis')} المشار إليه ${field('reason')}، فقد تقرر ما يلي:</p>
  <h3>المادة الأولى: استبعاد الأصل</h3>
  <p class="body">الموافقة على استبعاد الأصل الموضح بياناته أعلاه من سجلات الأصول الثابتة للشركة.</p>
  <h3>المادة الثانية: المعالجة المحاسبية</h3>
  <p class="body">تُكلف الإدارة المالية باتخاذ الإجراءات المحاسبية اللازمة لاستبعاد الأصل من سجل الأصول الثابتة وإثبات الآثار المالية المترتبة على ذلك، وفقًا لمعايير المحاسبة المصرية والسياسات المحاسبية المعتمدة بالشركة، مع الاحتفاظ بالمستندات المؤيدة لعملية الاستبعاد.</p>
  <h3>المادة الثالثة: المسئولية القانونية والمالية</h3>
  <p class="body">لا يترتب على صدور هذا القرار إبراء ذمة أي شخص من المسئولية القانونية أو المالية عن فقد الأصل أو تلفه، حال ثبوت تلك المسئولية بموجب التحقيقات والإجراءات القانونية المعتمدة. وتظل للشركة كافة حقوقها في الرجوع على المسؤول عن الفقد أو التلف، إن وجد، وفقًا لأحكام القانون واللوائح المعمول بها.</p>
  <h3>المادة الرابعة: تنفيذ القرار</h3>
  <p class="body">تُكلف الإدارة المالية والإدارة المختصة بتنفيذ هذا القرار، وتحديث سجلات الأصول والعهد ذات الصلة، وحفظ نسخة من القرار والتقرير أو التحقيق المؤيد له ضمن مستندات الشركة.</p>
  <h3>المادة الخامسة: سريان القرار</h3>
  <p class="body">يُعمل بهذا القرار من تاريخ اعتماده، وعلى جميع الإدارات المختصة تنفيذه كل فيما يخصه.</p>
  <div class="sign">
    <div><p>مدير الإدارة المالية</p><p class="line">التوقيع:</p></div>
    <div><p>عضو مجلس الإدارة المنتدب</p><p class="line">التوقيع:</p></div>
  </div>
  </body></html>`;
};
