/* Shared form defaults persisted in the repository. */
(async function(){
  await setupGate();
  await LISTS.loadFormDefaults();
  const $ = id => document.getElementById(id);
  const forms = Object.entries(window.FORM_DEFS).filter(([,f]) => f.ready && !f.alias && f.fields);
  const drafts = Object.fromEntries(forms.map(([id]) => [id,LISTS.formDefaults(id)]));
  const el = (tag,text) => {const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  let current = forms[0][0];
  const unsaved = Unsaved({badge:$('dirty'),saveBtn:$('btnSave'),commit:async ()=>{
    collect();
    try {
      await LISTS.saveAllFormDefaults(drafts);
      $('status').textContent='Default values saved for all devices.'; return true;
    } catch(e){ $('status').textContent=e.message; return false; }
  }});
  function collect(){
    const settings = {values:{},checks:{},flags:{}};
    $('defaultsFields').querySelectorAll('[data-default-row]').forEach(row=>{
      const mode=row.querySelector('.default-mode').value;
      const {kind,key}=row.dataset;
      if(mode==='inherit')return;
      const input=row.querySelector('.default-input');
      if(kind==='values') settings.values[key]=mode==='today'?{today:true}:{value:input.value};
      else settings[kind][key]=kind==='flags'?mode==='yes':input.value;
    });
    drafts[current]=settings;
  }
  function render(){
    const f=window.FORM_DEFS[current], saved=drafts[current];
    const mount=$('defaultsFields');mount.replaceChildren();
    $('formNote').textContent = 'Saved defaults are shared across devices through GitHub. Amounts and selections always start blank.';
    for(const [kind,fields] of [['values',f.fields.filter(LISTS.canDefault)]]){
      for(const field of fields){
        const row=el('div');row.className='row default-row';row.dataset.defaultRow='';row.dataset.kind=kind;row.dataset.key=field.id;
        const label=el('label',field.label);label.className='lbl';label.htmlFor='default-'+field.id;row.appendChild(label);
        const controls=el('div');controls.className='default-controls';
        const mode=el('select');mode.className='default-mode';mode.setAttribute('aria-label','Default mode for '+field.label);
        mode.add(new Option(field.today?'Form default — today':'Form default','inherit'));
        if(kind==='flags'){mode.add(new Option('Checked','yes'));mode.add(new Option('Unchecked','no'));}
        else {mode.add(new Option('Custom value','custom'));if(field.today)mode.add(new Option('Today (dynamic)','today'));}
        let input;
        if(kind==='checks' || field.type==='select'){
          input=el('select');input.add(new Option('— select —',''));
          const options=kind==='checks'?field.options.map(o=>({value:o.v,label:o.t})):
            (field.supplierNames?[...new Set(LISTS.suppliers().map(s=>String(s.nameAr||'').trim()).filter(Boolean))]:field.options).map(o=>({value:o,label:o}));
          options.forEach(o=>input.add(new Option(o.label,o.value)));
        }else{input=el(field.multi?'textarea':'input');if(input.tagName==='INPUT')input.type='text';}
        input.className='default-input';input.id='default-'+field.id;input.dir=field.latin?'ltr':'auto';
        input.placeholder=field.def || field.hint || '';
        const custom=saved[kind] && saved[kind][field.id];
        if(custom!==undefined){
          mode.value=kind==='flags'?(custom?'yes':'no'):custom.today?'today':'custom';
          const value=kind==='values'?(custom.value||''):custom;
          if(input.tagName==='SELECT' && value && !Array.from(input.options).some(o=>o.value===value))input.add(new Option(value,value));
          input.value=kind==='flags'?'':value;
        }
        const update=()=>{input.hidden=kind==='flags'||mode.value!=='custom';};update();
        mode.addEventListener('change',()=>{update();unsaved.touch();});
        input.addEventListener('input',()=>unsaved.touch());input.addEventListener('change',()=>unsaved.touch());
        controls.append(mode,input);row.appendChild(controls);mount.appendChild(row);
      }
    }
  }
  forms.forEach(([id,f])=>$('defaultForm').add(new Option(f.title,id)));
  $('defaultForm').addEventListener('change',()=>{collect();current=$('defaultForm').value;render();});
  $('btnSave').addEventListener('click',()=>unsaved.save());
  $('btnReset').addEventListener('click',()=>{drafts[current]={};render();unsaved.touch();});
  render();
})().catch(e=>{document.getElementById('status').textContent='Could not start: '+e.message;});
