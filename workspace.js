/* Keep a temporary workspace in RAM across internal page navigation.
   Only the shared GitHub token is saved in localStorage. */
(function(){
  function freshMemory(){
    for(const storage of [() => localStorage, () => sessionStorage]){
      try{
        const store=storage();
        Object.keys(store).filter(key=>key.startsWith('abk-') && key !== 'abk-github-token').forEach(key=>store.removeItem(key));
      }catch(e){}
    }
    const memory=Object.create(null);
    let fallback='';
    Object.defineProperty(memory,'githubToken',{
      enumerable:true,configurable:true,
      get(){try{return localStorage.getItem('abk-github-token') || fallback;}catch(e){return fallback;}},
      set(value){fallback=value || '';try{if(value)localStorage.setItem('abk-github-token',value);else localStorage.removeItem('abk-github-token');}catch(e){}}
    });
    return memory;
  }
  if(window.BANK_FORMS_WORKSPACE || window.BANK_FORMS_STANDALONE){
    window.BankFormsMemory=freshMemory();
    return;
  }
  try{
    if(parent !== window && parent.BANK_FORMS_WORKSPACE){
      window.BankFormsMemory=parent.BankFormsMemory;
      return;
    }
  }catch(e){}
  window.BankFormsMemory=Object.create(null);
  const view=location.pathname.split('/').pop() || 'index.html';
  location.replace('workspace.html?view='+encodeURIComponent(view+location.search+location.hash));
})();
