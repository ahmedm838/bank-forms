/* Edits on a list page are held until Save is pressed, so a half-finished change
   never becomes the list the transfer form reads. This tracks that state: it
   marks the page, lights the Save button, and stops the tab being closed on top
   of work that was never saved. */
window.Unsaved = function Unsaved(opts){
  const { badge, saveBtn, commit, onSaved } = opts;
  let dirty = false, revision = 0, saving = false;

  function paint(){
    if (badge) badge.hidden = !dirty;
    if (saveBtn){
      saveBtn.classList.toggle('primary', dirty);
      saveBtn.disabled = !dirty || saving;
      saveBtn.textContent = saving ? 'Saving…' : dirty ? 'Save' : 'Saved';
    }
  }

  window.addEventListener('beforeunload', e => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';            // the browser shows its own wording
  });

  paint();
  return {
    get dirty(){ return dirty; },
    touch(){ revision++; dirty = true; paint(); },
    async save(){
      if(saving) return false;
      const started=revision; saving=true; paint();
      try {
        if(!await commit()) return false;
        if(revision===started) dirty=false;
        if(onSaved) onSaved();
        return true;
      } finally {saving=false;paint();}
    },
    /* for an action that writes straight through, like restoring a seed */
    settled(){ dirty = false; paint(); },
  };
};
