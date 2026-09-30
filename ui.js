(() => {
  document.documentElement.classList.add("js-ready");

  // Soft reveal animation for cards and sections.
  const targets = document.querySelectorAll(".hero, .panel, .feature-card, .stat, .admin-note, .auth-card, .auth-switch-card");
  targets.forEach((el, i) => {
    el.classList.add("reveal-item");
    el.style.setProperty("--reveal-delay", `${Math.min(i * 70, 350)}ms`);
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal-item").forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll(".reveal-item").forEach(el => el.classList.add("is-visible"));
  }

  // Adds a subtle cursor-following glow on larger screens.
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);
  window.addEventListener("pointermove", e => {
    document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
    document.documentElement.style.setProperty("--my", `${e.clientY}px`);
  }, { passive: true });

  // Mobile navigation for normal pages.
  const nav = document.querySelector(".main-nav");
  const bar = document.querySelector(".topbar");
  if (nav && bar && !bar.querySelector(".mobile-nav-toggle")) {
    const btn = document.createElement("button");
    btn.className = "mobile-nav-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open navigation");
    btn.textContent = "☰";
    bar.insertBefore(btn, nav);
    btn.addEventListener("click", () => {
      nav.classList.toggle("open");
      btn.textContent = nav.classList.contains("open") ? "✕" : "☰";
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
