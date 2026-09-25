// ==========================================
// PAUTANGMO - MAIN SCRIPT
// Google Sheets / Apps Script
// ==========================================

const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzbytHL3BGV02ca4nJczLwOs2rA9ur1Ny4z47V_iEOfcl2incLNVMsO3yC2ZL4rEwzi/exec";


// ==========================================
// HELPER
// ==========================================

function showMessage(element, text, error = false) {
  if (!element) return;

  element.textContent = text;
  element.hidden = false;
  element.className = error
    ? "message error"
    : "message";
}


// ==========================================
// LOAN TOTAL PREVIEW
// 20% INTEREST
// ==========================================

const amountInput =
  document.getElementById("amount");

const totalPreview =
  document.getElementById("totalPreview");

function updateLoanTotal() {
  if (!amountInput || !totalPreview) return;

  const amount =
    Number(amountInput.value) || 0;

  const total =
    amount * 1.20;

  totalPreview.textContent =
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) +
    " × 1.20 = ₱" +
    total.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
}

if (amountInput) {
  amountInput.addEventListener(
    "input",
    updateLoanTotal
  );

  updateLoanTotal();
}


// ==========================================
// GCash / HANDS-ON SWITCH
// ==========================================

function setupMethod(
  radioName,
  gcashContainerId,
  handsOnContainerId
) {
  const radios =
    document.querySelectorAll(
      `input[name="${radioName}"]`
    );

  if (!radios.length) return;

  function update() {
    const selected =
      document.querySelector(
        `input[name="${radioName}"]:checked`
      );

    const gcash =
      document.getElementById(
        gcashContainerId
      );

    const handsOn =
      document.getElementById(
        handsOnContainerId
      );

    if (!selected) return;

    const isGCash =
      selected.value === "GCash";

    if (gcash) {
      gcash.hidden = !isGCash;
    }

    if (handsOn) {
      handsOn.hidden = isGCash;
    }
  }

  radios.forEach((radio) => {
    radio.addEventListener(
      "change",
      update
    );
  });

  update();
}

setupMethod(
  "releaseMethod",
  "releaseGcash",
  "releaseHandsOn"
);

setupMethod(
  "paymentMethod",
  "paymentGcash",
  "paymentHandsOn"
);


// ==========================================
// APPLY LOAN
// ==========================================

const loanForm =
  document.getElementById("loanForm");

if (loanForm) {

  loanForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      const message =
        document.getElementById(
          "message"
        );

      const button =
        loanForm.querySelector(
          'button[type="submit"]'
        );

      if (button) {
        button.disabled = true;
      }

      if (message) {
        message.hidden = true;
        message.className = "message";
      }


      // ------------------------------
      // GET FORM VALUES
      // ------------------------------

      const name =
        document.getElementById(
          "name"
        )?.value.trim() || "";

      const amount =
        Number(
          document.getElementById(
            "amount"
          )?.value || 0
        );

      const selectedMethod =
        document.querySelector(
          'input[name="releaseMethod"]:checked'
        );

      const releaseMethod =
        selectedMethod
          ? selectedMethod.value
          : "GCash";


      const gcashName =
        document.getElementById(
          "releaseGcashName"
        )?.value.trim() || "";

      const gcashNumber =
        document.getElementById(
          "releaseGcashNumber"
        )?.value.trim() || "";

      const handsOnAddress =
        document.getElementById(
          "releaseHandsOnAddress"
        )?.value.trim() || "";


      // ------------------------------
      // VALIDATION
      // ------------------------------

      if (!name) {
        showMessage(
          message,
          "Name is required.",
          true
        );

        if (button) button.disabled = false;
        return;
      }


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        showMessage(
          message,
          "Enter a valid loan amount.",
          true
        );

        if (button) button.disabled = false;
        return;
      }


      if (
        releaseMethod === "GCash"
      ) {

        if (
          !gcashName ||
          !gcashNumber
        ) {
          showMessage(
            message,
            "GCash Name and GCash Number are required.",
            true
          );

          if (button) button.disabled = false;
          return;
        }
      }


      if (
        releaseMethod === "Hands-On"
      ) {

        if (!handsOnAddress) {
          showMessage(
            message,
            "Address is required for Hands-On.",
            true
          );

          if (button) button.disabled = false;
          return;
        }
      }


      // ------------------------------
      // DATA SENT TO APPS SCRIPT
      // ------------------------------

      const data = {

        name: name,

        amount: amount,

        releaseMethod:
          releaseMethod,

        releaseGcashName:
          releaseMethod === "GCash"
            ? gcashName
            : "",

        releaseGcashNumber:
          releaseMethod === "GCash"
            ? gcashNumber
            : "",

        releaseHandsOnAddress:
          releaseMethod === "Hands-On"
            ? handsOnAddress
            : ""
      };


      console.log(
        "Sending loan application:",
        data
      );


      // ------------------------------
      // SEND TO GOOGLE APPS SCRIPT
      // ------------------------------

      try {

        await fetch(
          GOOGLE_SHEET_URL,
          {
            method: "POST",

            mode: "no-cors",

            headers: {
              "Content-Type":
                "text/plain;charset=utf-8"
            },

            body:
              JSON.stringify(data)
          }
        );


        // --------------------------
        // SUCCESS
        // --------------------------

        showMessage(
          message,
          "Application recorded successfully! Due Date is 15 days from today. Status: Unpaid."
        );


        loanForm.reset();


        if (totalPreview) {
          totalPreview.textContent =
            "₱0.00 × 1.20 = ₱0.00";
        }


      } catch (error) {

        console.error(
          "Google Apps Script error:",
          error
        );

        showMessage(
          message,
          "Failed to submit application. Please try again.",
          true
        );

      } finally {

        if (button) {
          button.disabled = false;
        }

      }
    }
  );
}


// ==========================================
// PAY LOAN
// ==========================================

const paymentForm =
  document.getElementById(
    "paymentForm"
  );

if (paymentForm) {

  paymentForm.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();

      const message =
        document.getElementById(
          "paymentMessage"
        );

      showMessage(
        message,
        "Payment submitted for admin verification. The loan will only be marked Paid after verification."
      );
    }
  );
}
