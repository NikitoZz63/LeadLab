const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const rows = Array.from(document.querySelectorAll(".crm-row"));
let activeRowIndex = 0;

if (rows.length > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.setInterval(() => {
    rows[activeRowIndex].classList.remove("active");
    activeRowIndex = (activeRowIndex + 1) % rows.length;
    rows[activeRowIndex].classList.add("active");
  }, 2600);
}

const funnel = document.querySelector(".funnel");
const funnelBars = Array.from(document.querySelectorAll(".funnel-bar"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let funnelFrame = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateFunnelProgress() {
  funnelFrame = 0;
  if (!funnel) return;

  if (prefersReducedMotion.matches) {
    funnel.style.setProperty("--funnel-progress", "1");
    return;
  }

  const rect = funnel.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const start = viewport * 0.82;
  const end = viewport * 0.22;
  const progress = clamp((start - rect.top) / (start - end), 0, 1);
  funnel.style.setProperty("--funnel-progress", progress.toFixed(3));
  funnel.style.setProperty("--result-glow", `${Math.round(progress * 34)}px`);

  funnelBars.forEach((bar) => {
    const target = Number.parseFloat(getComputedStyle(bar).getPropertyValue("--target-scale")) || 1;
    const scale = 1 - (1 - target) * progress;
    bar.style.setProperty("--bar-width", `${(scale * 100).toFixed(1)}%`);
    bar.style.setProperty("--bar-opacity", (0.56 + 0.44 * progress).toFixed(3));
  });
}

function requestFunnelProgress() {
  if (funnelFrame) return;
  funnelFrame = window.requestAnimationFrame(updateFunnelProgress);
}

if (funnel) {
  updateFunnelProgress();
  window.addEventListener("scroll", requestFunnelProgress, { passive: true });
  window.addEventListener("resize", requestFunnelProgress);
  prefersReducedMotion.addEventListener?.("change", updateFunnelProgress);
}

const briefForm = document.querySelector(".brief-form");
const formStatus = document.querySelector(".form-status");

if (briefForm && formStatus) {
  briefForm.addEventListener("submit", (event) => {
    event.preventDefault();
    formStatus.textContent = "Заявка собрана. Осталось подключить ваш Telegram или CRM.";
  });
}

const proofDialog = document.querySelector(".proof-dialog");
const proofDialogImage = proofDialog?.querySelector("img");
const proofDialogCaption = proofDialog?.querySelector("p");
const proofDialogClose = proofDialog?.querySelector(".proof-dialog-close");

document.querySelectorAll(".proof-open").forEach((button) => {
  button.addEventListener("click", () => {
    if (!proofDialog || !proofDialogImage || !proofDialogCaption) return;

    const image = button.querySelector("img");
    proofDialogImage.src = button.dataset.proofSrc || image?.src || "";
    proofDialogImage.alt = image?.alt || "";
    proofDialogCaption.textContent = button.dataset.proofCaption || "";
    proofDialog.showModal();
  });
});

proofDialogClose?.addEventListener("click", () => proofDialog?.close());

proofDialog?.addEventListener("click", (event) => {
  if (event.target === proofDialog) {
    proofDialog.close();
  }
});
