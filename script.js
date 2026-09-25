const CFG = window.PAUTANG_CONFIG || {};
const GOOGLE_SHEET_URL = CFG.GOOGLE_SHEET_URL || "https://script.google.com/macros/s/AKfycbzbytHL3BGV02ca4nJczLwOs2rA9ur1Ny4z47V_iEOfcl2incLNVMsO3yC2ZL4rEwzi/exec";

const amountEl = document.getElementById("amount");
const totalPreview = document.getElementById("totalPreview");

if (amountEl && totalPreview) {
  const update = () => {
    const a = Number(amountEl.value) || 0;
    totalPreview.textContent = "₱" + a.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " × 1.20 = ₱" + (a * 1.2).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  amountEl.addEventListener("input", update);
  update();
}

function setupMethodRadios(name, gcashId, handsOnId) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
    radio.addEventListener("change", () => {
      const isGCash = radio.checked && radio.value === "GCash";
      const gcash = document.getElementById(gcashId);
      const handsOn = document.getElementById(handsOnId);
      if (gcash) gcash.hidden = !isGCash;
      if (handsOn) handsOn.hidden = isGCash;
    });
  });
}

setupMethodRadios("releaseMethod", "releaseGcash", "releaseHandsOn");
setupMethodRadios("paymentMethod", "paymentGcash", "paymentHandsOn");

const loanForm = document.getElementById("loanForm");

if (loanForm) {
  loanForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("message");
    const button = loanForm.querySelector('button[type="submit"]');

    if (!GOOGLE_SHEET_URL) {
      message.textContent = "Google Sheets Web App URL is not configured.";
      message.className = "message error";
      message.hidden = false;
      return;
    }

    const method = document.querySelector('input[name="releaseMethod"]:checked')?.value || "GCash";

    const data = {
      name: document.getElementById("name")?.value.trim() || "",
      amount: Number(document.getElementById("amount")?.value || 0),
      releaseMethod: method,
      releaseGcashName: document.getElementById("releaseGcashName")?.value.trim() || "",
      releaseGcashNumber: document.getElementById("releaseGcashNumber")?.value.trim() || "",
      releaseHandsOnAddress: document.getElementById("releaseHandsOnAddress")?.value.trim() || ""
    };

    if (!data.name) {
      message.textContent = "Name is required.";
      message.className = "message error";
      message.hidden = false;
      return;
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      message.textContent = "Enter a valid loan amount.";
      message.className = "message error";
      message.hidden = false;
      return;
    }

    if (method === "GCash" && (!data.releaseGcashName || !data.releaseGcashNumber)) {
      message.textContent = "GCash Name and GCash Number are required.";
      message.className = "message error";
      message.hidden = false;
      return;
    }

    if (method === "Hands-On" && !data.releaseHandsOnAddress) {
      message.textContent = "Hands-On Address is required.";
      message.className = "message error";
      message.hidden = false;
      return;
    }

    button.disabled = true;
    message.hidden = true;
    message.className = "message";

    try {
      const response = await fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Application failed.");
      }

      message.textContent = "Application recorded successfully. Due Date: 15 days from today. Status: Unpaid";
      message.hidden = false;
      loanForm.reset();

      if (totalPreview) {
        totalPreview.textContent = "₱0.00";
      }
    } catch (error) {
      message.textContent = error.message || "Unable to submit application.";
      message.className = "message error";
      message.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}

const paymentForm = document.getElementById("paymentForm");

if (paymentForm) {
  const info = document.getElementById("gcashInfo");
  if (info && CFG.GCASH_NAME && CFG.GCASH_NUMBER) {
    info.textContent = `${CFG.GCASH_NAME} • ${CFG.GCASH_NUMBER}`;
  }

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = document.getElementById("paymentMessage");
    message.textContent = "Payment submitted for admin verification. The status should become Paid only after the admin verifies the payment.";
    message.hidden = false;
  });
}
