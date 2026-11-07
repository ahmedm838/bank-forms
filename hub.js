/* Landing page: pick a bank, then a form.

   A form entry points at form.html with a preset id. Everything ABK offers is the
   same "Transfer / Bank Draft Application" PDF — a cheque (شيك مصرفي / bank draft)
   is that form with "Bank Draft" ticked and the currency set, which is what the
   presets in form-presets.js do.

   To add a bank's form: drop its blank PDF and a page-1 preview in assets/, add a
   preset in form-presets.js with the field boxes, and list it here. */

const BANKS = [
  {
    id:'abk', short:'ABK', name:'Al Ahli Bank of Kuwait – Egypt',
    forms:[
      { id:'transfer',   name:'Bank Transfer',  desc:'Swift or internal transfer' },
      { id:'cheque-egp', name:'Cheque — EGP',   desc:'Bank draft in Egyptian pounds' },
      { id:'cheque-usd', name:'Cheque — USD',   desc:'Bank draft in US dollars' },
      { id:'cheque-eur', name:'Cheque — EUR',   desc:'Bank draft in euro' },
    ],
  },
  { id:'cib', short:'CIB', name:'Commercial International Bank', forms:[] },
  { id:'nbe', short:'NBE', name:'National Bank of Egypt',        forms:[] },
  { id:'qnb', short:'QNB', name:'QNB Alahli',                    forms:[] },
  { id:'nbk', short:'NBK', name:'National Bank of Kuwait',       forms:[] },
];

const banksEl = document.getElementById('banks');
const formsEl = document.getElementById('forms');
const formsSection = document.getElementById('formsSection');
const formsNote = document.getElementById('formsNote');

function el(tag, cls, text){ const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; }

function showBanks(){
  for(const bank of BANKS){
    const card = el('button','card' + (bank.forms.length ? '' : ' empty'));
    card.type = 'button';
    card.dataset.bank = bank.id;
    card.appendChild(el('span','badge', bank.short));
    card.appendChild(el('span','cardName', bank.name));
    card.appendChild(el('span','cardDesc',
      bank.forms.length ? bank.forms.length + (bank.forms.length===1?' form':' forms') : 'No forms yet'));
    card.addEventListener('click', ()=>selectBank(bank));
    banksEl.appendChild(card);
  }
}

function selectBank(bank){
  [...banksEl.children].forEach(c => c.classList.toggle('on', c.dataset.bank === bank.id));
  formsEl.innerHTML = '';
  formsSection.hidden = false;

  if(!bank.forms.length){
    formsNote.textContent = 'No ' + bank.short + ' forms are set up yet. Add one by putting its blank PDF in assets/ and adding a preset — see the README.';
    formsNote.hidden = false;
  } else {
    formsNote.hidden = true;
    for(const f of bank.forms){
      const a = el('a','card');
      a.href = 'form.html?f=' + encodeURIComponent(f.id);
      a.appendChild(el('span','cardName', f.name));
      a.appendChild(el('span','cardDesc', f.desc));
      formsEl.appendChild(a);
    }
  }
  formsSection.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

setupGate().then(showBanks);
