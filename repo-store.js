/* Persist only reference lists and transactions. Credentials stay in workspace RAM. */
window.RepoStore = (() => {
  const base='https://api.github.com/repos/ahmedm838/bank-forms/contents/data/';
  const memory=window.BankFormsMemory;
  const shas={};
  const names={suppliers:'Suppliers.xlsx',transactions:'Transactions.xlsx'};
  const headers=()=>({Accept:'application/vnd.github+json', ...(memory.githubToken?{Authorization:'Bearer '+memory.githubToken}:{})});
  function connect(){
    if(memory.githubToken) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const dialog=document.createElement('dialog');
      dialog.style.cssText='max-width:460px;padding:24px;border:1px solid #ccd4df;border-radius:12px;font:16px Arial,sans-serif';
      dialog.innerHTML='<form method="dialog"><h2>Save to GitHub</h2><p>Enter a fine-grained GitHub token for <b>ahmedm838/bank-forms</b> with <b>Contents: Read and write</b>. It stays only in this open workspace.</p><p>Saved workbooks have the same visibility as the repository.</p><label>GitHub access token<input type="password" autocomplete="off" required style="display:block;width:100%;box-sizing:border-box;margin:12px 0;padding:10px"></label><p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Create a token in GitHub</a></p><button value="cancel" formnovalidate>Cancel</button> <button value="save">Connect and save</button></form>';
      dialog.addEventListener('close',()=>{
        const token=dialog.querySelector('input').value.trim();
        dialog.querySelector('input').value='';dialog.remove();
        if(dialog.returnValue!=='save'||!token){reject(new Error('Save cancelled. Your changes are still unsaved.'));return;}
        memory.githubToken=token;resolve();
      },{once:true});
      document.body.append(dialog);dialog.showModal();
    });
  }
  async function checked(response){
    if(response.ok)return response;
    if(response.status===401){delete memory.githubToken;throw new Error('GitHub connection expired. Press Save to connect again.');}
    if(response.status===403) delete memory.githubToken;
    if(response.status===409||response.status===422)throw new Error('The GitHub file changed. Export your edits, then reload and apply them to the latest list.');
    throw new Error('GitHub request failed ('+response.status+'). Check your connection and token permissions. Your changes have not been saved.');
  }
  async function load(kind){
    if(window.BANK_FORMS_STANDALONE) return memory['abk-'+kind]||[];
    const response=await checked(await fetch(base+names[kind]+'?ref=main',{headers:headers(),cache:'no-store'}));
    const file=await response.json();
    let bytes;
    if(file.encoding==='base64' && file.content){
      bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    }else{
      const raw=await checked(await fetch('https://api.github.com/repos/ahmedm838/bank-forms/git/blobs/'+file.sha,{headers:{...headers(),Accept:'application/vnd.github.raw+json'},cache:'no-store'}));
      bytes=new Uint8Array(await raw.arrayBuffer());
    }
    const rows=await ListFiles[kind](new Blob([bytes]));
    shas[kind]=file.sha;
    return rows;
  }
  async function save(kind,rows){
    if(window.BANK_FORMS_STANDALONE) return;
    if(memory.repoSaving) throw new Error('Another save is in progress. Please try again when it finishes.');
    memory.repoSaving=true;
    try {
      if(!shas[kind])throw new Error('The repository list has not loaded. Reload before saving.');
      await connect();
      const content=XLSX.write(RepoWorkbooks[kind](rows),{type:'base64',bookType:'xlsx',compression:true});
      const response=await checked(await fetch(base+names[kind],{
        method:'PUT',headers:{...headers(),'Content-Type':'application/json'},
        body:JSON.stringify({message:'Update '+names[kind]+' from Bank Forms',branch:'main',sha:shas[kind],content})
      }));
      const result=await response.json();shas[kind]=result.content.sha;
    }finally{memory.repoSaving=false;}
  }
  return {load,save};
})();
