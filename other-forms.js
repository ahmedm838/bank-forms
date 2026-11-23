/* Other forms page: company forms that are not addressed to a bank.

   A form file in forms/ marks itself `section: 'other'` and is listed here; it
   opens in the same filler (form.html) as the bank forms. To add one, add its
   file in forms/, load it on this page, form.html and defaults.html, and list it
   below. */
(function(){
'use strict';

const OTHER_FORMS = [
  { id:'asset-disposal', name:'Asset Disposal Decision', desc:'قرار إداري باستبعاد أصل ثابت' },
];

function el(tag, cls, text){ const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; }

function showForms(){
  const box = document.getElementById('forms');
  for(const f of OTHER_FORMS){
    const def = window.FORM_DEFS && window.FORM_DEFS[f.id];
    const ready = !!(def && def.ready);
    const card = el(ready ? 'a' : 'div', 'card' + (ready ? '' : ' empty'));
    if(ready) card.href = 'form.html?f=' + encodeURIComponent(f.id);
    card.appendChild(el('span','cardName', f.name));
    const desc = el('span','cardDesc', f.desc);
    desc.dir = 'auto';
    card.appendChild(desc);
    box.appendChild(card);
  }
}

setupGate().then(showForms);
})();
