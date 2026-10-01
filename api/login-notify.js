export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return res.status(503).json({
      success: false,
      message: "Email service is not configured."
    });
  }

  try {
    const { email, name } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "PautangMo login notification",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>PautangMo Login</h2>
            <p>Hello ${escapeHtml(name || "Client")},</p>
            <p>Your PautangMo account was successfully logged in.</p>
            <p>If you did not perform this login, change your password and secure your account.</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend error:", data);
      return res.status(502).json({
        success: false,
        message: "Email provider rejected the request."
      });
    }

    return res.status(200).json({
      success: true,
      id: data.id || null
    });
  } catch (error) {
    console.error("Login notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send login notification."
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
