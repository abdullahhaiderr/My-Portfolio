(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const client = window.getCreativeHaiderSupabase && window.getCreativeHaiderSupabase();

  const state = {
    projects: [],
    certifications: [],
    messages: [],
    reviews: [],
    reviewFilter: "all",
    profile: null,
    media: []
  };

  function toast(message, type = "success") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.className = "toast show" + (type === "error" ? " error" : "");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { el.className = "toast"; }, 2600);
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  async function requireAuth() {
    if (!client) {
      location.replace("/admin/login");
      return null;
    }
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      location.replace("/admin/login");
      return null;
    }
    return session;
  }

  function showView(name) {
    $$(".admin-nav-item[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
    $$(".admin-view").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === name));
    const titles = {
      overview:"Overview", projects:"Projects", profile:"Profile",
      certifications:"Certifications", inbox:"Inbox", reviews:"Reviews", media:"Media"
    };
    $("#viewTitle").textContent = titles[name] || "Dashboard";
  }

  async function loadProjects() {
    const { data, error } = await client.from("projects").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw error;
    state.projects = data || [];
    renderProjects();
  }

  function renderProjects() {
    $("#publishedCount").textContent = state.projects.filter(p => p.is_published).length;
    $("#draftCount").textContent = state.projects.filter(p => p.is_draft).length;

    const wrap = $("#projectsList");
    if (!wrap) return;
    if (!state.projects.length) {
      wrap.innerHTML = '<div class="empty-state">No projects yet. Add your first project.</div>';
      return;
    }

    wrap.innerHTML = state.projects.map((p, i) => `
      <div class="resource-row" draggable="true" data-project-id="${esc(p.id)}" data-index="${i}">
        <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
        <img class="resource-thumb" src="${esc(p.image_url || "/images/creative_poprtfolio.png")}" alt="">
        <div class="resource-meta">
          <strong>${esc(p.title)}</strong>
          <small>${esc(p.category || "Uncategorized")}</small>
          <div style="margin-top:7px">
            ${p.is_published ? '<span class="status-pill status-published">Published</span>' : ''}
            ${p.is_draft ? '<span class="status-pill status-draft">Draft</span>' : ''}
          </div>
        </div>
        <div class="resource-actions">
          <button class="mini-btn" data-edit-project="${esc(p.id)}"><i class="fas fa-pen"></i> Edit</button>
          <button class="mini-btn danger" data-delete-project="${esc(p.id)}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `).join("");

    bindProjectRows();
  }

  function bindProjectRows() {
    $$("[data-edit-project]").forEach(btn => btn.onclick = () => openProject(btn.dataset.editProject));
    $$("[data-delete-project]").forEach(btn => btn.onclick = () => deleteProject(btn.dataset.deleteProject));

    let dragId = null;
    $$(".resource-row[data-project-id]").forEach(row => {
      row.addEventListener("dragstart", () => { dragId = row.dataset.projectId; row.style.opacity = ".5"; });
      row.addEventListener("dragend", () => { row.style.opacity = ""; dragId = null; });
      row.addEventListener("dragover", e => e.preventDefault());
      row.addEventListener("drop", async e => {
        e.preventDefault();
        const targetId = row.dataset.projectId;
        if (!dragId || dragId === targetId) return;
        const from = state.projects.findIndex(p => String(p.id) === String(dragId));
        const to = state.projects.findIndex(p => String(p.id) === String(targetId));
        const [moved] = state.projects.splice(from, 1);
        state.projects.splice(to, 0, moved);
        state.projects.forEach((p, idx) => p.sort_order = idx);
        renderProjects();
        const updates = state.projects.map((p, idx) => client.from("projects").update({ sort_order: idx }).eq("id", p.id));
        const results = await Promise.all(updates);
        if (results.some(r => r.error)) toast("Could not save project order", "error");
        else toast("Project order updated");
      });
    });
  }

  function openProject(id = "") {
    const form = $("#projectForm");
    form.reset();
    form.elements.id.value = "";
    $("#projectDialogTitle").textContent = id ? "Edit project" : "Add project";

    if (id) {
      const p = state.projects.find(x => String(x.id) === String(id));
      if (!p) return;
      form.elements.id.value = p.id;
      form.elements.title.value = p.title || "";
      form.elements.description.value = p.description || "";
      form.elements.category.value = p.category || "web";
      form.elements.project_url.value = p.project_url || "";
      form.elements.image_url.value = p.image_url || "";
      form.elements.is_published.checked = !!p.is_published;
      form.elements.is_draft.checked = !!p.is_draft;
    }
    $("#projectImageFile").value = "";
    $("#projectDialog").showModal();
  }

  async function deleteProject(id) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    const { error } = await client.from("projects").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    state.projects = state.projects.filter(p => String(p.id) !== String(id));
    renderProjects();
    toast("Project deleted");
  }

  async function uploadFile(file, folder = "uploads") {
    if (!file) return "";
    const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
    const { error } = await client.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = client.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProject(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.innerHTML : "";
    const fd = new FormData(form);
    const id = String(fd.get("id") || "");
    let imageUrl = String(fd.get("image_url") || "").trim();
    const file = $("#projectImageFile").files[0];

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
    }

    try {
      if (file) imageUrl = await uploadFile(file, "projects");

      const payload = {
        title: String(fd.get("title") || "").trim(),
        description: String(fd.get("description") || "").trim(),
        category: String(fd.get("category") || "web"),
        project_url: String(fd.get("project_url") || "").trim() || null,
        image_url: imageUrl || null,
        is_published: fd.get("is_published") === "on",
        is_draft: fd.get("is_draft") === "on"
      };
      if (!id) payload.sort_order = state.projects.length;

      const query = id
        ? client.from("projects").update(payload).eq("id", id).select().single()
        : client.from("projects").insert(payload).select().single();

      const { error } = await query;
      if (error) throw error;

      $("#projectDialog").close();
      await loadProjects();
      toast(id ? "Project updated" : "Project saved successfully");
    } catch (err) {
      console.error("Project save failed:", err);
      toast(err?.message || "Could not save project", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    }
  }

  async function loadProfile() {
    const { data, error } = await client.from("profiles").select("*").limit(1).maybeSingle();
    if (error) throw error;
    state.profile = data || null;
    const form = $("#profileForm");
    if (!form) return;
    ["name","role_title","bio","email","phone","whatsapp","linkedin_url","hero_image_url","about_image_url","resume_url"].forEach(k => {
      if (form.elements[k]) form.elements[k].value = state.profile?.[k] || "";
    });
    const resumeView = $("#profileResumeView");
    if (resumeView) {
      if (state.profile?.resume_url) {
        resumeView.href = state.profile.resume_url;
        resumeView.hidden = false;
      } else {
        resumeView.hidden = true;
        resumeView.removeAttribute("href");
      }
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.innerHTML : "";
    const fd = new FormData(form);

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
      }

      let heroImage = String(fd.get("hero_image_url") || "").trim();
      let aboutImage = String(fd.get("about_image_url") || "").trim();
      let resumeUrl = String(fd.get("resume_url") || "").trim();

      const heroFile = $("#profileHeroFile")?.files?.[0];
      const aboutFile = $("#profileAboutFile")?.files?.[0];
      const resumeFile = $("#profileResumeFile")?.files?.[0];

      if (heroFile) heroImage = await uploadFile(heroFile, "profile/hero");
      if (aboutFile) aboutImage = await uploadFile(aboutFile, "profile/about");
      if (resumeFile) resumeUrl = await uploadFile(resumeFile, "profile/resume");

      const payload = {
        name:String(fd.get("name")||"").trim(),
        role_title:String(fd.get("role_title")||"").trim(),
        bio:String(fd.get("bio")||"").trim(),
        email:String(fd.get("email")||"").trim(),
        phone:String(fd.get("phone")||"").trim(),
        whatsapp:String(fd.get("whatsapp")||"").trim(),
        linkedin_url:String(fd.get("linkedin_url")||"").trim(),
        hero_image_url:heroImage || null,
        about_image_url:aboutImage || null,
        resume_url:resumeUrl || null,
        updated_at:new Date().toISOString()
      };

      let result;
      if (state.profile?.id) result = await client.from("profiles").update(payload).eq("id", state.profile.id);
      else result = await client.from("profiles").insert(payload);
      if (result.error) throw result.error;

      await loadProfile();
      if ($("#profileHeroFile")) $("#profileHeroFile").value = "";
      if ($("#profileAboutFile")) $("#profileAboutFile").value = "";
      if ($("#profileResumeFile")) $("#profileResumeFile").value = "";
      toast("Profile saved");
    } catch (err) {
      toast(err.message || "Could not save profile", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    }
  }

  async function loadCertifications() {
    const { data, error } = await client.from("certifications").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw error;
    state.certifications = data || [];
    renderCertifications();
  }

  function renderCertifications() {
    const wrap = $("#certificationsList");
    if (!wrap) return;
    if (!state.certifications.length) {
      wrap.innerHTML = '<div class="empty-state">No certifications yet.</div>';
      return;
    }
    wrap.innerHTML = state.certifications.map(c => `
      <div class="resource-row">
        <img class="resource-thumb" src="${esc(c.image_url || "/images/logo.png")}" alt="">
        <div class="resource-meta"><strong>${esc(c.title)}</strong><small>${esc(c.issuer || "")}${c.issue_date ? " · "+esc(c.issue_date) : ""}</small></div>
        <div class="resource-actions">
          <button class="mini-btn" data-edit-cert="${esc(c.id)}"><i class="fas fa-pen"></i> Edit</button>
          <button class="mini-btn danger" data-delete-cert="${esc(c.id)}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `).join("");
    $$("[data-edit-cert]").forEach(btn => btn.onclick = () => openCertification(btn.dataset.editCert));
    $$("[data-delete-cert]").forEach(btn => btn.onclick = () => deleteCertification(btn.dataset.deleteCert));
  }

  function openCertification(id = "") {
    const form = $("#certForm");
    form.reset();
    form.elements.id.value = "";
    $("#certDialogTitle").textContent = id ? "Edit certification" : "Add certification";
    if (id) {
      const c = state.certifications.find(x => String(x.id) === String(id));
      if (!c) return;
      form.elements.id.value = c.id;
      form.elements.title.value = c.title || "";
      form.elements.issuer.value = c.issuer || "";
      form.elements.issue_date.value = c.issue_date || "";
      form.elements.credential_id.value = c.credential_id || "";
      form.elements.credential_url.value = c.credential_url || "";
      form.elements.image_url.value = c.image_url || "";
    }
    $("#certImageFile").value = "";
    $("#certDialog").showModal();
  }

  async function saveCertification(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("id") || "");
    try {
      let imageUrl = String(fd.get("image_url") || "").trim();
      const file = $("#certImageFile").files[0];
      if (file) imageUrl = await uploadFile(file, "certifications");
      const payload = {
        title:String(fd.get("title")||"").trim(),
        issuer:String(fd.get("issuer")||"").trim(),
        issue_date:String(fd.get("issue_date")||"").trim() || null,
        credential_id:String(fd.get("credential_id")||"").trim() || null,
        credential_url:String(fd.get("credential_url")||"").trim() || null,
        image_url:imageUrl || null
      };
      if (!id) payload.sort_order = state.certifications.length;
      const q = id ? client.from("certifications").update(payload).eq("id", id) : client.from("certifications").insert(payload);
      const { error } = await q;
      if (error) throw error;
      $("#certDialog").close();
      await loadCertifications();
      toast(id ? "Certification updated" : "Certification added");
    } catch (err) {
      toast(err.message || "Could not save certification", "error");
    }
  }

  async function deleteCertification(id) {
    if (!confirm("Delete this certification?")) return;
    const { error } = await client.from("certifications").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    await loadCertifications();
    toast("Certification deleted");
  }

  async function loadMessages() {
    const { data, error } = await client.from("messages").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    state.messages = data || [];
    renderMessages();
  }

  function renderMessages() {
    const unread = state.messages.filter(m => !m.is_read).length;
    $("#unreadCount").textContent = unread;
    $("#sidebarUnread").textContent = unread;
    $("#sidebarUnread").hidden = unread === 0;

    const recent = $("#recentMessages");
    recent.innerHTML = state.messages.slice(0,5).map(m => `
      <div class="message-row ${m.is_read ? "" : "unread"}">
        <div><strong>${esc(m.name || "Website visitor")}</strong><small>${esc(m.email || "")}</small><div class="message-copy">${esc((m.message || "").slice(0,160))}</div></div>
      </div>
    `).join("") || '<div class="empty-state">No enquiries yet.</div>';

    const wrap = $("#messagesList");
    if (!wrap) return;
    wrap.innerHTML = state.messages.map(m => `
      <div class="message-row ${m.is_read ? "" : "unread"}">
        <div>
          <strong>${esc(m.name || "Website visitor")}</strong>
          <a class="message-email" href="mailto:${esc(m.email || "")}">${esc(m.email || "")}</a>
          <small style="display:block;margin-top:4px">${esc(new Date(m.created_at).toLocaleString())}</small>
          <div class="message-copy">${esc(m.message || "")}</div>
        </div>
        <div class="resource-actions">
          <button class="mini-btn" data-read-message="${esc(m.id)}">${m.is_read ? '<i class="fas fa-envelope"></i> Mark unread' : '<i class="fas fa-envelope-open"></i> Mark read'}</button>
          <button class="mini-btn danger" data-delete-message="${esc(m.id)}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `).join("") || '<div class="empty-state">No messages yet.</div>';

    $$("[data-read-message]").forEach(btn => btn.onclick = () => toggleRead(btn.dataset.readMessage));
    $$("[data-delete-message]").forEach(btn => btn.onclick = () => deleteMessage(btn.dataset.deleteMessage));
  }

  async function toggleRead(id) {
    const m = state.messages.find(x => String(x.id) === String(id));
    if (!m) return;
    const { error } = await client.from("messages").update({ is_read: !m.is_read }).eq("id", id);
    if (error) return toast(error.message, "error");
    await loadMessages();
  }

  async function deleteMessage(id) {
    if (!confirm("Delete this message?")) return;
    const { error } = await client.from("messages").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    await loadMessages();
    toast("Message deleted");
  }

  async function loadReviews() {
    const { data, error } = await client.from("client_reviews").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    state.reviews = data || [];
    const pending = state.reviews.filter(review => review.status === "pending").length;
    const badge = $("#sidebarPendingReviews");
    if (badge) { badge.textContent = String(pending); badge.hidden = pending === 0; }
    renderReviews();
  }

  function renderReviews() {
    const wrap = $("#reviewsList");
    if (!wrap) return;
    const rows = state.reviewFilter === "all" ? state.reviews : state.reviews.filter(review => review.status === state.reviewFilter);
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty-state">No reviews in this category yet.</div>';
      return;
    }
    wrap.innerHTML = rows.map(review => `
      <article class="review-admin-card">
        <div class="review-admin-photo-wrap">
          ${review.image_url ? `<a href="${esc(review.image_url)}" target="_blank" rel="noopener"><img class="review-admin-photo" src="${esc(review.image_url)}" alt="Photo submitted with review by ${esc(review.name)}"></a>` : '<div class="review-admin-no-photo"><i class="fas fa-image"></i><span>No photo attached</span></div>'}
        </div>
        <div class="review-admin-body">
          <div class="review-admin-heading"><div><strong>${esc(review.name)}</strong><small>${esc(review.role || "No role or company provided")}</small></div><span class="status-pill review-status-${esc(review.status)}">${esc(review.status)}</span></div>
          <div class="review-admin-stars" aria-label="${Number(review.rating) || 5} out of 5 stars">${"★".repeat(Math.max(1,Math.min(5,Number(review.rating)||5)))}</div>
          <p>${esc(review.review)}</p>
          <small class="review-admin-date">${esc(review.created_at ? new Date(review.created_at).toLocaleString() : "")}</small>
          <div class="resource-actions review-admin-actions">
            ${review.status !== "approved" ? `<button class="mini-btn" data-review-approve="${esc(review.id)}"><i class="fas fa-check"></i> Approve</button>` : ""}
            ${review.status !== "rejected" ? `<button class="mini-btn" data-review-reject="${esc(review.id)}"><i class="fas fa-ban"></i> Reject</button>` : ""}
            <button class="mini-btn danger" data-review-delete="${esc(review.id)}"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      </article>`).join("");
    $("[data-review-approve]").forEach(btn => btn.onclick = () => updateReviewStatus(btn.dataset.reviewApprove, "approved"));
    $("[data-review-reject]").forEach(btn => btn.onclick = () => updateReviewStatus(btn.dataset.reviewReject, "rejected"));
    $("[data-review-delete]").forEach(btn => btn.onclick = () => deleteReview(btn.dataset.reviewDelete));
  }

  async function updateReviewStatus(id, status) {
    const { error } = await client.from("client_reviews").update({ status }).eq("id", id);
    if (error) return toast(error.message + " — run the review setup SQL in Supabase if moderation policies are not installed.", "error");
    await loadReviews();
    toast(status === "approved" ? "Review approved and published" : "Review rejected");
  }

  async function deleteReview(id) {
    const review = state.reviews.find(item => String(item.id) === String(id));
    if (!review || !confirm("Permanently delete this review? This cannot be undone.")) return;
    const { error } = await client.from("client_reviews").delete().eq("id", id);
    if (error) return toast(error.message + " — run the review setup SQL in Supabase if moderation policies are not installed.", "error");
    if (review.image_url) {
      try {
        const url = new URL(review.image_url);
        const marker = "/storage/v1/object/public/review-images/";
        const index = url.pathname.indexOf(marker);
        if (index >= 0) await client.storage.from("review-images").remove([decodeURIComponent(url.pathname.slice(index + marker.length))]);
      } catch (_) {}
    }
    await loadReviews();
    toast("Review deleted");
  }

  async function loadMedia() {
    const { data, error } = await client.storage.from("media").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;

    const folders = (data || []).filter(x => !x.id);
    const rootFiles = (data || []).filter(x => x.id);
    const nested = [];
    for (const folder of folders) {
      const { data: children } = await client.storage.from("media").list(folder.name, { limit:100, sortBy:{column:"created_at",order:"desc"} });
      (children || []).filter(x => x.id).forEach(file => nested.push({ ...file, fullPath: `${folder.name}/${file.name}` }));
    }
    state.media = rootFiles.map(f => ({...f, fullPath:f.name})).concat(nested);
    renderMedia();
  }

  function renderMedia() {
    const wrap = $("#mediaGrid");
    if (!wrap) return;
    if (!state.media.length) {
      wrap.innerHTML = '<div class="empty-state">No uploaded media yet.</div>';
      return;
    }
    wrap.innerHTML = state.media.map(file => {
      const { data } = client.storage.from("media").getPublicUrl(file.fullPath);
      return `
        <div class="media-card">
          <img src="${esc(data.publicUrl)}" alt="">
          <div class="media-card-body">
            <div class="media-card-name" title="${esc(file.fullPath)}">${esc(file.fullPath)}</div>
            <div class="media-card-actions">
              <button class="mini-btn" data-copy-url="${esc(data.publicUrl)}"><i class="fas fa-copy"></i></button>
              <button class="mini-btn danger" data-delete-media="${esc(file.fullPath)}"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>`;
    }).join("");

    $$("[data-copy-url]").forEach(btn => btn.onclick = async () => {
      await navigator.clipboard.writeText(btn.dataset.copyUrl);
      toast("Media URL copied");
    });
    $$("[data-delete-media]").forEach(btn => btn.onclick = () => deleteMedia(btn.dataset.deleteMedia));
  }

  async function deleteMedia(path) {
    if (!confirm("Delete this media file?")) return;
    const { error } = await client.storage.from("media").remove([path]);
    if (error) return toast(error.message, "error");
    await loadMedia();
    toast("Media deleted");
  }

  async function uploadMediaFiles(files) {
    if (!files.length) return;
    try {
      for (const file of files) await uploadFile(file, "library");
      await loadMedia();
      toast("Media uploaded");
    } catch (err) {
      toast(err.message || "Media upload failed", "error");
    }
  }

  async function refreshAll() {
    const tasks = [
      ["projects", loadProjects],
      ["profile", loadProfile],
      ["certifications", loadCertifications],
      ["messages", loadMessages],
      ["media", loadMedia],
      ["reviews", loadReviews]
    ];
    const results = await Promise.allSettled(tasks.map(([, load]) => load()));
    const failures = results
      .map((result, index) => result.status === "rejected"
        ? tasks[index][0] + ": " + (result.reason?.message || "could not load")
        : null)
      .filter(Boolean);
    if (failures.length) {
      console.error("Dashboard sections failed to load:", failures);
      toast("Some sections could not sync: " + failures.join("; "), "error");
    } else {
      toast("Dashboard synced");
    }
  }

  async function boot() {
    try {
      const session = await requireAuth();
      if (!session) return;

      $("#adminBoot").hidden = true;
      $("#adminApp").hidden = false;

      $(".admin-nav-item[data-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
      $("[data-go]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.go)));
      $("[data-action='new-project']").forEach(btn => btn.addEventListener("click", () => { showView("projects"); openProject(); }));
      $("[data-close-dialog]").forEach(btn => btn.addEventListener("click", () => document.getElementById(btn.dataset.closeDialog).close()));

      $("#projectForm").addEventListener("submit", saveProject);
      $("#profileForm").addEventListener("submit", saveProfile);
      $("#certForm").addEventListener("submit", saveCertification);
      $("#newCertificationBtn").addEventListener("click", () => openCertification());
      $("#mediaUpload").addEventListener("change", e => uploadMediaFiles([...e.target.files]));
      $("#refreshReviewsBtn")?.addEventListener("click", loadReviews);
      $("[data-review-filter]").forEach(btn => btn.addEventListener("click", () => {
        state.reviewFilter = btn.dataset.reviewFilter;
        $("[data-review-filter]").forEach(filter => filter.classList.toggle("active", filter === btn));
        renderReviews();
      }));
      $("#refreshBtn").addEventListener("click", refreshAll);
      $("#signOutBtn").addEventListener("click", async () => {
        const button = $("#signOutBtn");
        button.disabled = true;
        try {
          const { error } = await client.auth.signOut({ scope: "local" });
          if (error) throw error;
        } catch (err) {
          console.error("Local sign-out failed:", err);
          toast("Could not fully clear the session. Redirecting to sign in.", "error");
        } finally {
          location.replace("/admin/login");
        }
      });

      const requestedView = location.pathname.split("/").filter(Boolean)[1] || "overview";
      if (["overview","projects","profile","certifications","inbox","reviews","media"].includes(requestedView)) showView(requestedView);
      await refreshAll();
    } catch (err) {
      console.error("Dashboard startup failed:", err);
      const boot = $("#adminBoot");
      if (boot) {
        boot.hidden = false;
        boot.innerHTML = '<span>Dashboard could not start. Please refresh or sign in again.</span>';
      }
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
