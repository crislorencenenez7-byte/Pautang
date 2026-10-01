const amountInput=document.getElementById("amount"),
totalPreview=document.getElementById("totalPreview");

function money(n){
  return "₱"+Number(n||0).toLocaleString("en-PH",{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
}

function updateTotal(){
  if(amountInput&&totalPreview){
    const n=Number(amountInput.value)||0;
    totalPreview.textContent=money(n*1.2);
  }
}

amountInput?.addEventListener("input",updateTotal);
updateTotal();

function updateReleaseMethod(){
  const selected=document.querySelector(
    'input[name="releaseMethod"]:checked'
  );

  if(!selected)return;

  const g=document.getElementById("releaseGcash");
  const h=document.getElementById("releaseHandsOn");

  if(g)g.hidden=selected.value!=="GCash";
  if(h)h.hidden=selected.value!=="Hands-On";
}

document
  .querySelectorAll('input[name="releaseMethod"]')
  .forEach(r=>r.addEventListener("change",updateReleaseMethod));

updateReleaseMethod();

function showError(el,text){
  if(!el)return;

  el.textContent=text;
  el.className="message error";
  el.hidden=false;
}

async function currentAuthUser(){
  if(typeof window.PAUTANG_WAIT_FOR_USER==="function"){
    return window.PAUTANG_WAIT_FOR_USER(15000);
  }

  const start=Date.now();

  while(!window.PAUTANG_AUTH?.currentUser){
    if(Date.now()-start>15000){
      throw new Error(
        "Your session expired. Please sign in again."
      );
    }

    await new Promise(r=>setTimeout(r,100));
  }

  return window.PAUTANG_AUTH.currentUser;
}

async function token(){
  const user=await currentAuthUser();

  const getter=window.PAUTANG_GET_ID_TOKEN;

  if(!getter){
    throw new Error(
      "Firebase authentication is still loading. Please refresh and try again."
    );
  }

  return getter(user,true);
}

async function apiFetchWithAuth(url,options={}){
  let t=await token();

  let r=await fetch(url,{
    ...options,
    headers:{
      ...(options.headers||{}),
      Authorization:`Bearer ${t}`
    }
  });

  if(r.status===401){
    const user=await currentAuthUser();

    t=await window.PAUTANG_GET_ID_TOKEN(user,true);

    r=await fetch(url,{
      ...options,
      headers:{
        ...(options.headers||{}),
        Authorization:`Bearer ${t}`
      }
    });
  }

  return r;
}

async function accountStatus(){
  const r=await apiFetchWithAuth(
    "/api/account-status"
  );

  const j=await r.json().catch(()=>({}));

  if(!r.ok){
    throw new Error(
      j.error||"Unable to load account status."
    );
  }

  return j;
}


/* =========================
   LOAN APPLICATION
========================= */

const loanForm=document.getElementById("loanForm");

if(loanForm){

  const lock=document.getElementById("loanLock");

  accountStatus()
    .then(s=>{

      if(s.active){

        loanForm.classList.add(
          "loan-form-locked"
        );

        loanForm
          .querySelectorAll("input,button")
          .forEach(x=>x.disabled=true);

        if(lock){

          lock.hidden=false;

          lock.innerHTML=`
            <b>Borrowing access is locked</b>
            <span>
              Active loan
              <strong>${s.loan.id}</strong>
              is unpaid.
              Use Pay Loan to submit your payment.
            </span>
            <a class="primary-btn" href="pay.html">
              Pay Loan →
            </a>
          `;
        }
      }

    })
    .catch(e=>console.warn(e));


  loanForm.addEventListener(
    "submit",
    async e=>{

      e.preventDefault();

      const msg=document.getElementById(
        "message"
      );

      const btn=loanForm.querySelector(
        'button[type="submit"]'
      );

      const name=
        document.getElementById("name")
          ?.value.trim()||"";

      const amount=
        Number(
          document.getElementById("amount")
            ?.value||0
        );

      const method=
        document.querySelector(
          'input[name="releaseMethod"]:checked'
        )?.value||"";

      const gcashName=
        document.getElementById(
          "releaseGcashName"
        )?.value.trim()||"";

      const gcashNumber=
        document.getElementById(
          "releaseGcashNumber"
        )?.value.trim()||"";

      const address=
        document.getElementById(
          "releaseHandsOnAddress"
        )?.value.trim()||"";


      if(!name)
        return showError(
          msg,
          "Name is required."
        );

      if(
        !Number.isFinite(amount)||
        amount<1||
        amount>5000
      ){
        return showError(
          msg,
          "Loan amount must be between ₱1 and ₱5,000."
        );
      }

      if(!method)
        return showError(
          msg,
          "Please select GCash or Hands-On."
        );

      if(
        method==="GCash" &&
        (!gcashName||!gcashNumber)
      ){
        return showError(
          msg,
          "GCash Name and Number are required."
        );
      }

      if(
        method==="Hands-On" &&
        !address
      ){
        return showError(
          msg,
          "Address is required."
        );
      }


      btn.disabled=true;

      btn.innerHTML=
        '<span>Submitting</span><i class="spinner"></i>';

      msg.hidden=true;


      try{

        const r=
          await apiFetchWithAuth(
            "/api/apply",
            {
              method:"POST",

              headers:{
                "Content-Type":
                  "application/json"
              },

              body:JSON.stringify({
                name,
                amount,
                releaseMethod:method,
                releaseGcashName:gcashName,
                releaseGcashNumber:gcashNumber,
                releaseHandsOnAddress:address
              })
            }
          );


        const j=
          await r.json().catch(
            ()=>({})
          );


        if(!r.ok||!j.success){
          throw new Error(
            j.error||
            "Unable to save the loan application."
          );
        }


        msg.textContent=
          `Loan approved for recording. Reference: ${j.reference} • Total due: ${money(j.totalAmount)} • Due: ${j.dueDate}. Your borrowing access is now locked until the loan is Paid.`;

        msg.className="message";
        msg.hidden=false;


        loanForm
          .querySelectorAll("input,button")
          .forEach(x=>x.disabled=true);


        if(lock){

          lock.hidden=false;

          lock.innerHTML=`
            <b>Loan active</b>
            <span>
              Reference
              <strong>${j.reference}</strong>
              is now active.
              You cannot apply for another loan
              until payment is verified.
            </span>

            <a class="primary-btn" href="pay.html">
              Go to Pay Loan →
            </a>
          `;
        }


      }catch(err){

        showError(
          msg,
          err?.message||
          "Failed to submit application."
        );

        btn.disabled=false;

        btn.innerHTML=
          "Submit Application →";
      }

    }
  );
}


/* =========================
   PAYMENT APPLICATION
========================= */

const paymentForm=
  document.getElementById(
    "paymentForm"
  );

if(paymentForm){

  const info=
    document.getElementById(
      "activeLoanInfo"
    );

  const nameInput=
    document.getElementById(
      "payName"
    );

  const amount=
    document.getElementById(
      "payAmount"
    );

  const message=
    document.getElementById(
      "paymentMessage"
    );

  const proof=
    document.getElementById(
      "proof"
    );

  const submit=
    paymentForm.querySelector(
      'button[type="submit"]'
    );


  let activeLoanTotal=0;


  async function loadLoan(){

    try{

      const s=
        await accountStatus();


      if(!s.active){

        paymentForm.innerHTML=`
          <div class="empty-state">

            <b>No unpaid loan found.</b>

            <span>
              You currently have no active
              loan to pay.
            </span>

            <a
              class="primary-btn"
              href="apply.html"
            >
              Apply Loan →
            </a>

          </div>
        `;

        return;
      }


      const l=s.loan;


      activeLoanTotal=
        Number(l.totalAmount);


      if(
        !Number.isFinite(activeLoanTotal)||
        activeLoanTotal<=0
      ){

        throw new Error(
          "The active loan has an invalid total amount."
        );
      }


      if(nameInput){
        nameInput.value=
          l.name||"";
      }


      if(amount){

        amount.value=
          activeLoanTotal.toFixed(2);

        amount.readOnly=true;
      }


      if(info){

        info.innerHTML=`

          <div>
            <span>Reference</span>
            <b>${l.id}</b>
          </div>

          <div>
            <span>Original amount</span>
            <b>${money(l.amount)}</b>
          </div>

          <div>
            <span>Total due</span>
            <b>${money(activeLoanTotal)}</b>
          </div>

          <div>
            <span>Due date</span>
            <b>${l.dueDate}</b>
          </div>

        `;
      }


      const qrWrap=
        document.getElementById(
          "gcashQrWrap"
        );

      const qr=
        document.getElementById(
          "gcashQr"
        );

      const qrUrl=
        window.PAUTANG_CONFIG
          ?.GCASH_QR_URL||"";


      if(
        qrUrl&&
        qrWrap&&
        qr
      ){

        qr.src=qrUrl;
        qrWrap.hidden=false;
      }


    }catch(e){

      if(message){
        showError(
          message,
          e.message
        );
      }

    }

  }


  loadLoan();


  document
    .querySelectorAll(
      'input[name="paymentMethod"]'
    )
    .forEach(
      r=>r.addEventListener(
        "change",
        ()=>{
          
          const g=
            document.getElementById(
              "paymentGcash"
            );

          const h=
            document.getElementById(
              "paymentHandsOn"
            );


          if(g){

            g.hidden=
              r.value!=="GCash"||
              !r.checked;
          }


          if(h){

            h.hidden=
              r.value!=="Hands-On"||
              !r.checked;
          }

        }
      )
    );


  paymentForm.addEventListener(
    "submit",
    async e=>{

      e.preventDefault();


      const method=
        document.querySelector(
          'input[name="paymentMethod"]:checked'
        )?.value||"";


      if(
        !Number.isFinite(activeLoanTotal)||
        activeLoanTotal<=0
      ){

        return showError(
          message,
          "Unable to determine the total amount due."
        );
      }


      let proofDataUrl="";
      let proofFileName="";


      if(method==="GCash"){

        const f=
          proof?.files?.[0];


        if(!f){

          return showError(
            message,
            "Please select your payment proof screenshot."
          );
        }


        try{

          proofDataUrl=
            await compressImage(f);

          proofFileName=
            f.name;

        }catch(err){

          return showError(
            message,
            err.message
          );
        }

      }


      submit.disabled=true;

      submit.innerHTML=
        '<span>Submitting payment</span><i class="spinner"></i>';

      message.hidden=true;


      try{

        /*
          IMPORTANT:
          Use the active loan total from
          Firestore/account-status instead
          of trusting a manually typed amount.
        */

        const payload={
          name:
            nameInput?.value.trim()||"",

          amount:
            activeLoanTotal,

          paymentMethod:
            method,

          proofDataUrl:
            proofDataUrl,

          proofFileName:
            proofFileName
        };


        const r=
          await apiFetchWithAuth(
            "/api/pay-application",
            {
              method:"POST",

              headers:{
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(payload)
            }
          );


        const j=
          await r.json().catch(
            ()=>({})
          );


        if(
          !r.ok||
          !j.success
        ){

          throw new Error(
            j.error||
            "Unable to save payment application."
          );
        }


        message.textContent=
          j.message||
          "Payment submitted. Admin will verify your payment.";

        message.className=
          "message";

        message.hidden=false;


        paymentForm
          .querySelectorAll(
            "input,button"
          )
          .forEach(
            x=>x.disabled=true
          );


      }catch(err){

        showError(
          message,
          err?.message||
          "Failed to submit payment."
        );

        submit.disabled=false;

        submit.innerHTML=
          "Submit Payment →";
      }

    }
  );

}


/* =========================
   IMAGE COMPRESSION
========================= */

async function compressImage(file){

  if(!file.type.startsWith("image/")){

    throw new Error(
      "Payment proof must be an image."
    );
  }


  const max=1600;

  const bitmap=
    await createImageBitmap(file);


  const scale=
    Math.min(
      1,
      max/
      Math.max(
        bitmap.width,
        bitmap.height
      )
    );


  const c=
    document.createElement(
      "canvas"
    );


  c.width=
    Math.max(
      1,
      Math.round(
        bitmap.width*scale
      )
    );


  c.height=
    Math.max(
      1,
      Math.round(
        bitmap.height*scale
      )
    );


  c.getContext("2d")
    .drawImage(
      bitmap,
      0,
      0,
      c.width,
      c.height
    );


  let q=.82;

  let data=
    c.toDataURL(
      "image/jpeg",
      q
    );


  while(
    data.length>2_300_000&&
    q>.45
  ){

    q-=.08;

    data=
      c.toDataURL(
        "image/jpeg",
        q
      );
  }


  if(data.length>2_300_000){

    throw new Error(
      "Please choose a smaller payment screenshot."
    );
  }


  return data;
          }
