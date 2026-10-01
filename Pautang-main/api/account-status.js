import { getAdminAuth, getAdminDb } from "./_firebase.js";
function token(req){const h=req.headers?.authorization||"";return h.startsWith("Bearer ")?h.slice(7).trim():null;}
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed."});
  try{
    const t=token(req); if(!t) return res.status(401).json({error:"Please sign in first."});
    const user=await getAdminAuth().verifyIdToken(t); const db=getAdminDb();
    const snap=await db.collection("loanApplications").where("uid","==",user.uid).where("status","==","Unpaid").limit(1).get();
    if(snap.empty) return res.json({success:true,active:false,loan:null});
    const d=snap.docs[0]; const loan={id:d.id,...d.data()};
    return res.json({success:true,active:true,loan});
  }catch(e){console.error(e);return res.status(500).json({error:e?.message||"Unable to load account status."});}
}
