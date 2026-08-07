"use server";

import { revalidatePath } from "next/cache";
import { requireTeamAccess } from "@/lib/planning/access";
import { buildTeamImagePath, TEAM_IMAGE_BUCKET, type TeamImageKind, validateTeamImage } from "@/lib/storage/team-images";
import { createClient } from "@/lib/supabase/server";

const BRANDING_ROLES = new Set(["owner", "captain"]);
type UploadPreparation={ok:true;path:string}|{ok:false;message:string};
type UploadCompletion={ok:true;message:string}|{ok:false;message:string};

async function requireBrandingAccess(teamId:string){const access=await requireTeamAccess(teamId);return BRANDING_ROLES.has(access.role)}

export async function prepareTeamAssetUpload(teamId:string,kind:TeamImageKind,file:{size:number;type:string}):Promise<UploadPreparation>{
  if(!await requireBrandingAccess(teamId))return{ok:false,message:"Only the team owner or captain can update team branding."};
  const validationError=validateTeamImage(kind,file);
  if(validationError)return{ok:false,message:validationError};
  return{ok:true,path:buildTeamImagePath(teamId,kind,file.type)};
}

export async function completeTeamAssetUpload(teamId:string,kind:TeamImageKind,path:string):Promise<UploadCompletion>{
  if(!await requireBrandingAccess(teamId))return{ok:false,message:"Only the team owner or captain can update team branding."};
  const prefix=`teams/${teamId}/${kind}/`;
  const filename=path.slice(prefix.length);
  if(!path.startsWith(prefix)||!new RegExp(`^${kind}-[0-9]+-[a-zA-Z0-9-]+\\.(png|jpg|webp)$`).test(filename))return{ok:false,message:"The uploaded image path is invalid."};

  const supabase=await createClient();
  const {data:objects,error:listError}=await supabase.storage.from(TEAM_IMAGE_BUCKET).list(prefix.replace(/\/$/,""),{search:filename,limit:10});
  if(listError||!objects?.some(object=>object.name===filename))return{ok:false,message:`We couldn't verify the uploaded ${kind}. Please try again.`};

  const column=kind==="logo"?"logo_url":"banner_url";
  const {data:team,error:teamError}=await supabase.from("teams").select("logo_url,banner_url").eq("id",teamId).maybeSingle();
  if(teamError||!team)return{ok:false,message:"We couldn't verify this team. Please refresh and try again."};
  const oldPath=team[column];
  const update=kind==="logo"?{logo_url:path}:{banner_url:path};
  const {data:updated,error:updateError}=await supabase.from("teams").update(update).eq("id",teamId).select("id").maybeSingle();
  if(updateError||!updated){await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([path]);return{ok:false,message:`The ${kind} uploaded, but we couldn't save it to your team. Please try again.`}}

  if(oldPath&&oldPath!==path)await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([oldPath]);
  revalidatePath(`/teams/${teamId}`,"layout");
  revalidatePath("/dashboard");
  return{ok:true,message:`Team ${kind} updated successfully`};
}
