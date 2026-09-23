(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const client = window.getCreativeHaiderSupabase && window.getCreativeHaiderSupabase();

  const state = {
    projects: [],
    certifications: [],
    messages: [],
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
      certifications:"Certifications", inbox:"Inbox", media:"Media"
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
    const fd = new FormData(form);
    const id = String(fd.get("id") || "");
    let imageUrl = String(fd.get("image_url") || "").trim();
    const file = $("#projectImageFile").files[0];

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

      const q = id ? client.from("projects").update(payload).eq("id", id) : client.from("projects").insert(payload);
      const { error } = await q;
      if (error) throw error;
      $("#projectDialog").close();
      await loadProjects();
      toast(id ? "Project updated" : "Project added");
    } catch (err) {
      toast(err.message || "Could not save project", "error");
    }
  }

  async function loadProfile() {
    const { data, error } = await client.from("profiles").select("*").limit(1).maybeSingle();
    if (error) throw error;
    state.profile = data || null;
    const form = $("#profileForm");
    if (!form) return;
    ["name","role_title","bio","email","phone","whatsapp","linkedin_url","avatar_url"].forEach(k => {
      if (form.elements[k]) form.elements[k].value = state.profile?.[k] || "";
    });
  }

  async function saveProfile(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      let avatar = String(fd.get("avatar_url") || "").trim();
      const file = $("#profileAvatarFile").files[0];
      if (file) avatar = await uploadFile(file, "profile");
      const payload = {
        name:String(fd.get("name")||"").trim(),
        role_title:String(fd.get("role_title")||"").trim(),
        bio:String(fd.get("bio")||"").trim(),
        email:String(fd.get("email")||"").trim(),
        phone:String(fd.get("phone")||"").trim(),
        whatsapp:String(fd.get("whatsapp")||"").trim(),
        linkedin_url:String(fd.get("linkedin_url")||"").trim(),
        avatar_url:avatar || null,
        updated_at:new Date().toISOString()
      };
      let result;
      if (state.profile?.id) result = await client.from("profiles").update(payload).eq("id", state.profile.id);
      else result = await client.from("profiles").insert(payload);
      if (result.error) throw result.error;
      await loadProfile();
      toast("Profile saved");
    } catch (err) {
      toast(err.message || "Could not save profile", "error");
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
    try {
      await Promise.all([loadProjects(), loadProfile(), loadCertifications(), loadMessages(), loadMedia()]);
    } catch (err) {
      toast(err.message || "Could not load dashboard data", "error");
    }
  }

  async function boot() {
    const session = await requireAuth();
    if (!session) return;

    $("#adminBoot").hidden = true;
    $("#adminApp").hidden = false;

    $$(".admin-nav-item[data-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
    $$("[data-go]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.go)));
    $$("[data-action='new-project']").forEach(btn => btn.addEventListener("click", () => { showView("projects"); openProject(); }));
    $$("[data-close-dialog]").forEach(btn => btn.addEventListener("click", () => document.getElementById(btn.dataset.closeDialog).close()));

    $("#projectForm").addEventListener("submit", saveProject);
    $("#profileForm").addEventListener("submit", saveProfile);
    $("#certForm").addEventListener("submit", saveCertification);
    $("#newCertificationBtn").addEventListener("click", () => openCertification());
    $("#mediaUpload").addEventListener("change", e => uploadMediaFiles([...e.target.files]));
    $("#refreshBtn").addEventListener("click", refreshAll);
    $("#signOutBtn").addEventListener("click", async () => {
      await client.auth.signOut();
      location.replace("/admin/login");
    });

    await refreshAll();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
