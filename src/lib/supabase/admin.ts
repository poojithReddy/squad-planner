import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createAdminClient(){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
