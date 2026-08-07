import type { MetadataRoute } from "next";
import { applicationOrigin } from "@/lib/auth/origin";
export default function sitemap():MetadataRoute.Sitemap { const origin=applicationOrigin(); return [{url:origin,changeFrequency:"monthly",priority:1},{url:`${origin}/features`,changeFrequency:"monthly",priority:.8},{url:`${origin}/about`,changeFrequency:"yearly",priority:.6}]; }
