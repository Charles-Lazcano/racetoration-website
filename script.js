// TODO: replace with your real Web3Forms access key from https://web3forms.com
const WEB3FORMS_ACCESS_KEY = "YOUR_ACCESS_KEY_HERE";

document.getElementById("year").textContent = new Date().getFullYear();

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

if (isIOS) {
  document.querySelectorAll(".map-link").forEach((link) => {
    link.href = "https://maps.apple.com/?address=7224+Eckhert+Rd%2C+San+Antonio%2C+TX+78238";
  });
}

const baGrid = document.querySelector(".ba-grid");
const baDots = document.querySelectorAll(".ba-dot");

if (baGrid && baDots.length) {
  const baCards = Array.from(baGrid.querySelectorAll(".ba-card"));
  const dotObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = baCards.indexOf(entry.target);
          baDots.forEach((dot, i) => dot.classList.toggle("active", i === index));
        }
      });
    },
    { root: baGrid, threshold: 0.6 }
  );
  baCards.forEach((card) => dotObserver.observe(card));
}

const form = document.getElementById("appointment-form");
const submitBtn = document.getElementById("submit-btn");
const successEl = document.getElementById("form-success");
const errorEl = document.getElementById("form-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.hidden = true;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Sending...";

  const formData = new FormData(form);
  formData.append("access_key", WEB3FORMS_ACCESS_KEY);
  formData.append("subject", "New Appointment Request — Racetoration");

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
    const result = await response.json();

    if (result.success) {
      form.hidden = true;
      successEl.hidden = false;
    } else {
      throw new Error(result.message || "Submission failed");
    }
  } catch (err) {
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
