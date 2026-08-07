"use server";
import { revalidatePath } from "next/cache";
import { requireTeamAccess } from "@/lib/planning/access";
import { TEAM_IMAGE_BUCKET } from "@/lib/storage/team-images";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types/forms";
const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
export async function uploadTeamAsset(teamId:string,kind:"logo"|"banner",_state:FormState,formData:FormData):Promise<FormState>{
  await requireTeamAccess(teamId,true); const file=formData.get("file");
  if(!(file instanceof File)||file.size===0)return{status:"error",message:"Choose an image to upload."};
  if(!allowed.has(file.type))return{status:"error",message:"Use a PNG, JPEG or WEBP image."};
  const limit=kind==="logo"?2*1024*1024:5*1024*1024;
  if(file.size>limit)return{status:"error",message:`${kind==="logo"?"Logo":"Banner"} must be ${kind==="logo"?"2":"5"} MB or smaller.`};
  const extension=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg"; const path=`teams/${teamId}/${kind}/${crypto.randomUUID()}.${extension}`; const supabase=await createClient(); const column=kind==="logo"?"logo_url":"banner_url";
  const{data:team}=await supabase.from("teams").select("logo_url,banner_url").eq("id",teamId).maybeSingle(); const oldPath=team?.[column];
  const{error:uploadError}=await supabase.storage.from(TEAM_IMAGE_BUCKET).upload(path,file,{contentType:file.type,upsert:false}); if(uploadError)return{status:"error",message:uploadError.message};
  const update=kind==="logo"?{logo_url:path}:{banner_url:path}; const{error:updateError}=await supabase.from("teams").update(update).eq("id",teamId);
  if(updateError){await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([path]);return{status:"error",message:"The image uploaded but the team record could not be updated."}}
  if(oldPath)await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([oldPath]); revalidatePath(`/teams/${teamId}`); revalidatePath("/dashboard"); return{status:"success",message:`${kind==="logo"?"Logo":"Banner"} updated.`};
}
