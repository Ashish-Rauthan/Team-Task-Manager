const { createClient } = require('@supabase/supabase-js');

// ── Anon client ───────────────────────────────────────────────────────────────
// Used for auth operations (signUp, signIn). Respects RLS.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Service-role client ───────────────────────────────────────────────────────
// Bypasses RLS — use ONLY for trusted server-side operations
// (e.g. reading all profiles for an admin endpoint).
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ── User-scoped client factory ────────────────────────────────────────────────
// Creates a client that acts as the authenticated user — RLS is enforced.
const supabaseAs = (accessToken) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

module.exports = { supabase, supabaseAdmin, supabaseAs };
