const ALLOWED_ORIGINS = new Set([
  "https://racetoration.com",
  "https://www.racetoration.com",
]);

const TO_EMAIL = "clamb9475@gmail.com";
const FROM_EMAIL = "Racetoration Website <forms@racetoration.com>";

const REQUIRED_FIELDS = ["name", "email", "phone", "make", "model", "year"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://racetoration.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(request, body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse(request, { success: false, error: "Invalid request body." }, 400);
  }

  // Honeypot: bots fill in hidden fields. Pretend success so bots don't retry.
  if (data.botcheck) {
    return jsonResponse(request, { success: true }, 200);
  }

  const missing = REQUIRED_FIELDS.filter((field) => !String(data[field] ?? "").trim());
  if (missing.length) {
    return jsonResponse(
      request,
      { success: false, error: `Please fill in: ${missing.join(", ")}.` },
      400
    );
  }

  const name = String(data.name).trim();
  const email = String(data.email).trim();
  const phone = String(data.phone).trim();
  const make = String(data.make).trim();
  const model = String(data.model).trim();
  const year = String(data.year).trim();
  const message = String(data.message ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return jsonResponse(request, { success: false, error: "Please enter a valid email address." }, 400);
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2027) {
    return jsonResponse(request, { success: false, error: "Please enter a valid vehicle year." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse(request, { success: false, error: "Server is not configured to send email." }, 500);
  }

  const textBody = [
    `New quote request from racetoration.com`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Vehicle: ${year} ${make} ${model}`,
    ``,
    `Message:`,
    message || "(none provided)",
  ].join("\n");

  const htmlBody = `
    <h2>New quote request from racetoration.com</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Vehicle:</strong> ${escapeHtml(year)} ${escapeHtml(make)} ${escapeHtml(model)}</p>
    <p><strong>Message:</strong><br>${escapeHtml(message || "(none provided)").replace(/\n/g, "<br>")}</p>
  `;

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `New quote request from ${name} — racetoration.com`,
        text: textBody,
        html: htmlBody,
      }),
    });
  } catch {
    return jsonResponse(request, { success: false, error: "Failed to reach the email service." }, 502);
  }

  if (!resendResponse.ok) {
    return jsonResponse(request, { success: false, error: "Failed to send your request. Please try again." }, 502);
  }

  return jsonResponse(request, { success: true }, 200);
}
