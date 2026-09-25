const CFG = window.PAUTANG_CONFIG || {};
const form = document.getElementById("loanForm");
const paymentForm = document.getElementById("paymentForm");

const money = n => `₱${Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2})}`;

function setMessage(el, text, error=false) {
  el.textContent = text;
  el.className = "message" + (error ? " error" : "");
  el.hidden = false;
}

function selected(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function toggleMethods(groupName, gcashId, handsId) {
  const value = selected(groupName);
  document.getElementById(gcashId)?.classList.toggle("hidden", value !== "GCash");
  document.getElementById(handsId)?.classList.toggle("hidden", value !== "Hands-On");
}

function updateTotal() {
  const amount = Number(document.getElementById("amount")?.value || 0);
  document.getElementById("totalPreview").textContent = money(amount * 1.20);
}

document.querySelectorAll('input[name="releaseMethod"]').forEach(x => x.addEventListener("change", () => toggleMethods("releaseMethod","releaseGcash","releaseHandsOn")));
document.querySelectorAll('input[name="paymentMethod"]').forEach(x => x.addEventListener("change", () => toggleMethods("paymentMethod","paymentGcash","paymentHandsOn")));
document.getElementById("amount")?.addEventListener("input", updateTotal);

document.getElementById("gcashName").textContent = CFG.GCASH_NAME || "GCash account";
document.getElementById("gcashNumber").textContent = CFG.GCASH_NUMBER || "09XXXXXXXXX";
if (CFG.GCASH_QR_URL) {
  document.getElementById("gcashQr").innerHTML = `<img src="${CFG.GCASH_QR_URL}" alt="GCash QR code">`;
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button");
  const message = document.getElementById("message");
  button.disabled = true; message.hidden = true;

  const amount = Number(document.getElementById("amount").value);
  const releaseMethod = selected("releaseMethod");
  const data = {
    action: "apply",
    name: document.getElementById("name").value.trim(),
    amount,
    releaseMethod,
    releaseGcashName: document.getElementById("releaseGcashName").value.trim(),
    releaseGcashNumber: document.getElementById("releaseGcashNumber").value.trim()
  };

  try {
    if (!data.name || !Number.isFinite(amount) || amount <= 0) throw new Error("Please enter a valid name and loan amount.");
    if (releaseMethod === "GCash" && (!data.releaseGcashName || !data.releaseGcashNumber)) throw new Error("Enter the GCash name and number for the release.");
    const response = await fetch(CFG.GOOGLE_SHEET_URL, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(data)});
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Application failed.");
    setMessage(message, `Application recorded. Total to repay: ${money(amount*1.20)}. Due date: ${result.due_date || "15 days from today"}. Status: Unpaid`);
    form.reset(); document.getElementById("totalPreview").textContent = money(0);
    toggleMethods("releaseMethod","releaseGcash","releaseHandsOn");
  } catch (err) { setMessage(message, err.message || "Unable to submit application.", true); }
  finally { button.disabled = false; }
});

paymentForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const button = paymentForm.querySelector("button");
  const message = document.getElementById("paymentMessage");
  button.disabled = true; message.hidden = true;

  try {
    const method = selected("paymentMethod");
    const file = document.getElementById("proof").files[0];
    if (method === "GCash" && !file) throw new Error("Upload your GCash payment screenshot.");
    let proof = null;
    if (file) {
      if (file.size > 2 * 1024 * 1024) throw new Error("Proof image must be 2 MB or smaller.");
      proof = {name:file.name, type:file.type, data:await readAsDataURL(file)};
    }
    const data = {
      action:"payment",
      name:document.getElementById("payName").value.trim(),
      amount:Number(document.getElementById("payAmount").value),
      paymentMethod:method,
      proof
    };
    if (!data.name || !Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Enter a valid borrower name and payment amount.");
    const response = await fetch(CFG.GOOGLE_SHEET_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(data)});
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Payment submission failed.");
    setMessage(message, method === "GCash" ? "Payment proof submitted for admin verification. The loan remains Unpaid until verified." : "Hands-On payment submitted for admin confirmation. The loan remains Unpaid until verified.");
    paymentForm.reset(); toggleMethods("paymentMethod","paymentGcash","paymentHandsOn");
  } catch(err) { setMessage(message, err.message || "Unable to submit payment.", true); }
  finally { button.disabled = false; }
});

function readAsDataURL(file) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Unable to read proof image."));reader.readAsDataURL(file);});
}

document.getElementById("year").textContent = new Date().getFullYear();
toggleMethods("releaseMethod","releaseGcash","releaseHandsOn");
toggleMethods("paymentMethod","paymentGcash","paymentHandsOn");
updateTotal();
