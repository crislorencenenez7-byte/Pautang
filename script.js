const form = document.getElementById("loanForm");
const message = document.getElementById("message");

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
    const response = await fetch("/api/apply", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Application failed.");

    message.textContent =
      `Application recorded. Due Date: ${result.due_date}. Status: Unpaid`;
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
