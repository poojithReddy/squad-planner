"use server";
import {createClient} from "@/lib/supabase/server";
export type PublicRegistrationState={ok?:boolean;message:string};
export async function submitRegistration(token:string,fieldKeys:string[],_state:PublicRegistrationState,data:FormData):Promise<PublicRegistrationState>{
 const answers=Object.fromEntries(fieldKeys.map(key=>[key,String(data.get(key)??"").trim()]));const supabase=await createClient();const{error}=await supabase.rpc("submit_public_registration",{p_token:token,p_answers:answers});
 if(error){if(error.message.includes("DUPLICATE_REGISTRATION"))return{message:"A registration using this email already exists."};if(error.message.includes("REGISTRATION_CLOSED"))return{message:"Registration is closed."};return{message:"We couldn't save your registration. Please check the required fields and try again."}}return{ok:true,message:"Thanks — your tournament registration has been saved."};
}
