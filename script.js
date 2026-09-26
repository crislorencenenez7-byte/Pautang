const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzbytHL3BGV02ca4nJczLwOs2rA9ur1Ny4z47V_iEOfcl2incLNVMsO3yC2ZL4rEwzi/exec";


// ======================================
// TOTAL PREVIEW
// ======================================

const amountInput =
  document.getElementById("amount");

const totalPreview =
  document.getElementById("totalPreview");


function updateTotal() {

  if (!amountInput || !totalPreview) {
    return;
  }

  const amount =
    Number(amountInput.value) || 0;

  const total =
    amount * 1.20;

  totalPreview.textContent =
    "₱" +
    total.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
}


if (amountInput) {

  amountInput.addEventListener(
    "input",
    updateTotal
  );

  updateTotal();
}


// ======================================
// RELEASE METHOD
// ======================================

const releaseRadios =
  document.querySelectorAll(
    'input[name="releaseMethod"]'
  );


function updateReleaseMethod() {

  const selected =
    document.querySelector(
      'input[name="releaseMethod"]:checked'
    );

  if (!selected) {
    return;
  }

  const gcash =
    document.getElementById(
      "releaseGcash"
    );

  const handsOn =
    document.getElementById(
      "releaseHandsOn"
    );

  if (selected.value === "GCash") {

    if (gcash) {
      gcash.hidden = false;
    }

    if (handsOn) {
      handsOn.hidden = true;
    }

  } else {

    if (gcash) {
      gcash.hidden = true;
    }

    if (handsOn) {
      handsOn.hidden = false;
    }

  }
}


releaseRadios.forEach(
  radio => {

    radio.addEventListener(
      "change",
      updateReleaseMethod
    );

  }
);


updateReleaseMethod();


// ======================================
// APPLY LOAN
// ======================================

const loanForm =
  document.getElementById(
    "loanForm"
  );


if (loanForm) {

  loanForm.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      const message =
        document.getElementById(
          "message"
        );


      const button =
        loanForm.querySelector(
          'button[type="submit"]'
        );


      // ================================
      // GET VALUES
      // ================================

      const name =
        document
          .getElementById("name")
          ?.value
          .trim() || "";


      const amount =
        Number(
          document
            .getElementById("amount")
            ?.value || 0
        );


      const releaseMethod =
        document.querySelector(
          'input[name="releaseMethod"]:checked'
        )?.value || "";


      const gcashName =
        document
          .getElementById(
            "releaseGcashName"
          )
          ?.value
          .trim() || "";


      const gcashNumber =
        document
          .getElementById(
            "releaseGcashNumber"
          )
          ?.value
          .trim() || "";


      const address =
        document
          .getElementById(
            "releaseHandsOnAddress"
          )
          ?.value
          .trim() || "";


      // ================================
      // VALIDATION
      // ================================

      if (!name) {

        showError(
          message,
          "Name is required."
        );

        return;
      }


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        showError(
          message,
          "Enter a valid loan amount."
        );

        return;
      }


      if (!releaseMethod) {

        showError(
          message,
          "Please select GCash or Hands-On."
        );

        return;
      }


      if (
        releaseMethod === "GCash"
      ) {

        if (!gcashName) {

          showError(
            message,
            "GCash Name is required."
          );

          return;
        }


        if (!gcashNumber) {

          showError(
            message,
            "GCash Number is required."
          );

          return;
        }

      }


      if (
        releaseMethod === "Hands-On"
      ) {

        if (!address) {

          showError(
            message,
            "Address is required."
          );

          return;
        }

      }


      // ================================
      // DATA
      // ================================

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
            ? address
            : ""

      };


      console.log(
        "PAUTANG DATA:",
        data
      );


      // ================================
      // DISABLE BUTTON
      // ================================

      if (button) {
        button.disabled = true;
      }


      if (message) {

        message.hidden = true;

        message.className =
          "message";

      }


      // ================================
      // SEND TO GOOGLE SHEETS
      // ================================

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


        // ============================
        // SUCCESS
        // ============================

        if (message) {

          message.textContent =
            "Application recorded successfully! " +
            "20% interest applied. " +
            "Due Date: 15 days from today. " +
            "Status: Unpaid.";

          message.hidden = false;

        }


        loanForm.reset();


        updateReleaseMethod();


        if (totalPreview) {

          totalPreview.textContent =
            "₱0.00";

        }


      } catch (error) {

        console.error(
          "Submit error:",
          error
        );


        showError(
          message,
          "Failed to submit application. Please try again."
        );

      } finally {

        if (button) {
          button.disabled = false;
        }

      }

    }
  );

}


// ======================================
// ERROR
// ======================================

function showError(
  element,
  text
) {

  if (!element) {
    return;
  }

  element.textContent =
    text;

  element.className =
    "message error";

  element.hidden =
    false;

}


// ======================================
// PAY LOAN
// ======================================

const paymentForm =
  document.getElementById(
    "paymentForm"
  );


if (paymentForm) {

  paymentForm.addEventListener(
    "submit",
    function(event) {

      event.preventDefault();


      const message =
        document.getElementById(
          "paymentMessage"
        );


      if (!message) {
        return;
      }


      message.textContent =
        "Payment submitted for admin verification. " +
        "The loan will be marked Paid only after verification.";


      message.className =
        "message";


      message.hidden =
        false;

    }
  );

}
