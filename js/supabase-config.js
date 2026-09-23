// Creative Haider Supabase configuration.
// Public client configuration only. Never place a service-role key in this file.
window.CREATIVE_HAIDER_SUPABASE = {
  url: "https://vcmplwexzivzjhnvmrvm.supabase.co",
  anonKey: "sb_publishable_okUCs-NxAaQ50kAJZy8Opg_DZIfCP-I"
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
