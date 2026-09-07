/**
 * Browser talks to https://supabase.tudonghoa.me → storageKey = sb-supabase-auth-token.
 * Server may use http://supabase-envoy:8000 → would become sb-supabase-envoy-auth-token
 * and miss the session cookie. Pin the name to the public host always.
 */
export const AUTH_COOKIE_NAME = "sb-supabase-auth-token";
