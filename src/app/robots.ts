import type { MetadataRoute } from "next";
import { applicationOrigin } from "@/lib/auth/origin";
export default function robots():MetadataRoute.Robots { const origin=applicationOrigin(); return { rules:{userAgent:"*",allow:["/","/features","/about"],disallow:["/dashboard","/teams/","/profile","/dev/","/auth/"]}, sitemap:`${origin}/sitemap.xml`, host:origin }; }
