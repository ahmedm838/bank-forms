/* Keep a temporary workspace in RAM across internal page navigation.
   Nothing is written to localStorage, sessionStorage, cookies or a database. */
(function(){
  function freshMemory(){
    for(const storage of [() => localStorage, () => sessionStorage]){
      try{
        const store=storage();
        Object.keys(store).filter(key=>key.startsWith('abk-')).forEach(key=>store.removeItem(key));
      }catch(e){}
    }
    return Object.create(null);
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
