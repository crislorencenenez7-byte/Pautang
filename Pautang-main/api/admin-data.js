import { getAdminAuth, getAdminDb } from "./_firebase.js";
function token(req){const h=req.headers?.authorization||"";return h.startsWith("Bearer ")?h.slice(7).trim():null;}
async function isAdmin(user,db){
  if(process.env.ADMIN_EMAIL&&user.email&&user.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase()) return true;
  const s=await db.collection("users").doc(user.uid).get(); return s.exists&&s.data()?.role==="admin";
}
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed."});
  try{
    const t=token(req);if(!t)return res.status(401).json({error:"Authentication required."});
    const user=await getAdminAuth().verifyIdToken(t),db=getAdminDb();
    if(!(await isAdmin(user,db)))return res.status(403).json({error:"Admin access required."});
    const [loanSnap,paySnap]=await Promise.all([
      db.collection("loanApplications").orderBy("createdAt","desc").limit(100).get(),
      db.collection("payApplications").orderBy("createdAt","desc").limit(100).get()
    ]);
    return res.json({success:true,adminEmail:user.email||"",loans:loanSnap.docs.map(d=>({id:d.id,...d.data()})),payments:paySnap.docs.map(d=>({id:d.id,...d.data()}))});
  }catch(e){console.error("Admin data error:",e);return res.status(500).json({error:e?.message||"Unable to load admin data."});}
}
