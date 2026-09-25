const form = document.getElementById("loanForm");
const message = document.getElementById("message");

// ILAGAY DITO ANG WEB APP URL MO
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwHs0s9C-vgLEskjs1JPIuSE8nKsYdI7nc98jdzSO4m0LE6qlXwTjsU4OIZkB-wqsPo/exec";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = form.querySelector("button");
  button.disabled = true;
  message.hidden = true;
  message.className = "message";

  const data = {
    name: document.getElementById("name").value.trim(),
    amount: Number(document.getElementById("amount").value)
  };

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

    message.textContent =
      "Application recorded successfully. Due Date is 15 days from today. Status: Unpaid";

    message.hidden = false;
    form.reset();

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";
    message.hidden = false;

  } finally {
    button.disabled = false;
  }
});
