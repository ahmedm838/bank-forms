/* Password gate, shared by the hub and the form pages.

   This only keeps casual visitors out. These are static pages, so everything they
   hold is sent to the browser, and on a public repository the check below is
   readable by anyone who views source. Treat it as a doormat, not a lock — put
   nothing confidential in these pages.

   To change the password, replace PASS_SHA256 with the SHA-256 of the new one:
     node -e "console.log(require('crypto').createHash('sha256').update('NEW').digest('hex'))"
*/
/* Everything lives inside this function. Nothing is declared at the top level, so a
   stale cached copy of another script can never collide with it and take the page
   down with a SyntaxError. */
(function(){
'use strict';

const PASS_SHA256 = '2e9c5b012b951567952ba1bb5b1820fbaf99316c44fcfeb4dcfcc252a517feb5';
const GATE_KEY = 'abk-transfer-gate';

async function sha256Hex(s){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}

/* Resolves once the visitor is through. Unlocking is remembered for the browser
   session, so moving between the hub and a form does not ask again. */
function setupGate(){
  const gate = document.getElementById('gate');
  if(!gate) return Promise.resolve();

  let remembered = null;
  try{ remembered = sessionStorage.getItem(GATE_KEY); }catch(e){}
  if(remembered === PASS_SHA256){ gate.classList.add('done'); return Promise.resolve(); }

  return new Promise(resolve => {
    const form = document.getElementById('gateForm');
    const pass = document.getElementById('gatePass');
    const msg  = document.getElementById('gateMsg');
    pass.focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      msg.textContent = '';
      if(await sha256Hex(pass.value) === PASS_SHA256){
        try{ sessionStorage.setItem(GATE_KEY, PASS_SHA256); }catch(e){}
        gate.classList.add('done');
        resolve();
      } else {
        msg.textContent = 'That password is not right.';
        pass.select();
      }
    });
  });
}

window.setupGate = setupGate;
})();
