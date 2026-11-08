/* Picks the form named by ?f= on form.html.

   Each file in forms/ adds its own definition to window.FORM_DEFS, so adding a
   form means adding a file there and listing it in hub.js — nothing in app.js
   needs to change. */
window.FORM_DEFS = window.FORM_DEFS || {};

function currentForm(){
  const id = new URLSearchParams(location.search).get('f') || 'transfer';
  const def = window.FORM_DEFS[id];
  if(!def) return { id, title:'Unknown form', bank:'', ready:false };
  // an old name points at the current one, and shares whatever it has saved
  return Object.assign(Object.create(def), { id: def.canonicalId || id });
}

/* app.js calls it by this name */
const currentPreset = currentForm;
