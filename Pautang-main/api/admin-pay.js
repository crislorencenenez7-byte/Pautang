import { getAdminAuth, getAdminDb, FieldValue } from "./_firebase.js";

function token(req){
  const h=req.headers?.authorization||"";
  return h.startsWith("Bearer ")?h.slice(7).trim():null;
}

async function isAdmin(user,db){
  if(process.env.ADMIN_EMAIL&&user.email&&user.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase()) return true;
  const s=await db.collection("users").doc(user.uid).get();
  return s.exists&&s.data()?.role==="admin";
}

async function updateSheetStatus(reference,status,paymentId){
  const endpoint=process.env.GOOGLE_SHEET_URL;
  if(!endpoint) throw new Error("GOOGLE_SHEET_URL is not configured in Vercel.");

  const r=await fetch(endpoint,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      action:"updateLoanStatus",
      reference,
      status,
      paymentId
    })
  });

  const text=await r.text();
  let data=null;

  try{
    data=JSON.parse(text);
  }catch(_){
    data=null;
  }

  if(!r.ok){
    throw new Error(`Google Sheets returned HTTP ${r.status}. ${text.slice(0,500)}`);
  }

  if(!data || data.success!==true){
    const providerMessage=
      data?.error ||
      data?.message ||
      text.slice(0,500) ||
      "Unknown Google Sheets error.";

    throw new Error(`Google Sheets status update failed: ${providerMessage}`);
  }

  return data;
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed."});

  try{
    const t=token(req);
    if(!t)return res.status(401).json({error:"Authentication required."});

    const user=await getAdminAuth().verifyIdToken(t);
    const db=getAdminDb();

    if(!(await isAdmin(user,db))){
      return res.status(403).json({error:"Admin access required."});
    }

    const body=req.body&&typeof req.body==="object"?req.body:{};
    const payId=String(body.payId||"").trim();
    const action=String(body.action||"").trim();

    if(!payId||!["approve","reject"].includes(action)){
      return res.status(400).json({error:"Payment ID and action are required."});
    }

    const payRef=db.collection("payApplications").doc(payId);
    const paySnap=await payRef.get();

    if(!paySnap.exists){
      return res.status(404).json({error:"Payment application not found."});
    }

    const p=paySnap.data();

    if(p.status!=="Pending"){
      return res.status(409).json({error:`This payment is already ${p.status}.`});
    }

    const reference=String(p.reference||p.loanId||"").trim();

    if(!reference){
      return res.status(400).json({error:"Loan reference is missing from the payment application."});
    }

    const loanRef=db.collection("loanApplications").doc(p.loanId);
    const loanSnap=await loanRef.get();

    if(!loanSnap.exists){
      return res.status(404).json({error:"Linked loan not found."});
    }

    if(action==="approve"){
      // Update Google Sheets first. If this fails, Firestore remains Pending
      // so the admin can retry instead of creating a mismatched Paid state.
      await updateSheetStatus(reference,"Paid",payId);

      await payRef.set({
        status:"Approved",
        verifiedBy:user.email||user.uid,
        verifiedAt:FieldValue.serverTimestamp()
      },{merge:true});

      await loanRef.set({
        status:"Paid",
        paidAt:FieldValue.serverTimestamp(),
        paymentApplicationId:payId,
        sheetSyncStatus:"Paid"
      },{merge:true});

      await db.collection("users").doc(p.uid).set({
        loanActive:false,
        borrowingEnabled:true,
        activeLoanId:"",
        activeLoanReference:"",
        activeLoanDueDate:"",
        updatedAt:FieldValue.serverTimestamp()
      },{merge:true});

    }else{
      await payRef.set({
        status:"Rejected",
        verifiedBy:user.email||user.uid,
        verifiedAt:FieldValue.serverTimestamp()
      },{merge:true});
    }

    return res.json({
      success:true,
      status:action==="approve"?"Paid":"Rejected",
      reference
    });

  }catch(e){
    console.error("Admin payment action error:",e);

    return res.status(500).json({
      error:e?.message||"Unable to update payment."
    });
  }
}
