import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getSuperAdminAccess(){
  const user=await requireUser();
  const supabase=await createClient();
  const{data}=await supabase.from("platform_roles").select("role").eq("user_id",user.id).eq("role","super_admin").maybeSingle();
  return{user,supabase,isSuperAdmin:data?.role==="super_admin"};
}

export async function requireSuperAdmin(){
  const access=await getSuperAdminAccess();
  if(!access.isSuperAdmin)notFound();
  return access;
}
