import { getAdminAuth, getAdminDb } from "./_firebase.js";
import { getStorage } from "firebase-admin/storage";
function token(req){const h=req.headers?.authorization||"";return h.startsWith("Bearer ")?h.slice(7).trim():null;}
async function isAdmin(user,db){
  if(process.env.ADMIN_EMAIL && user.email && user.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase()) return true;
  const s=await db.collection("users").doc(user.uid).get(); return s.exists && s.data()?.role==="admin";
}
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed."});
  try{
    const t=token(req); if(!t) return res.status(401).json({error:"Authentication required."}); const user=await getAdminAuth().verifyIdToken(t); const db=getAdminDb();
    if(!(await isAdmin(user,db))) return res.status(403).json({error:"Admin access required."});
    const [loanSnap,paySnap]=await Promise.all([db.collection("loanApplications").orderBy("createdAt","desc").limit(100).get(),db.collection("payApplications").orderBy("createdAt","desc").limit(100).get()]);
    const payments=[];
    for(const d of paySnap.docs){const p={id:d.id,...d.data()}; if(p.proofPath){try{const bucket=getStorage().bucket();const [url]=await bucket.file(p.proofPath).getSignedUrl({action:"read",expires:Date.now()+30*60*1000});p.proofUrl=url;}catch(e){console.error("Signed proof URL error",e);p.proofUrl="";}} payments.push(p);}
    return res.json({success:true,adminEmail:user.email||"",loans:loanSnap.docs.map(d=>({id:d.id,...d.data()})),payments});
  }catch(e){console.error("Admin data error:",e);return res.status(500).json({error:e?.message||"Unable to load admin data."});}
}
