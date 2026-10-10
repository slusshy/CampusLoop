import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !anonKey || !serviceKey) {
  throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be configured.");
}

export const serviceClient: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function requireUser(request: Request): Promise<User> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication is required.");
  }

  const token = authorization.slice("Bearer ".length);
  const authClient = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Your session is invalid or expired. Please sign in again.");
  }
  return data.user;
}

export async function requireRole(userId: string, allowedRoles: string[]): Promise<void> {
  const { data, error } = await serviceClient.from("profiles").select("role").eq("id", userId).single();
  if (error) throw new Error("Unable to verify your account permissions.");
  if (!data || !allowedRoles.includes(data.role)) throw new Error("You are not authorized to perform this action.");
}
