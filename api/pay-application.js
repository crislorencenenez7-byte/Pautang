import {
  getAdminAuth,
  getAdminDb,
  FieldValue
} from "./_firebase.js";


function token(req){

  const h=
    req.headers?.authorization||"";

  return h.startsWith("Bearer ")
    ? h.slice(7).trim()
    : null;
}


function clean(s){

  return String(s??"").trim();
}


/* =========================
   GOOGLE DRIVE UPLOAD
========================= */

async function uploadProofToDrive({
  dataUrl,
  fileName,
  uid,
  loanId,
  email
}){

  const endpoint=
    process.env.GOOGLE_SHEET_URL;


  if(!endpoint){

    throw new Error(
      "GOOGLE_SHEET_URL is not configured in Vercel."
    );
  }


  const response=
    await fetch(
      endpoint,
      {
        method:"POST",

        headers:{
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            action:
              "uploadPaymentProof",

            dataUrl:
              dataUrl,

            fileName:
              fileName,

            uid:
              uid,

            loanId:
              loanId,

            email:
              email

          })
      }
    );


  const text=
    await response.text();


  let data={};


  try{

    data=
      JSON.parse(text);

  }catch{

    data={};
  }


  if(
    !response.ok||
    !data.success||
    !data.url
  ){

    throw new Error(
      data.error||
      "Payment proof upload failed. Please try again."
    );
  }


  return {

    url:
      data.url,

    fileId:
      data.fileId||"",

    fileName:
      data.fileName||
      fileName

  };
}


/* =========================
   MAIN HANDLER
========================= */

export default async function handler(
  req,
  res
){

  if(req.method!=="POST"){

    return res
      .status(405)
      .json({
        error:
          "Method not allowed."
      });
  }


  try{

    /* =====================
       AUTHENTICATION
    ===================== */

    const t=
      token(req);


    if(!t){

      return res
        .status(401)
        .json({
          error:
            "Please sign in first."
        });
    }


    const user=
      await getAdminAuth()
        .verifyIdToken(t);


    /* =====================
       REQUEST BODY
    ===================== */

    const body=
      req.body&&
      typeof req.body==="object"
        ? req.body
        : {};


    const db=
      getAdminDb();


    /* =====================
       FIND ACTIVE LOAN
    ===================== */

    const loanSnap=
      await db
        .collection(
          "loanApplications"
        )
        .where(
          "uid",
          "==",
          user.uid
        )
        .where(
          "status",
          "==",
          "Unpaid"
        )
        .limit(1)
        .get();


    if(loanSnap.empty){

      return res
        .status(409)
        .json({
          error:
            "You do not have an active unpaid loan."
        });
    }


    const loanDoc=
      loanSnap.docs[0];


    const loan={
      id:
        loanDoc.id,

      ...loanDoc.data()
    };


    /* =====================
       AUTHORITATIVE TOTAL
    ===================== */

    const totalDue=
      Number(
        loan.totalAmount
      );


    if(
      !Number.isFinite(totalDue)||
      totalDue<=0
    ){

      return res
        .status(500)
        .json({
          error:
            "The active loan has an invalid total amount."
        });
    }


    /*
      The amount shown by the user is
      no longer trusted as the source
      of truth.

      We use Firestore's loan.totalAmount.
    */

    const amount=
      totalDue;


    /* =====================
       PAYMENT METHOD
    ===================== */

    const method=
      clean(
        body.paymentMethod
      );


    if(
      ![
        "GCash",
        "Hands-On"
      ].includes(method)
    ){

      return res
        .status(400)
        .json({
          error:
            "Choose GCash or Hands-On."
        });
    }


    /* =====================
       PREVENT DUPLICATE
    ===================== */

    const pending=
      await db
        .collection(
          "payApplications"
        )
        .where(
          "uid",
          "==",
          user.uid
        )
        .where(
          "status",
          "==",
          "Pending"
        )
        .limit(1)
        .get();


    if(!pending.empty){

      return res
        .status(409)
        .json({
          error:
            "You already have a payment waiting for admin verification."
        });
    }


    /* =====================
       PAYMENT PROOF
    ===================== */

    let proofUrl="";
    let proofFileId="";
    let proofFileName="";


    if(method==="GCash"){

      const dataUrl=
        clean(
          body.proofDataUrl
        );


      if(
        !dataUrl.startsWith(
          "data:image/"
        )
      ){

        return res
          .status(400)
          .json({
            error:
              "GCash payment requires a proof screenshot."
          });
      }


      const match=
        dataUrl.match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );


      if(!match){

        return res
          .status(400)
          .json({
            error:
              "Invalid payment proof image."
          });
      }


      const buffer=
        Buffer.from(
          match[2],
          "base64"
        );


      if(
        buffer.length>
        1.8*1024*1024
      ){

        return res
          .status(413)
          .json({
            error:
              "Payment proof is too large. Please use an image under 1.8 MB."
          });
      }


      proofFileName=
        clean(
          body.proofFileName
        )||
        "payment-proof.jpg";


      const uploaded=
        await uploadProofToDrive({

          dataUrl:
            dataUrl,

          fileName:
            proofFileName,

          uid:
            user.uid,

          loanId:
            loanDoc.id,

          email:
            user.email||
            loan.email||
            ""

        });


      proofUrl=
        uploaded.url;

      proofFileId=
        uploaded.fileId;

      proofFileName=
        uploaded.fileName;
    }


    /* =====================
       SAVE PAYMENT
    ===================== */

    const pay=
      await db
        .collection(
          "payApplications"
        )
        .add({

          uid:
            user.uid,

          email:
            user.email||
            loan.email||
            "",

          name:
            clean(body.name)||
            loan.name||
            "",

          loanId:
            loanDoc.id,

          reference:
            loanDoc.id,

          /*
            Always store the exact
            Firestore total due.
          */

          amount:
            amount,

          totalAmount:
            totalDue,

          paymentMethod:
            method,

          status:
            "Pending",

          proofUrl:
            proofUrl,

          proofFileId:
            proofFileId,

          proofFileName:
            proofFileName,

          proofStorage:
            "google_drive",

          createdAt:
            FieldValue.serverTimestamp()

        });


    /* =====================
       SUCCESS
    ===================== */

    return res
      .status(201)
      .json({

        success:
          true,

        id:
          pay.id,

        reference:
          loanDoc.id,

        status:
          "Pending",

        amount:
          amount,

        totalAmount:
          totalDue,

        message:
          "Payment submitted. Admin will verify it before marking the loan Paid."

      });


  }catch(e){

    console.error(
      "Pay application error:",
      e
    );


    return res
      .status(500)
      .json({

        error:
          e?.message||
          "Unable to save payment application."

      });
  }
}
