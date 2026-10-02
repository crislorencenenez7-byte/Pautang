/*******************************************************
 *  * PAUTANGMO GOOGLE APPS SCRIPT
  *
   * FEATURES:
    * - Record loan to Google Sheets
     * - GCash Name -> Column M
      * - GCash Number -> Column N
       * - Hands-On Address -> Column O
        * - Reference -> Column B
         * - Status -> Column K
          * - Update loan status
           * - Upload payment proof to Google Drive
            * - Drive authorization test
             *******************************************************/


/*
 * =====================================================
  * CONFIGURATION
   * =====================================================
    */


/*
 * Your Google Drive folder for payment proofs.
  */
const PAYMENT_PROOF_FOLDER_ID =
  "1tWIskp0REb-cI2KckNlJC-pbc3Q4iKIx";


/*
 * IMPORTANT:
  *
   * Put your Google Spreadsheet ID here.
    *
     * Example:
      *
       * const SPREADSHEET_ID =
        *   "1ABCDEFxxxxxxxxxxxxxxxxxxxx";
         *
          *
           * If this Apps Script is directly bound to the
            * Google Spreadsheet, you may leave this blank.
             */

const SPREADSHEET_ID = "";


/*
 * =====================================================
  * GET REQUEST
   * =====================================================
    */

function doGet() {

  return jsonOutput_({
    success: true,
    message: "PautangMo API is running."
  });

}


/*
 * =====================================================
  * POST REQUEST
   * =====================================================
    */

function doPost(e) {

  try {

    if (!e || !e.postData || !e.postData.contents) {

      return jsonOutput_({
        success: false,
        message: "Missing POST data."
      });

    }


    const data =
      JSON.parse(
        e.postData.contents
      );


    const action =
      String(
        data.action || ""
      ).trim();


    /*
         * RECORD LOAN
              */

    if (action === "recordLoan") {

      return jsonOutput_(
        recordLoan_(data)
      );

    }


    /*
         * UPDATE LOAN STATUS
              */

    if (action === "updateLoanStatus") {

      return jsonOutput_(
        updateLoanStatus_(data)
      );

    }


    /*
         * UPLOAD PAYMENT PROOF
              */

    if (action === "uploadPaymentProof") {

      return jsonOutput_(
        uploadPaymentProof_(data)
      );

    }


    /*
         * UNKNOWN ACTION
              */

    return jsonOutput_({

      success: false,

      message:
        "Unknown action: " +
        action

    });


  } catch (error) {

    console.error(error);


    return jsonOutput_({

      success: false,

      message:
        error &&
          error.message
          ? error.message
          : String(error)

    });

  }

}


/*
 * =====================================================
  * JSON RESPONSE
   * =====================================================
    */

function jsonOutput_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/*
 * =====================================================
  * GET SPREADSHEET
   * =====================================================
    */

function getSpreadsheet_() {

  /*
     * If SPREADSHEET_ID is provided,
        * open that spreadsheet directly.
           */

  if (
    SPREADSHEET_ID &&
    SPREADSHEET_ID.trim()
  ) {

    return SpreadsheetApp.openById(
      SPREADSHEET_ID.trim()
    );

  }


  /*
     * Otherwise use the spreadsheet
        * this script is bound to.
           */

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();


  if (!spreadsheet) {

    throw new Error(
      "Spreadsheet not found. " +
      "Set SPREADSHEET_ID in Apps Script."
    );

  }


  return spreadsheet;

}


/*
 * =====================================================
  * GET SHEET
   * =====================================================
    */

function getSheet_() {

  const spreadsheet =
    getSpreadsheet_();


  const sheet =
    spreadsheet.getSheets()[0];


  if (!sheet) {

    throw new Error(
      "No sheet was found in the spreadsheet."
    );

  }


  return sheet;

}


/*
 * =====================================================
  * RECORD LOAN
   * =====================================================
    *
     * SHEET COLUMNS:
      *
       * A = Name
        * B = Reference
         * C = Amount
          * D = blank
           * E = Date
            * F = blank
             * G = Total Amount
              * H = blank
               * I = Due Date
                * J = blank
                 * K = Status
                  * L = blank
                   * M = GCash Name
                    * N = GCash Number
                     * O = Address
                      *
                       * =====================================================
                        */

function recordLoan_(data) {

  const sheet =
    getSheet_();


  /*
     * BASIC LOAN DATA
        */

  const name =
    String(
      data.name || ""
    ).trim();


  const reference =
    String(
      data.reference || ""
    ).trim();


  const amount =
    Number(
      data.amount || 0
    );


  const date =
    String(
      data.date || ""
    ).trim();


  const totalAmount =
    Number(
      data.totalAmount || 0
    );


  const dueDate =
    String(
      data.dueDate || ""
    ).trim();


  const status =
    String(
      data.status || "Unpaid"
    ).trim();


  /*
     * GCASH DATA
        *
           * IMPORTANT:
              * These names must match the Vercel API payload.
                 */

  const gcashName =
    String(
      data.releaseGcashName || ""
    ).trim();


  const gcashNumber =
    String(
      data.releaseGcashNumber || ""
    ).trim();


  /*
     * HANDS-ON ADDRESS
        */

  const address =
    String(
      data.address || ""
    ).trim();


  /*
     * REFERENCE IS REQUIRED
        */

  if (!reference) {

    throw new Error(
      "Missing loan reference."
    );

  }


  /*
     * FIND EXISTING REFERENCE
        *
           * Reference is stored in Column B.
              */

  const lastRow =
    sheet.getLastRow();


  if (lastRow > 1) {

    const referenceValues =
      sheet
        .getRange(
          2,
          2,
          lastRow - 1,
          1
        )
        .getValues()
        .flat()
        .map(
          value =>
            String(value).trim()
        );


    const existingIndex =
      referenceValues.indexOf(
        reference
      );


    /*
         * UPDATE EXISTING LOAN
              */

    if (existingIndex !== -1) {

      const row =
        existingIndex + 2;


      sheet
        .getRange(
          row,
          1,
          1,
          15
        )
        .setValues([[
          name,
          reference,
          amount,
          "",
          date,
          "",
          totalAmount,
          "",
          dueDate,
          "",
          status,
          "",
          gcashName,
          gcashNumber,
          address
        ]]);


      return {

        success: true,

        updated: true,

        row: row,

        reference: reference,

        gcashName: gcashName,

        gcashNumber: gcashNumber,

        address: address

      };

    }

  }


  /*
     * CREATE NEW LOAN ROW
        */

  const rowValues = [[

    /*
         * A
              */
    name,

    /*
         * B
              */
    reference,

    /*
         * C
              */
    amount,

    /*
         * D
              */
    "",

    /*
         * E
              */
    date,

    /*
         * F
              */
    "",

    /*
         * G
              */
    totalAmount,

    /*
         * H
              */
    "",

    /*
         * I
              */
    dueDate,

    /*
         * J
              */
    "",

    /*
         * K
              */
    status,

    /*
         * L
              */
    "",

    /*
         * M
              */
    gcashName,

    /*
         * N
              */
    gcashNumber,

    /*
         * O
              */
    address

  ]];


  const newRow =
    sheet.getLastRow() + 1;


  sheet
    .getRange(
      newRow,
      1,
      1,
      15
    )
    .setValues(
      rowValues
    );


  return {

    success: true,

    created: true,

    row: newRow,

    reference: reference,

    gcashName: gcashName,

    gcashNumber: gcashNumber,

    address: address

  };

}


/*
 * =====================================================
  * UPDATE LOAN STATUS
   * =====================================================
    *
     * Used when admin approves/rejects payment.
      *
       * K = Status
        * P = Payment Reference
         *
          * =====================================================
           */

function updateLoanStatus_(data) {

  const sheet =
    getSheet_();


  const reference =
    String(
      data.reference ||
      data.loanId ||
      ""
    ).trim();


  const status =
    String(
      data.status || ""
    ).trim();


  const paymentId =
    String(
      data.paymentId || ""
    ).trim();


  if (!reference) {

    throw new Error(
      "Missing loan reference."
    );

  }


  if (!status) {

    throw new Error(
      "Missing loan status."
    );

  }


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    throw new Error(
      "No loan records found."
    );

  }


  /*
     * Reference column = B
        */

  const references =
    sheet
      .getRange(
        2,
        2,
        lastRow - 1,
        1
      )
      .getValues()
      .flat()
      .map(
        value =>
          String(value).trim()
      );


  const index =
    references.indexOf(
      reference
    );


  if (index === -1) {

    throw new Error(
      "Loan reference not found: " +
      reference
    );

  }


  const row =
    index + 2;


  /*
     * K = Status
        */

  sheet
    .getRange(
      row,
      11
    )
    .setValue(
      status
    );


  /*
     * P = Payment Reference
        */

  if (paymentId) {

    sheet
      .getRange(
        1,
        16
      )
      .setValue(
        "Payment Reference"
      );


    sheet
      .getRange(
        row,
        16
      )
      .setValue(
        paymentId
      );

  }


  return {

    success: true,

    reference: reference,

    status: status,

    paymentId: paymentId,

    row: row

  };

}


/*
 * =====================================================
  * UPLOAD PAYMENT PROOF
   * =====================================================
    *
     * Receives a base64 data URL from Vercel.
      *
       * Saves the file to Google Drive.
        *
         * Filename:
          *
           *     LOAN_REFERENCE.jpg
            *
             * =====================================================
              */

function uploadPaymentProof_(data) {

  const dataUrl =
    String(
      data.dataUrl || ""
    ).trim();


  const reference =
    String(
      data.loanId ||
      data.reference ||
      ""
    ).trim();


  if (!dataUrl) {

    throw new Error(
      "Missing payment proof data."
    );

  }


  if (!reference) {

    throw new Error(
      "Missing loan reference."
    );

  }


  /*
     * Protect Apps Script from very large uploads.
        *
           * Approximately 1.9 MB.
              */

  if (
    dataUrl.length >
    1900000
  ) {

    throw new Error(
      "Payment proof is too large. " +
      "Please upload an image smaller than 1.9 MB."
    );

  }


  /*
     * Expected:
        *
           * data:image/jpeg;base64,.....
              */

  const commaIndex =
    dataUrl.indexOf(",");


  if (commaIndex === -1) {

    throw new Error(
      "Invalid payment proof format."
    );

  }


  const header =
    dataUrl.substring(
      0,
      commaIndex
    );


  const base64 =
    dataUrl.substring(
      commaIndex + 1
    );


  /*
     * Detect MIME type.
        */

  let mimeType =
    MimeType.JPEG;


  if (
    header.includes(
      "image/png"
    )
  ) {

    mimeType =
      MimeType.PNG;

  }


  if (
    header.includes(
      "image/webp"
    )
  ) {

    mimeType =
      MimeType.WEBP;

  }


  /*
     * Decode file.
        */

  const bytes =
    Utilities.base64Decode(
      base64
    );


  /*
     * Get Drive folder.
        */

  const folder =
    DriveApp.getFolderById(
      PAYMENT_PROOF_FOLDER_ID
    );


  /*
     * Use the loan reference as
        * the payment proof filename.
           */

  let extension =
    "jpg";


  if (
    mimeType ===
    MimeType.PNG
  ) {

    extension =
      "png";

  }


  if (
    mimeType ===
    MimeType.WEBP
  ) {

    extension =
      "webp";

  }


  const fileName =
    reference +
    "." +
    extension;


  /*
     * Create Drive file.
        */

  const blob =
    Utilities.newBlob(
      bytes,
      mimeType,
      fileName
    );


  const file =
    folder.createFile(
      blob
    );


  /*
     * Store useful metadata.
        */

  file.setDescription(
    "PautangMo payment proof\n" +
    "Loan Reference: " +
    reference
  );


  /*
     * Allow anyone with the link to view.
        *
           * This allows the admin dashboard
              * to open the proof URL.
                 */

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );


  const fileId =
    file.getId();


  const fileUrl =
    "https://drive.google.com/file/d/" +
    fileId +
    "/view";


  return {

    success: true,

    reference: reference,

    fileId: fileId,

    fileName: fileName,

    url: fileUrl

  };

}


/*
 * =====================================================
  * DRIVE AUTHORIZATION TEST
   * =====================================================
    *
     * Run this function manually ONCE from Apps Script
      * to authorize Drive access.
       * =====================================================
        */

function authorizeDriveWrite() {

  const folder =
    DriveApp.getFolderById(
      PAYMENT_PROOF_FOLDER_ID
    );


  const testFile =
    folder.createFile(
      "PAUTANGMO_AUTH_TEST.txt",
      "Drive authorization successful.",
      MimeType.PLAIN_TEXT
    );


  console.log(
    testFile.getName()
  );


  /*
     * Remove test file after creation.
        */

  testFile.setTrashed(
    true
  );


  return "Drive authorization successful.";

}