"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeTeamAssetUpload, prepareTeamAssetUpload } from "@/app/(protected)/teams/[teamId]/assets/actions";
import { FormMessage } from "@/components/forms/form-message";
import { TEAM_IMAGE_BUCKET, TEAM_IMAGE_RULES, type TeamImageKind, validateTeamImage } from "@/lib/storage/team-images";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/types/forms";

export function TeamAssetForm({teamId,kind,currentUrl}:{teamId:string;kind:TeamImageKind;currentUrl:string|null}){
  const router=useRouter();
  const [message,setMessage]=useState<FormState>({status:"idle",message:""});
  const [preview,setPreview]=useState<string|null>(null);
  const [pending,setPending]=useState(false);
  const formRef=useRef<HTMLFormElement>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const isLogo=kind==="logo";
  const rules=TEAM_IMAGE_RULES[kind];

  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  function clearSelection(){if(preview)URL.revokeObjectURL(preview);setPreview(null);formRef.current?.reset()}
  function choose(file?:File){if(preview)URL.revokeObjectURL(preview);setPreview(null);setMessage({status:"idle",message:""});if(!file)return;const error=validateTeamImage(kind,file);if(error){setMessage({status:"error",message:error});return}setPreview(URL.createObjectURL(file))}
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(pending)return;
    const file=fileRef.current?.files?.[0];if(!file){setMessage({status:"error",message:"Choose an image to upload."});return}
    const validationError=validateTeamImage(kind,file);if(validationError){setMessage({status:"error",message:validationError});return}
    setPending(true);setMessage({status:"idle",message:""});
    try{
      const prepared=await prepareTeamAssetUpload(teamId,kind,{size:file.size,type:file.type});
      if(!prepared.ok){setMessage({status:"error",message:prepared.message});return}
      const supabase=createClient();
      const {error:uploadError}=await supabase.storage.from(TEAM_IMAGE_BUCKET).upload(prepared.path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
      if(uploadError){setMessage({status:"error",message:`We couldn't upload the team ${kind}. Please check the file and try again.`});return}
      const completed=await completeTeamAssetUpload(teamId,kind,prepared.path);
      if(!completed.ok){await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([prepared.path]);setMessage({status:"error",message:completed.message});return}
      clearSelection();setMessage({status:"success",message:completed.message});router.refresh();
    }catch{setMessage({status:"error",message:`We couldn't update the team ${kind}. Please try again.`})}finally{setPending(false)}
  }

  const shownImage=preview??currentUrl;
  return <form ref={formRef} onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{isLogo?"Team logo":"Team banner"}</h3><p className="mt-1 text-sm leading-6 text-slate-500">PNG, JPEG or WEBP · max {isLogo?"2":"5"} MB · prefer {isLogo?"square":"landscape"}</p></div>{currentUrl?<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Current</span>:null}</div>
    {shownImage?<Image src={shownImage} unoptimized width={isLogo?240:960} height={isLogo?240:320} alt={`${preview?"New ":"Current "}team ${kind} preview`} className={`mt-4 w-full rounded-xl border bg-slate-50 object-cover ${isLogo?"aspect-square max-w-44":"aspect-[3/1]"}`}/>:<div className={`mt-4 grid place-items-center rounded-xl border border-dashed bg-slate-50 text-sm text-slate-500 ${isLogo?"aspect-square max-w-44":"aspect-[3/1]"}`}>No {kind} uploaded</div>}
    <label className="mt-4 block text-sm font-bold text-slate-700">Choose {kind}<input ref={fileRef} name="file" type="file" required disabled={pending} accept={rules.acceptedMimeTypes.join(",")} onChange={event=>choose(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-pitch/10 file:px-3 file:py-2 file:font-bold file:text-pitch"/></label>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="submit" disabled={pending||!preview} className="min-h-12 flex-1 rounded-xl bg-pitch px-5 text-sm font-bold text-white hover:bg-pitch-dark disabled:cursor-not-allowed disabled:opacity-50">{pending?`Uploading ${kind}…`:currentUrl?`Replace ${isLogo?"Logo":"Banner"}`:`Upload ${isLogo?"Logo":"Banner"}`}</button>{preview?<button type="button" disabled={pending} onClick={clearSelection} className="min-h-12 rounded-xl border px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>:null}</div>
    <div className="mt-3"><FormMessage state={message}/></div>
  </form>;
}
