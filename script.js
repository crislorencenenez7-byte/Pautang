const CFG = window.PAUTANG_CONFIG || {};
const GOOGLE_SHEET_URL = CFG.GOOGLE_SHEET_URL || "";

function setupMobileNav(){
  const nav=document.querySelector('.main-nav');
  const bar=document.querySelector('.topbar');
  if(!nav||!bar||bar.querySelector('.mobile-nav-toggle')) return;
  const btn=bar.querySelector('.mobile-nav-toggle');
  btn.addEventListener('click',()=>{const open=nav.classList.toggle('open');bar.classList.toggle('nav-open',open);btn.textContent=open?'✕':'☰';btn.setAttribute('aria-expanded',String(open));});
}
setupMobileNav();

const amountEl=document.getElementById('amount');
const totalPreview=document.getElementById('totalPreview');
if(amountEl&&totalPreview){
  const update=()=>{const a=Number(amountEl.value)||0;totalPreview.textContent='₱'+(a*1.2).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});};
  amountEl.addEventListener('input',update); update();
}

function setupMethodRadios(name,a,b){
  document.querySelectorAll(`input[name="${name}"]`).forEach(r=>r.addEventListener('change',()=>{
    const is=r.checked&&r.value==='GCash';
    const one=document.getElementById(a), two=document.getElementById(b);
    if(one) one.hidden=!is; if(two) two.hidden=is;
  }));
}
setupMethodRadios('releaseMethod','releaseGcash','releaseHandsOn');
setupMethodRadios('paymentMethod','paymentGcash','paymentHandsOn');

const loanForm=document.getElementById('loanForm');
if(loanForm){
  loanForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const msg=document.getElementById('message'); const btn=loanForm.querySelector('button[type="submit"]');
    if(!GOOGLE_SHEET_URL){msg.textContent='Google Sheets Web App URL is not configured.';msg.className='message error';msg.hidden=false;return;}
    btn.disabled=true; msg.hidden=true; msg.className='message';
    const data={name:document.getElementById('name').value.trim(),amount:Number(document.getElementById('amount').value),releaseMethod:document.querySelector('input[name="releaseMethod"]:checked')?.value||'GCash',releaseGcashName:document.getElementById('releaseGcashName')?.value.trim()||'',releaseGcashNumber:document.getElementById('releaseGcashNumber')?.value.trim()||''};
    try{const res=await fetch(GOOGLE_SHEET_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data)});const out=await res.json();if(!out.success)throw new Error(out.message||'Application failed.');msg.textContent='Application recorded successfully. Due Date: 15 days from today. Status: Unpaid';msg.hidden=false;loanForm.reset();if(totalPreview)totalPreview.textContent='₱0.00';}
    catch(err){msg.textContent=err.message||'Unable to submit.';msg.className='message error';msg.hidden=false;}
    finally{btn.disabled=false;}
  });
}

const payForm=document.getElementById('paymentForm');
if(payForm){
  const info=document.getElementById('gcashInfo');
  if(info&&CFG.GCASH_NAME&&CFG.GCASH_NUMBER) info.textContent=`${CFG.GCASH_NAME} • ${CFG.GCASH_NUMBER}`;
  payForm.addEventListener('submit',e=>{e.preventDefault();const m=document.getElementById('paymentMessage');m.textContent='Payment submitted for admin verification. The status should become Paid only after the admin verifies the payment.';m.hidden=false;});
}
