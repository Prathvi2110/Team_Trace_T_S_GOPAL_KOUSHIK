
import "server-only";

import { createSupabaseServerClient } from "./supabase-server";

export async function isAdmin(): Promise<boolean> {
  const rawAdminIds = process.env.ADMIN_USER_IDS ?? "";

  const adminIds = rawAdminIds
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (adminIds.length === 0) {
    console.error("Admin check: ADMIN_USER_IDS is not configured.");
    return false;
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Admin check: no verified user session.");
    return false;
  }

  const authorized = adminIds.includes(user.id);

  console.log("Admin check:", {
    authenticated: true,
    authorized,
  });

  return authorized;
}
