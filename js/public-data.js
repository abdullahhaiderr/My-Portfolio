// Supabase-powered public content.
// Keeps the existing public page classes/markup language intact.

(function () {
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function categoryLabel(value) {
    const map = { web: "Web Design", brand: "Branding", ecommerce: "E-Commerce" };
    return map[value] || value || "Project";
  }

  function projectCard(project, index, fullPage) {
    const delay = (index % 3) * 100;
    const aos = fullPage
      ? ` data-aos="fade-up"${delay ? ` data-aos-delay="${delay}"` : ""}`
      : ` class="portfolio-item reveal stagger-${Math.min((index % 6) + 1, 6)}" data-category="${esc(project.category)}"`;

    const open = project.project_url
      ? `href="${esc(project.project_url)}" target="_blank" rel="noopener"`
      : 'href="#"';

    if (fullPage) {
      return `
        <div class="portfolio-item" data-category="${esc(project.category)}"${aos}>
          <div class="portfolio-image">
            <img src="${esc(project.image_url || "images/creative_poprtfolio.png")}" alt="${esc(project.title)}">
          </div>
          <div class="portfolio-overlay">
            <span class="portfolio-category">${esc(categoryLabel(project.category))}</span>
            <h3 class="portfolio-title">${esc(project.title)}</h3>
            <p class="portfolio-desc">${esc(project.description || "")}</p>
            <a ${open} class="portfolio-link">View Project <i class="fas fa-arrow-right"></i></a>
          </div>
        </div>`;
    }

    return `
      <div ${aos}>
        <div class="portfolio-image">
          <img src="${esc(project.image_url || "images/creative_poprtfolio.png")}" alt="${esc(project.title)}">
        </div>
        <div class="portfolio-overlay">
          <span class="portfolio-category">${esc(categoryLabel(project.category))}</span>
          <h3 class="portfolio-title">${esc(project.title)}</h3>
          <p class="portfolio-desc">${esc(project.description || "")}</p>
          <a ${open} class="portfolio-link">View Project <i class="fas fa-arrow-right"></i></a>
        </div>
      </div>`;
  }

  function bindDynamicPortfolioFiltering() {
    const buttons = document.querySelectorAll(".portfolio-filter .filter-btn");
    buttons.forEach((btn) => {
      if (btn.dataset.dynamicBound === "true") return;
      btn.dataset.dynamicBound = "true";
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter || "all";
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".portfolio-item[data-category]").forEach((item) => {
          const show = filter === "all" || item.dataset.category === filter;
          item.style.display = show ? "block" : "none";
          if (show) {
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
          }
        });
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

  function refreshAnimations() {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
    if (window.AOS && typeof window.AOS.refreshHard === "function") window.AOS.refreshHard();
  }

  async function hydrateProjects(client) {
    const homeGrid = document.querySelector(".portfolio-grid");
    const pageGrid = document.querySelector(".portfolio-page-grid");
    if (!homeGrid && !pageGrid) return;

    const { data, error } = await client
      .from("projects")
      .select("id,title,description,category,image_url,project_url,sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return;

    if (homeGrid) {
      homeGrid.innerHTML = data.slice(0, 6).map((p, i) => projectCard(p, i, false)).join("");
    }
    if (pageGrid) {
      pageGrid.innerHTML = data.map((p, i) => projectCard(p, i, true)).join("");
    }
    bindDynamicPortfolioFiltering();
    bindPortfolioHover();
    refreshAnimations();
  }

  async function hydrateProfile(client) {
    const { data, error } = await client
      .from("profiles")
      .select("name,role_title,bio,email,phone,whatsapp,linkedin_url,avatar_url")
      .limit(1)
      .maybeSingle();

    if (error || !data) return;

    document.querySelectorAll(".logo-text").forEach((el) => { if (data.name) el.textContent = data.name; });
    document.querySelectorAll(".footer-brand .logo span:last-child").forEach((el) => { if (data.name) el.textContent = data.name; });

    const aboutHeading = document.querySelector(".about-content h3");
    if (aboutHeading && data.role_title) aboutHeading.textContent = data.role_title;

    const aboutBio = document.querySelector(".about-content > p");
    if (aboutBio && data.bio) aboutBio.textContent = data.bio;

    if (data.avatar_url) {
      const heroImg = document.querySelector(".hero-image-main img");
      const aboutImg = document.querySelector(".about-image-wrapper img");
      if (heroImg) heroImg.src = data.avatar_url;
      if (aboutImg) aboutImg.src = data.avatar_url;
    }

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
  }

  async function hydrateCertifications(client) {
    const section = document.getElementById("certificationsSection");
    const grid = document.getElementById("certificationsGrid");
    if (!section || !grid) return;

    const { data, error } = await client
      .from("certifications")
      .select("title,issuer,issue_date,credential_url,image_url,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return;

    grid.innerHTML = data.map((cert, i) => `
      <div class="edu-card" data-aos="fade-up"${i ? ` data-aos-delay="${Math.min(i * 100, 400)}"` : ""}>
        <div class="edu-icon" style="background: rgba(99,102,241,0.1); color: var(--primary);">
          <i class="fas fa-certificate"></i>
        </div>
        <h3>${esc(cert.title)}</h3>
        <p class="edu-school" style="color: var(--primary);">${esc(cert.issuer || "")}</p>
        <p class="edu-desc">${esc(cert.issue_date || "")}${cert.credential_url ? ` · <a href="${esc(cert.credential_url)}" target="_blank" rel="noopener" style="color: var(--primary);">View credential</a>` : ""}</p>
      </div>
    `).join("");
    section.style.display = "";
    refreshAnimations();
  }

  async function bindContactForm(client) {
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

      const payload = {
        name: [first, last].filter(Boolean).join(" "),
        email,
        message: [subject ? `Subject: ${subject}` : "", budget ? `Budget: ${budget}` : "", phone ? `Phone: ${phone}` : "", message].filter(Boolean).join("\n\n")
      };

      const { error } = await client.from("messages").insert(payload);
      if (error) {
        console.error("Contact form insert failed:", error);
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Try Again';
        btn.disabled = false;
        setTimeout(() => { btn.innerHTML = original; }, 2500);
        return;
      }

      btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
      btn.style.background = "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
      form.reset();
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = "";
        btn.disabled = false;
      }, 3000);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const client = window.getCreativeHaiderSupabase && window.getCreativeHaiderSupabase();
    if (!client) {
      bindDynamicPortfolioFiltering();
      bindPortfolioHover();
      return;
    }

    await Promise.allSettled([
      hydrateProjects(client),
      hydrateProfile(client),
      hydrateCertifications(client)
    ]);
    await bindContactForm(client);
  });
})();
