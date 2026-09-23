// Creative Haider Supabase configuration.
// This file is updated after the dedicated portfolio Supabase project is created.
window.CREATIVE_HAIDER_SUPABASE = {
  url: "",
  anonKey: ""
};

window.getCreativeHaiderSupabase = function () {
  const cfg = window.CREATIVE_HAIDER_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) return null;
  if (!window.__creativeHaiderSupabaseClient) {
    window.__creativeHaiderSupabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return window.__creativeHaiderSupabaseClient;
};
