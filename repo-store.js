/* Persist only reference lists and transactions. The token is shared app-wide. */
window.RepoStore = (() => {
  const base='https://api.github.com/repos/ahmedm838/bank-forms/contents/data/';
  const memory=window.BankFormsMemory;
  const shas={};
  const names={banks:'Banks.xlsx',suppliers:'Suppliers.xlsx',transactions:'Transactions.xlsx',defaults:'FormDefaults.json'};
  const headers=()=>({Accept:'application/vnd.github+json', ...(memory.githubToken?{Authorization:'Bearer '+memory.githubToken}:{})});
  function connect(){
    if(memory.githubToken) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const dialog=document.createElement('dialog');
      dialog.style.cssText='max-width:460px;padding:24px;border:1px solid #ccd4df;border-radius:12px;font:16px Arial,sans-serif';
      dialog.innerHTML='<form method="dialog"><h2>Save to GitHub</h2><p>Enter a fine-grained GitHub token for <b>ahmedm838/bank-forms</b> with <b>Contents: Read and write</b>. It is saved in this browser for all Bank Forms pages until you forget it.</p><p>Saved workbooks have the same visibility as the repository.</p><label>GitHub access token<input type="password" autocomplete="off" required style="display:block;width:100%;box-sizing:border-box;margin:12px 0;padding:10px"></label><p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Create a token in GitHub</a></p><button value="cancel" formnovalidate>Cancel</button> <button value="save">Connect and save</button></form>';
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
    if(response.status===401){memory.githubToken='';throw new Error('GitHub connection expired. Press Save to connect again.');}

    if(response.status===409||response.status===422)throw new Error('The GitHub file changed. Export your edits, then reload and apply them to the latest list.');
    throw new Error('GitHub request failed ('+response.status+'). Check your connection and token permissions. Your changes have not been saved.');
  }
  /* Loaded files are kept in the workspace's RAM (shared by every page in the
     iframe), so moving between pages does not download and re-parse the same
     workbooks. A cached copy younger than FRESH_MS is used as is; older ones are
     revalidated with the file's ETag, which costs a tiny 304 instead of the whole
     file. Saves still send the file's sha, so GitHub rejects a stale overwrite. */
  const FRESH_MS=30000;
  const cache=memory.repoCache || (memory.repoCache=Object.create(null));
  const copy=value=>JSON.parse(JSON.stringify(value));
  const pending={};
  function load(kind,options){
    if(window.BANK_FORMS_STANDALONE) return Promise.resolve(memory['abk-'+kind]||[]);
    const fresh=options && options.fresh;
    const hit=cache[kind];
    if(hit && !fresh && Date.now()-hit.at<FRESH_MS){shas[kind]=hit.sha;return Promise.resolve(copy(hit.rows));}
    // two callers asking at once share one request
    if(!pending[kind]) pending[kind]=fetchKind(kind).finally(()=>{delete pending[kind];});
    return pending[kind].then(copy);
  }
  async function fetchKind(kind){
    const hit=cache[kind];
    const conditional=hit && hit.etag ? {'If-None-Match':hit.etag} : {};
    const response=await fetch(base+names[kind]+'?ref=main',{headers:{...headers(),...conditional},cache:'no-store'});
    if(response.status===304 && hit){hit.at=Date.now();shas[kind]=hit.sha;return hit.rows;}
    const file=await (await checked(response)).json();
    let bytes;
    if(file.encoding==='base64' && file.content){
      bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    }else{
      const raw=await checked(await fetch('https://api.github.com/repos/ahmedm838/bank-forms/git/blobs/'+file.sha,{headers:{...headers(),Accept:'application/vnd.github.raw+json'},cache:'no-store'}));
      bytes=new Uint8Array(await raw.arrayBuffer());
    }
    const rows=kind==='defaults' ? JSON.parse(new TextDecoder().decode(bytes)) : await ListFiles[kind](new Blob([bytes]));
    shas[kind]=file.sha;
    cache[kind]={rows:copy(rows),sha:file.sha,etag:response.headers.get('ETag'),at:Date.now()};
    return rows;
  }
  async function save(kind,rows){
    if(window.BANK_FORMS_STANDALONE) throw new Error('Open the hosted app to save changes to GitHub.');
    if(memory.repoSaving) throw new Error('Another save is in progress. Please try again when it finishes.');
    memory.repoSaving=true;
    try {
      if(!shas[kind] && cache[kind]) shas[kind]=cache[kind].sha;
      if(!shas[kind])throw new Error('The repository list has not loaded. Reload before saving.');
      await connect();
      const content=kind==='defaults' ? btoa(Array.from(new TextEncoder().encode(JSON.stringify(rows,null,2)),byte=>String.fromCharCode(byte)).join('')) : XLSX.write(RepoWorkbooks[kind](rows),{type:'base64',bookType:'xlsx',compression:true});
      const response=await checked(await fetch(base+names[kind],{
        method:'PUT',headers:{...headers(),'Content-Type':'application/json'},
        body:JSON.stringify({message:'Update '+names[kind]+' from Bank Forms',branch:'main',sha:shas[kind],content})
      }));
      const result=await response.json();shas[kind]=result.content.sha;
      // what was just written is the newest copy; no need to download it again
      cache[kind]={rows:copy(rows),sha:result.content.sha,etag:null,at:Date.now()};
    }finally{memory.repoSaving=false;}
  }
  return {load,save,connect};
})();
