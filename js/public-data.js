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
      signal: AbortSignal.timeout(15000),
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

  function safeUrl(value, fallback = "") {
    try {
      const url = new URL(value, location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
    } catch { return fallback; }
  }

  function optimizedImage(value) {
    const source = value || "/images/creative_poprtfolio.png";
    const key = source.startsWith("images/") ? "/" + source : source;
    return (window.CREATIVE_HAIDER_IMAGES || {})[key] || { src: safeUrl(source, "/images/optimized/creative_poprtfolio-960.webp") };
  }

  function categoryLabel(value) {
    const map = { web: "Web Design", brand: "Branding", ecommerce: "E-Commerce" };
    return map[value] || value || "Project";
  }

  function projectCard(project, index, fullPage) {
    const delay = (index % 3) * 100;
    const asset = optimizedImage(project.image_url);
    const image = esc(asset.src);
    const responsive = asset.srcset ? `srcset="${esc(asset.srcset)}" sizes="(max-width: 768px) calc(100vw - 64px), (max-width: 1170px) calc((100vw - 88px) / 2), 390px" width="${asset.width}" height="${asset.height}"` : "";
    const unavailableDemo = String(project.project_url || "").toLowerCase().includes("therapeutic-mechanics.vercel.app");
    const destination = project.project_url && !unavailableDemo ? safeUrl(project.project_url) : "";
    const label = destination ? "View Live Project" : "View Screenshot";
    const link = destination
      ? `href="${esc(destination)}" target="_blank" rel="noopener noreferrer"`
      : `href="${image}" target="_blank" rel="noopener noreferrer"`;

    if (fullPage) {
      return `
        <div class="portfolio-item reveal" data-category="${esc(project.category)}" data-aos="fade-up"${delay ? ` data-aos-delay="${delay}"` : ""}>
          <div class="portfolio-image">
            <img loading="lazy" decoding="async" src="${image}" ${responsive} alt="${esc(project.title)}">
          </div>
          <div class="portfolio-overlay">
            <span class="portfolio-category">${esc(categoryLabel(project.category))}</span>
            <h3 class="portfolio-title">${esc(project.title)}</h3>
            <p class="portfolio-desc">${esc(project.description || "")}</p>
            <a ${link} class="portfolio-link" aria-label="${esc(label + ": " + project.title)} (opens in a new tab)">${label} <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
          </div>
        </div>`;
    }

    return `
      <div class="portfolio-item reveal stagger-${Math.min((index % 6) + 1, 6)}" data-category="${esc(project.category)}">
        <div class="portfolio-image">
          <img loading="lazy" decoding="async" src="${image}" ${responsive} alt="${esc(project.title)}">
        </div>
        <div class="portfolio-overlay">
          <span class="portfolio-category">${esc(categoryLabel(project.category))}</span>
          <h3 class="portfolio-title">${esc(project.title)}</h3>
          <p class="portfolio-desc">${esc(project.description || "")}</p>
          <a ${link} class="portfolio-link" aria-label="${esc(label + ": " + project.title)} (opens in a new tab)">${label} <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </div>`;
  }

  function refreshAnimations() {
    window.CreativeHaiderUI?.refresh();
  }

  async function hydrateProjects() {
    const homeGrid = document.querySelector(".portfolio-grid");
    const pageGrid = document.querySelector(".portfolio-page-grid");
    if (!homeGrid && !pageGrid) return;

    const data = await rest("projects?select=id,title,description,category,image_url,project_url,sort_order,created_at&is_published=eq.true&order=sort_order.asc,created_at.desc");
    if (!Array.isArray(data)) return;

    if (homeGrid) homeGrid.innerHTML = data.slice(0, 6).map((p, i) => projectCard(p, i, false)).join("");
    if (pageGrid) pageGrid.innerHTML = data.map((p, i) => projectCard(p, i, true)).join("");

    if (!data.length) {
      [homeGrid, pageGrid].filter(Boolean).forEach(grid => { grid.innerHTML = '<p class="portfolio-empty">New projects will appear here when published.</p>'; });
    }
    window.CreativeHaiderUI?.filterProjects();
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
    [[heroImg, data.hero_image_url], [aboutImg, data.about_image_url]].forEach(([image, source]) => {
      if (!image || !source) return;
      const asset = optimizedImage(source);
      if (new URL(image.src).href === safeUrl(asset.src)) return;
      if (asset.srcset) image.srcset = asset.srcset;
      else image.removeAttribute("srcset");
      image.src = asset.src;
    });

    if (data.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        a.href = `mailto:${data.email}`;
        if (a.closest(".contact-item")) a.textContent = data.email;
      });
    }
    if (data.phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.href = `tel:${data.phone.replace(/\s+/g, "")}`;
        const icon = a.querySelector('i');
        a.textContent = data.phone;
        if (icon) a.prepend(icon, " ");
      });
    }
    if (data.whatsapp) {
      const normalized = data.whatsapp.replace(/\D/g, "");
      document.querySelectorAll('a[href*="wa.me"]').forEach((a) => { a.href = `https://wa.me/${normalized}`; });
    }
    if (data.linkedin_url) {
      document.querySelectorAll('a[href*="linkedin.com/"]').forEach(a => {
        a.href = safeUrl(data.linkedin_url, a.href);
      });
    }

    const resumeBtn = document.getElementById("resumeDownloadBtn");
    if (resumeBtn) {
      const resumeUrl = safeUrl(data.resume_url || "/assets/Abdullah-Haider-Resume.pdf", "/assets/Abdullah-Haider-Resume.pdf");
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

    const data = await rest("certifications?select=title,issuer,issue_date,credential_id,credential_url,image_url,sort_order,created_at&order=sort_order.asc,created_at.desc");
    if (!Array.isArray(data) || !data.length) return;

    grid.innerHTML = data.map((cert, i) => `
      <div class="edu-card certification-card" data-aos="fade-up"${i ? ` data-aos-delay="${Math.min(i * 100, 400)}"` : ""}>
        <div class="edu-icon" style="background: rgba(99,102,241,0.1); color: var(--primary);"><i class="fas fa-certificate"></i></div>
        <h3>${esc(cert.title)}</h3>
        <p class="edu-school" style="color: var(--primary);">${esc(cert.issuer || "")}</p>
        <p class="edu-desc cert-meta">${esc(cert.issue_date || "")}</p>
        ${cert.credential_id ? `<p class="cert-id"><span>Credential ID</span><strong>${esc(cert.credential_id)}</strong></p>` : ""}
        ${cert.credential_url ? `<a class="cert-link" href="${esc(safeUrl(cert.credential_url))}" target="_blank" rel="noopener">View credential <i class="fas fa-arrow-up-right-from-square"></i></a>` : ""}
      </div>
    `).join("");
    section.style.display = "";
    refreshAnimations();
  }

  function bindContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    const status = document.getElementById("formStatus");
    const requestedService = new URLSearchParams(location.search).get("service");
    const services = { "sales-closing": "sales", "ui-ux-design": "ui-ux", "web-development": "web-development", "brand-identity": "branding", ecommerce: "ecommerce", "seo-marketing": "seo" };
    if (services[requestedService]) form.elements.subject.value = services[requestedService];
    let submitting = false;
    btn.disabled = !ready;
    if (ready) status.textContent = "Fields marked required must be completed. Your inquiry will be stored for follow-up through the site.";
    if (!ready) { status.textContent = "The form is unavailable. Please use email or WhatsApp below."; return; }
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (submitting || !form.reportValidity()) return;
      const fd = new FormData(form);
      if (String(fd.get("company_website") || "").trim()) {
        status.textContent = "Please leave the website field blank.";
        return;
      }
      const get = name => String(fd.get(name) || "").trim();
      const first = get("first_name"), last = get("last_name"), email = get("email"), message = get("message");
      if (!first || !last || !message) {
        status.textContent = "Please enter your name and a message with details about your project.";
        return;
      }
      const subject = form.elements.subject.selectedOptions[0]?.textContent || get("subject");
      const budget = get("budget"), phone = get("phone");
      submitting = true; btn.disabled = true; form.setAttribute("aria-busy", "true");
      status.dataset.state = "pending";
      status.textContent = "Sending your inquiry…";
      try {
        await rest("messages", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ name: [first, last].join(" "), email,
            message: [subject ? `Subject: ${subject}` : "", budget ? `Budget: ${budget}` : "", phone ? `Phone: ${phone}` : "", message].filter(Boolean).join("\n\n") })
        });
        status.dataset.state = "success";
        status.textContent = "Your inquiry was received. I'll reply using the email address you provided.";
        form.reset();
      } catch (error) {
        status.dataset.state = "error";
        status.textContent = error.name === "TimeoutError"
          ? "We couldn't confirm receipt. Please contact me by email or WhatsApp before trying again."
          : "Your inquiry could not be sent. Your message is still here. Please try again or use email or WhatsApp.";
      } finally {
        submitting = false; btn.disabled = false; form.removeAttribute("aria-busy");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindContactForm();
    if (!ready) return;
    Promise.allSettled([hydrateProjects(), hydrateProfile(), hydrateCertifications()]);
  });
})();
