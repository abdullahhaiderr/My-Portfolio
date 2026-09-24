// Lightweight Supabase REST hydration for the public portfolio.
// Keeps the original static markup as a fallback and preserves existing animations.
(function () {
  const cfg = window.CREATIVE_HAIDER_SUPABASE || {};
  const ready = !!(cfg.url && cfg.anonKey);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  async function rest(path, options = {}) {
    const response = await fetch(cfg.url + "/rest/v1/" + path, {
      ...options,
      headers: {
        apikey: cfg.anonKey,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error("Supabase request failed: " + response.status);
    if (response.status === 204 || options.method === "POST") return null;
    return response.json();
  }

  function categoryLabel(value) {
    const map = { web: "Web Design", brand: "Branding", ecommerce: "E-Commerce" };
    return map[value] || value || "Project";
  }

  function projectCard(project, index, fullPage) {
    const delay = (index % 3) * 100;
    const image = esc(project.image_url || "images/creative_poprtfolio.png");
    const link = project.project_url
      ? `href="${esc(project.project_url)}" target="_blank" rel="noopener"`
      : 'href="/portfolio"';

    if (fullPage) {
      return `
        <div class="portfolio-item reveal" data-category="${esc(project.category)}" data-aos="fade-up"${delay ? ` data-aos-delay="${delay}"` : ""}>
          <div class="portfolio-image">
            <img loading="lazy" decoding="async" src="${image}" alt="${esc(project.title)}">
          </div>
          <div class="portfolio-overlay">
            <span class="portfolio-category">${esc(categoryLabel(project.category))}</span>
            <h3 class="portfolio-title">${esc(project.title)}</h3>
            <p class="portfolio-desc">${esc(project.description || "")}</p>
            <a ${link} class="portfolio-link">View Project <i class="fas fa-arrow-right"></i></a>
          </div>
        </div>`;
    }

    return `
      <div class="portfolio-item reveal stagger-${Math.min((index % 6) + 1, 6)}" data-category="${esc(project.category)}">
        <div class="portfolio-image">
          <img loading="lazy" decoding="async" src="${image}" alt="${esc(project.title)}">
        </div>
        <div class="portfolio-overlay">
          <span class="portfolio-category">${esc(categoryLabel(project.category))}</span>
          <h3 class="portfolio-title">${esc(project.title)}</h3>
          <p class="portfolio-desc">${esc(project.description || "")}</p>
          <a ${link} class="portfolio-link">View Project <i class="fas fa-arrow-right"></i></a>
        </div>
      </div>`;
  }

  function observeDynamicReveals() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".portfolio-item.reveal:not(.visible)").forEach((el) => observer.observe(el));
  }

  function refreshAnimations() {
    observeDynamicReveals();
    if (window.AOS) {
      requestAnimationFrame(() => {
        window.AOS.init({ duration: 800, easing: "ease-out-cubic", once: true, offset: 100 });
        window.AOS.refreshHard();
      });
    }
  }

  function bindDynamicPortfolioFiltering() {
    document.querySelectorAll(".portfolio-filter .filter-btn").forEach((btn) => {
      if (btn.dataset.dynamicBound === "true") return;
      btn.dataset.dynamicBound = "true";
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter || "all";
        document.querySelectorAll(".portfolio-filter .filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".portfolio-item[data-category]").forEach((item) => {
          const show = filter === "all" || item.dataset.category === filter;
          item.style.display = show ? "block" : "none";
        });
        refreshAnimations();
      });
    });
  }

  function bindPortfolioHover() {
    document.querySelectorAll(".portfolio-item").forEach((item) => {
      if (item.dataset.hoverBound === "true") return;
      item.dataset.hoverBound = "true";
      item.addEventListener("mouseenter", function () { this.style.zIndex = "10"; });
      item.addEventListener("mouseleave", function () { this.style.zIndex = ""; });
    });
  }

  async function hydrateProjects() {
    const homeGrid = document.querySelector(".portfolio-grid");
    const pageGrid = document.querySelector(".portfolio-page-grid");
    if (!homeGrid && !pageGrid) return;

    const data = await rest("projects?select=id,title,description,category,image_url,project_url,sort_order,created_at&is_published=eq.true&order=sort_order.asc,created_at.desc");
    if (!Array.isArray(data) || !data.length) return;

    if (homeGrid) homeGrid.innerHTML = data.slice(0, 6).map((p, i) => projectCard(p, i, false)).join("");
    if (pageGrid) pageGrid.innerHTML = data.map((p, i) => projectCard(p, i, true)).join("");

    bindDynamicPortfolioFiltering();
    bindPortfolioHover();
    refreshAnimations();
  }

  async function hydrateProfile() {
    const rows = await rest("profiles?select=name,role_title,bio,email,phone,whatsapp,linkedin_url,hero_image_url,about_image_url,resume_url&limit=1");
    const data = Array.isArray(rows) ? rows[0] : null;
    if (!data) return;

    const aboutHeading = document.querySelector(".about-content h3");
    if (aboutHeading && data.role_title) aboutHeading.textContent = data.role_title;

    const aboutBio = document.querySelector(".about-content > p");
    if (aboutBio && data.bio) aboutBio.textContent = data.bio;

    const heroImg = document.querySelector(".hero-image-main img");
    const aboutImg = document.querySelector(".about-image-wrapper img");
    if (heroImg && data.hero_image_url) heroImg.src = data.hero_image_url;
    if (aboutImg && data.about_image_url) aboutImg.src = data.about_image_url;

    if (data.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        a.href = `mailto:${data.email}`;
        if (a.closest(".contact-item")) a.textContent = data.email;
      });
    }
    if (data.phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.href = `tel:${data.phone.replace(/\s+/g, "")}`;
        if (a.closest(".contact-item")) a.textContent = data.phone;
      });
    }
    if (data.whatsapp) {
      const normalized = data.whatsapp.replace(/\D/g, "");
      document.querySelectorAll('a[href*="wa.me"]').forEach((a) => { a.href = `https://wa.me/${normalized}`; });
    }
    if (data.linkedin_url) {
      const linkedIn = document.querySelector('a[aria-label="LinkedIn"]');
      if (linkedIn) linkedIn.href = data.linkedin_url;
    }

    const resumeBtn = document.getElementById("resumeDownloadBtn");
    if (resumeBtn) {
      const resumeUrl = data.resume_url || "/assets/Abdullah-Haider-Resume.pdf";
      resumeBtn.href = resumeUrl;
      resumeBtn.setAttribute("download", "Abdullah-Haider-Resume.pdf");

      if (resumeBtn.dataset.downloadBound !== "true") {
        resumeBtn.dataset.downloadBound = "true";
        resumeBtn.addEventListener("click", async (event) => {
          event.preventDefault();
          const url = resumeBtn.href;
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Resume download failed");
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "Abdullah-Haider-Resume.pdf";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          } catch (error) {
            console.error("Resume download failed:", error);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "Abdullah-Haider-Resume.pdf";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
          }
        });
      }
    }
  }

  async function hydrateCertifications() {
    const section = document.getElementById("certificationsSection");
    const grid = document.getElementById("certificationsGrid");
    if (!section || !grid) return;

    const data = await rest("certifications?select=title,issuer,issue_date,credential_url,image_url,sort_order,created_at&order=sort_order.asc,created_at.desc");
    if (!Array.isArray(data) || !data.length) return;

    grid.innerHTML = data.map((cert, i) => `
      <div class="edu-card" data-aos="fade-up"${i ? ` data-aos-delay="${Math.min(i * 100, 400)}"` : ""}>
        <div class="edu-icon" style="background: rgba(99,102,241,0.1); color: var(--primary);"><i class="fas fa-certificate"></i></div>
        <h3>${esc(cert.title)}</h3>
        <p class="edu-school" style="color: var(--primary);">${esc(cert.issuer || "")}</p>
        <p class="edu-desc">${esc(cert.issue_date || "")}${cert.credential_url ? ` · <a href="${esc(cert.credential_url)}" target="_blank" rel="noopener" style="color: var(--primary);">View credential</a>` : ""}</p>
      </div>
    `).join("");
    section.style.display = "";
    refreshAnimations();
  }

  function bindContactForm() {
    const form = document.getElementById("contactForm");
    if (!form || form.dataset.supabaseBound === "true") return;
    form.dataset.supabaseBound = "true";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;

      const original = btn.innerHTML;
      const fd = new FormData(form);
      const first = String(fd.get("first_name") || "").trim();
      const last = String(fd.get("last_name") || "").trim();
      const email = String(fd.get("email") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const subject = String(fd.get("subject") || "").trim();
      const budget = String(fd.get("budget") || "").trim();
      const message = String(fd.get("message") || "").trim();

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      try {
        await rest("messages", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            name: [first, last].filter(Boolean).join(" "),
            email,
            message: [subject ? `Subject: ${subject}` : "", budget ? `Budget: ${budget}` : "", phone ? `Phone: ${phone}` : "", message].filter(Boolean).join("\n\n")
          })
        });

        btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
        btn.style.background = "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
        form.reset();
      } catch (error) {
        console.error("Contact form insert failed:", error);
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Try Again';
      } finally {
        setTimeout(() => {
          btn.innerHTML = original;
          btn.style.background = "";
          btn.disabled = false;
        }, 2500);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindDynamicPortfolioFiltering();
    bindPortfolioHover();
    if (!ready) return;

    Promise.allSettled([hydrateProjects(), hydrateProfile(), hydrateCertifications()]);
    bindContactForm();
  });
})();
